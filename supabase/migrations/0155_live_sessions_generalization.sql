-- Chantier Live Streaming DIVARC — Étape 1 : Généralisation circle_live_rooms
-- =============================================================================
--
-- DIVARC avait déjà `circle_live_rooms` (migration 0135) pour les lives audio/
-- vidéo attachés à un cercle. Pour atteindre le niveau Twitch/Instagram Live,
-- on généralise :
--
--   - circle_id devient NULLABLE (live publics ou friends_only)
--   - Nouveaux champs visibilité, monétisation, modération, engagement,
--     replay, simulcast
--   - RLS étendu : public/unlisted/friends_only/subscribers_only/circle/private
--
-- IDEMPOTENT. Pas de breaking change pour les lives cercle existants
-- (circle_id reste valide quand fourni, le code Sprint E continue de
-- fonctionner).

BEGIN;

-- ============================================================
-- 1. circle_id devient nullable (lives publics)
-- ============================================================

ALTER TABLE public.circle_live_rooms
  ALTER COLUMN circle_id DROP NOT NULL;

-- ============================================================
-- 2. Visibilité, catégorie, tags, langue
-- ============================================================

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'circle'
    CHECK (visibility IN (
      'public', 'unlisted', 'friends_only', 'circle',
      'subscribers_only', 'private'
    ));

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS category text
    CHECK (category IS NULL OR category IN (
      'just_chatting', 'gaming', 'music', 'art', 'cooking', 'sports',
      'education', 'news', 'tech', 'business', 'lifestyle', 'beauty',
      'fashion', 'travel', 'fitness', 'asmr', 'podcast', 'interview',
      'event', 'q_and_a'
    ));

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr';

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS age_restriction text
    CHECK (age_restriction IS NULL OR age_restriction IN ('13+', '16+', '18+'));

-- ============================================================
-- 3. Chat configuration & modération
-- ============================================================

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS chat_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS chat_followers_only boolean NOT NULL DEFAULT false;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS chat_subscribers_only boolean NOT NULL DEFAULT false;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS chat_slow_mode_seconds integer NOT NULL DEFAULT 0
    CHECK (chat_slow_mode_seconds BETWEEN 0 AND 600);

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS chat_emote_only boolean NOT NULL DEFAULT false;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS auto_mod_level text NOT NULL DEFAULT 'medium'
    CHECK (auto_mod_level IN ('off', 'low', 'medium', 'high', 'strict'));

-- ============================================================
-- 4. Monétisation
-- ============================================================

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS is_super_chat_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS is_virtual_gifts_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS is_tips_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS is_subscribers_only_stream boolean NOT NULL DEFAULT false;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS revenue_total_cents integer NOT NULL DEFAULT 0;

-- ============================================================
-- 5. Engagement counters
-- ============================================================

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS viewers_unique_total integer NOT NULL DEFAULT 0;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS chat_messages_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS reactions_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS follows_gained integer NOT NULL DEFAULT 0;

-- ============================================================
-- 6. VOD & Replay
-- ============================================================

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS vod_thumbnail_url text;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS vod_duration_seconds integer;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS transcript_url text;

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS is_recording boolean NOT NULL DEFAULT true;

-- ============================================================
-- 7. Description (le brief le veut, manque actuellement)
-- ============================================================

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS description text
    CHECK (description IS NULL OR char_length(description) <= 2000);

-- ============================================================
-- 8. Simulcast (V2 ready)
-- ============================================================

ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS simulcast_destinations jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ============================================================
-- 9. Index pour découverte feed
-- ============================================================

CREATE INDEX IF NOT EXISTS clr_status_visibility_idx
  ON public.circle_live_rooms (status, visibility, started_at DESC)
  WHERE deleted_at IS NULL AND status = 'live';

CREATE INDEX IF NOT EXISTS clr_category_status_idx
  ON public.circle_live_rooms (category, status)
  WHERE deleted_at IS NULL AND status = 'live';

CREATE INDEX IF NOT EXISTS clr_host_recent_idx
  ON public.circle_live_rooms (host_id, started_at DESC)
  WHERE deleted_at IS NULL;

-- ============================================================
-- 10. RLS étendu : visibility public/unlisted/friends_only/subscribers_only
-- ============================================================
--
-- On garde la policy existante is_circle_active_member pour visibility=
-- 'circle' (rétro-compat). On ajoute des policies plus permissives pour
-- les nouvelles visibilités publiques.

DROP POLICY IF EXISTS clr_select_public ON public.circle_live_rooms;
CREATE POLICY clr_select_public
  ON public.circle_live_rooms FOR SELECT
  USING (
    deleted_at IS NULL AND visibility IN ('public', 'unlisted')
  );

DROP POLICY IF EXISTS clr_select_friends ON public.circle_live_rooms;
CREATE POLICY clr_select_friends
  ON public.circle_live_rooms FOR SELECT
  USING (
    deleted_at IS NULL
    AND visibility = 'friends_only'
    AND (
      host_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.friendships f
         WHERE f.status = 'accepted'
           AND ((f.requester_id = auth.uid() AND f.recipient_id = host_id)
             OR (f.recipient_id = auth.uid() AND f.requester_id = host_id))
      )
    )
  );

DROP POLICY IF EXISTS clr_select_owner ON public.circle_live_rooms;
CREATE POLICY clr_select_owner
  ON public.circle_live_rooms FOR SELECT
  USING (host_id = auth.uid());

-- ============================================================
-- 11. RPC list_live_now : feed home "En direct maintenant"
-- ============================================================

CREATE OR REPLACE FUNCTION public.list_live_now(
  p_user_id UUID,
  p_limit integer DEFAULT 20,
  p_category text DEFAULT NULL,
  p_language text DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  host_id UUID,
  circle_id UUID,
  title text,
  description text,
  kind text,
  category text,
  tags text[],
  language text,
  thumbnail_url text,
  visibility text,
  status text,
  started_at TIMESTAMPTZ,
  participants_count integer,
  peak_participants integer,
  viewers_unique_total integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    r.id, r.host_id, r.circle_id, r.title, r.description, r.kind, r.category,
    r.tags, r.language, r.thumbnail_url, r.visibility, r.status, r.started_at,
    r.participants_count, r.peak_participants, r.viewers_unique_total
  FROM public.circle_live_rooms r
  WHERE r.deleted_at IS NULL
    AND r.status = 'live'
    /* RLS s'applique automatiquement : seul ce que l'user peut voir
       remontera. */
    AND (p_category IS NULL OR r.category = p_category)
    AND (p_language IS NULL OR r.language = p_language)
  ORDER BY r.participants_count DESC, r.started_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.list_live_now(UUID, integer, text, text)
  TO authenticated;

COMMIT;
