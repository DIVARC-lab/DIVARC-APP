-- Chantier Cercles v4 — Sprint A étape A.1 : Bots & Automation
-- =============================================================
--
-- Foundation pour le système de bots dans les cercles. 6 bot types
-- V1 (welcome, moderation, event, reminder, digest, ai_assistant)
-- avec un modèle trigger/action extensible.
--
-- Architecture :
--   circle_bots             : registre des bots installés
--   circle_bot_triggers     : conditions de déclenchement (event ou cron)
--   circle_bot_actions      : actions exécutées (post, dm, tag, etc.)
--   circle_bot_executions   : journal pour stats + debug
--
-- Le runtime (Sprint A.2) consommera ces tables : un cron Supabase
-- scanne les triggers récurrents, et des triggers DB (INSERT
-- circle_members, posts, etc.) appellent une Server Action qui
-- exécute les actions.

BEGIN;

-- ============================================================
-- 1. Enum bot types (extensible)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'circle_bot_type') THEN
    CREATE TYPE public.circle_bot_type AS ENUM (
      'welcome',
      'moderation',
      'event',
      'reminder',
      'digest',
      'ai_assistant'
    );
  END IF;
END $$;

-- ============================================================
-- 2. circle_bots — registre des bots installés
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  bot_type public.circle_bot_type NOT NULL,
  /* Nom affiché (customisable par l'admin, ex: "BienvenueBot Tech FR"). */
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  /* Avatar : URL ou emoji. */
  avatar_url text,
  description text CHECK (description IS NULL OR char_length(description) <= 500),
  /* Config par bot (template message, regex, schedule, etc.).
     Forme jsonb libre pour flexibilité — chaque bot type a sa
     structure (validée côté Server Action via Zod). */
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  /* Activable / désactivable sans suppression. */
  is_active boolean NOT NULL DEFAULT true,
  /* Compteurs dénormalisés pour la liste admin sans JOIN. */
  actions_executed_count integer NOT NULL DEFAULT 0,
  last_action_at TIMESTAMPTZ,
  /* Qui a créé le bot (toujours owner/admin du cercle). */
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS circle_bots_circle_active_idx
  ON public.circle_bots (circle_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS circle_bots_type_idx
  ON public.circle_bots (bot_type)
  WHERE deleted_at IS NULL AND is_active = true;

-- ============================================================
-- 3. circle_bot_triggers — conditions de déclenchement
-- ============================================================
-- Un bot peut avoir N triggers. Types courants :
--   event-based  : trigger_event (ex: 'member_joined', 'post_created')
--   cron-based   : trigger_schedule (cron expression PostgreSQL)
--
-- Les conditions affinent le déclenchement (ex: keyword dans body,
-- author has role, channel id, etc.).

CREATE TABLE IF NOT EXISTS public.circle_bot_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.circle_bots(id) ON DELETE CASCADE,
  trigger_kind text NOT NULL CHECK (trigger_kind IN ('event', 'schedule')),
  /* Pour kind='event' : 'member_joined', 'member_left', 'post_created',
     'chat_message', 'event_created', 'event_starting_soon', etc. */
  trigger_event text,
  /* Pour kind='schedule' : cron expression (UTC). Ex: '0 18 * * 1'
     pour chaque lundi 18h UTC. */
  trigger_schedule text,
  /* Conditions additionnelles (jsonb pour flexibilité). Ex:
     { "keyword": "spam", "min_urls": 3, "author_role": "member" } */
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  /* Au moins l'un des deux doit être défini. */
  CHECK (
    (trigger_kind = 'event' AND trigger_event IS NOT NULL)
    OR (trigger_kind = 'schedule' AND trigger_schedule IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS circle_bot_triggers_bot_idx
  ON public.circle_bot_triggers (bot_id, is_active);

CREATE INDEX IF NOT EXISTS circle_bot_triggers_event_idx
  ON public.circle_bot_triggers (trigger_event)
  WHERE is_active = true AND trigger_kind = 'event';

-- ============================================================
-- 4. circle_bot_actions — actions exécutées par un bot
-- ============================================================
-- Action types :
--   'post_chat_message'   : post dans le chat du cercle
--   'send_dm'             : message direct à l'user (welcome bot)
--   'add_tag'             : tag/flair à appliquer
--   'hide_content'        : cache un post/comment (moderation)
--   'flag_for_review'     : signale aux modérateurs humains
--   'create_post'         : nouveau post (digest, reminder)
--   'mention_role'        : mention @admin/@mod
--   'webhook'             : appel HTTP outbound (V2)

CREATE TABLE IF NOT EXISTS public.circle_bot_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.circle_bots(id) ON DELETE CASCADE,
  action_kind text NOT NULL CHECK (action_kind IN (
    'post_chat_message',
    'send_dm',
    'add_tag',
    'hide_content',
    'flag_for_review',
    'create_post',
    'mention_role',
    'webhook'
  )),
  /* Position dans la séquence d'actions (un bot peut exécuter
     plusieurs actions en série). */
  position integer NOT NULL DEFAULT 0,
  /* Paramètres : ex { "template": "Bienvenue {{name}} !",
     "channel": "general", "delay_seconds": 5 }. */
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS circle_bot_actions_bot_idx
  ON public.circle_bot_actions (bot_id, position)
  WHERE is_active = true;

-- ============================================================
-- 5. circle_bot_executions — journal d'exécutions (audit + stats)
-- ============================================================
-- Garde N derniers exec par bot (rétention 30j via cron cleanup).
-- Permet :
--   - Stats : success rate, count par jour
--   - Debug : voir pourquoi un bot a échoué
--   - Anti-abus : détection bot mal configuré qui spam

CREATE TABLE IF NOT EXISTS public.circle_bot_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.circle_bots(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES public.circle_bot_triggers(id) ON DELETE SET NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  /* Données de contexte (ex: post_id, user_id qui a joint, etc.). */
  context jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  /* Output ou error message. */
  output text,
  duration_ms integer
);

CREATE INDEX IF NOT EXISTS circle_bot_executions_bot_time_idx
  ON public.circle_bot_executions (bot_id, triggered_at DESC);

CREATE INDEX IF NOT EXISTS circle_bot_executions_status_idx
  ON public.circle_bot_executions (status, triggered_at DESC);

-- ============================================================
-- 6. RLS
-- ============================================================

ALTER TABLE public.circle_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_bot_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_bot_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_bot_executions ENABLE ROW LEVEL SECURITY;

/* circle_bots : SELECT membres actifs (transparence — tous voient
   les bots du cercle). INSERT/UPDATE/DELETE : owner/admin only. */

DROP POLICY IF EXISTS circle_bots_select_member ON public.circle_bots;
CREATE POLICY circle_bots_select_member
  ON public.circle_bots FOR SELECT
  USING (
    deleted_at IS NULL AND public.is_circle_active_member(circle_id)
  );

DROP POLICY IF EXISTS circle_bots_insert_admin ON public.circle_bots;
CREATE POLICY circle_bots_insert_admin
  ON public.circle_bots FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_circle_admin(circle_id)
  );

DROP POLICY IF EXISTS circle_bots_update_admin ON public.circle_bots;
CREATE POLICY circle_bots_update_admin
  ON public.circle_bots FOR UPDATE
  USING (public.is_circle_admin(circle_id))
  WITH CHECK (public.is_circle_admin(circle_id));

DROP POLICY IF EXISTS circle_bots_delete_admin ON public.circle_bots;
CREATE POLICY circle_bots_delete_admin
  ON public.circle_bots FOR DELETE
  USING (public.is_circle_admin(circle_id));

/* Triggers et actions : SELECT membres actifs (transparence),
   INSERT/UPDATE/DELETE : owner/admin du cercle parent. */

DROP POLICY IF EXISTS circle_bot_triggers_select ON public.circle_bot_triggers;
CREATE POLICY circle_bot_triggers_select
  ON public.circle_bot_triggers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_bots b
      WHERE b.id = circle_bot_triggers.bot_id
        AND public.is_circle_active_member(b.circle_id)
    )
  );

DROP POLICY IF EXISTS circle_bot_triggers_admin ON public.circle_bot_triggers;
CREATE POLICY circle_bot_triggers_admin
  ON public.circle_bot_triggers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_bots b
      WHERE b.id = circle_bot_triggers.bot_id
        AND public.is_circle_admin(b.circle_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circle_bots b
      WHERE b.id = circle_bot_triggers.bot_id
        AND public.is_circle_admin(b.circle_id)
    )
  );

DROP POLICY IF EXISTS circle_bot_actions_select ON public.circle_bot_actions;
CREATE POLICY circle_bot_actions_select
  ON public.circle_bot_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_bots b
      WHERE b.id = circle_bot_actions.bot_id
        AND public.is_circle_active_member(b.circle_id)
    )
  );

DROP POLICY IF EXISTS circle_bot_actions_admin ON public.circle_bot_actions;
CREATE POLICY circle_bot_actions_admin
  ON public.circle_bot_actions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_bots b
      WHERE b.id = circle_bot_actions.bot_id
        AND public.is_circle_admin(b.circle_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circle_bots b
      WHERE b.id = circle_bot_actions.bot_id
        AND public.is_circle_admin(b.circle_id)
    )
  );

/* Executions : SELECT admin uniquement (audit). INSERT par le runtime
   bot (Server Action SECURITY DEFINER → bypass RLS). */

DROP POLICY IF EXISTS circle_bot_executions_select_admin ON public.circle_bot_executions;
CREATE POLICY circle_bot_executions_select_admin
  ON public.circle_bot_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_bots b
      WHERE b.id = circle_bot_executions.bot_id
        AND public.is_circle_admin(b.circle_id)
    )
  );

-- ============================================================
-- 7. Trigger : maintenance compteurs sur exécution
-- ============================================================

CREATE OR REPLACE FUNCTION public.tg_sync_bot_exec_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'success' THEN
    UPDATE public.circle_bots
       SET actions_executed_count = actions_executed_count + 1,
           last_action_at = NEW.triggered_at,
           updated_at = now()
     WHERE id = NEW.bot_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tg_sync_bot_exec_counters_trg ON public.circle_bot_executions;
CREATE TRIGGER tg_sync_bot_exec_counters_trg
  AFTER INSERT ON public.circle_bot_executions
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_bot_exec_counters();

-- ============================================================
-- 8. Activer module 'bots' sur tous les cercles existants
-- ============================================================

UPDATE public.circles
SET modules = COALESCE(modules, '{}'::jsonb) || '{"bots": true}'::jsonb
WHERE NOT (modules ? 'bots');

-- ============================================================
-- 9. Helper RPC : list_circle_bots
-- ============================================================

CREATE OR REPLACE FUNCTION public.list_circle_bots(p_circle_id UUID)
RETURNS TABLE (
  id UUID,
  bot_type public.circle_bot_type,
  name text,
  avatar_url text,
  description text,
  is_active boolean,
  actions_executed_count int,
  last_action_at TIMESTAMPTZ,
  config jsonb,
  triggers_count int,
  actions_count int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.bot_type,
    b.name,
    b.avatar_url,
    b.description,
    b.is_active,
    b.actions_executed_count,
    b.last_action_at,
    b.config,
    (SELECT COUNT(*)::int FROM public.circle_bot_triggers t
      WHERE t.bot_id = b.id AND t.is_active = true) AS triggers_count,
    (SELECT COUNT(*)::int FROM public.circle_bot_actions a
      WHERE a.bot_id = b.id AND a.is_active = true) AS actions_count
  FROM public.circle_bots b
  WHERE b.circle_id = p_circle_id
    AND b.deleted_at IS NULL
  ORDER BY b.is_active DESC, b.bot_type, b.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_circle_bots(UUID) TO authenticated;

COMMIT;
