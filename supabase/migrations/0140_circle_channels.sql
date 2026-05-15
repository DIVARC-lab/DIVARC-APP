-- Chantier Cercles v4 — Sprint B étape B.1 : Multi-channels Discord-style
-- =======================================================================
--
-- Permet aux cercles d'avoir plusieurs channels thématiques (au lieu
-- d'un seul feed mélangé). Killer feature pour scaler >500 membres
-- sans bruit.
--
-- Architecture :
--   circle_channels       : registre des channels d'un cercle
--   posts.channel_id      : FK ajoutée (nullable pour back-compat)
--   circle_chat_messages.channel_id : idem
--
-- Migration data : créer un channel "Général" par défaut pour chaque
-- cercle existant + assigner tous les posts existants à ce channel.

BEGIN;

-- ============================================================
-- 1. Table circle_channels
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  /* Slug unique par cercle (pas globalement). Used in URL :
     /circles/[slug]/channels/[channel_slug] */
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 50),
  description text CHECK (description IS NULL OR char_length(description) <= 500),
  /* Type de channel :
     - text          : feed standard de posts (default)
     - announcement  : seuls owner/admin/moderator postent, push notif
                       tous membres au post
     - forum         : threads style Reddit, posts ordonnés par
                       upvotes/downvotes (sort Hot/New/Top) */
  channel_type text NOT NULL DEFAULT 'text'
    CHECK (channel_type IN ('text', 'announcement', 'forum')),
  /* Position d'affichage dans la sidebar (ordre custom par admin). */
  position integer NOT NULL DEFAULT 0,
  /* Permissions custom (override des roles cercle). null = utilise
     les defaults par type. jsonb pour flexibilité :
       { "view": ["member"], "post": ["admin", "moderator"] } */
  permissions jsonb,
  /* Compteurs dénormalisés. */
  posts_count integer NOT NULL DEFAULT 0,
  /* Soft archive (channel masqué, pas supprimé). */
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  /* Slug unique par cercle. */
  UNIQUE (circle_id, slug)
);

CREATE INDEX IF NOT EXISTS circle_channels_circle_position_idx
  ON public.circle_channels (circle_id, position)
  WHERE archived_at IS NULL;

-- ============================================================
-- 2. Ajout channel_id sur posts (FK nullable, back-compat)
-- ============================================================

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.circle_channels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_channel_created_idx
  ON public.posts (channel_id, created_at DESC)
  WHERE channel_id IS NOT NULL AND deleted_at IS NULL;

-- ============================================================
-- 3. RLS circle_channels
-- ============================================================

ALTER TABLE public.circle_channels ENABLE ROW LEVEL SECURITY;

/* SELECT : membres actifs du cercle voient les channels.
   Note : la visibilité fine (channel privé VIP) est gérée côté
   application via permissions jsonb pour V1. V2 = RLS plus stricte. */
DROP POLICY IF EXISTS circle_channels_select_member ON public.circle_channels;
CREATE POLICY circle_channels_select_member
  ON public.circle_channels FOR SELECT
  USING (
    archived_at IS NULL AND public.is_circle_active_member(circle_id)
  );

/* INSERT/UPDATE/DELETE : owner/admin uniquement. */
DROP POLICY IF EXISTS circle_channels_admin ON public.circle_channels;
CREATE POLICY circle_channels_admin
  ON public.circle_channels FOR ALL
  USING (public.is_circle_admin(circle_id))
  WITH CHECK (public.is_circle_admin(circle_id));

-- ============================================================
-- 4. Trigger : sync posts_count dénormalisé
-- ============================================================

CREATE OR REPLACE FUNCTION public.tg_sync_channel_posts_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.channel_id IS NOT NULL THEN
    UPDATE public.circle_channels SET posts_count = posts_count + 1
      WHERE id = NEW.channel_id;
  ELSIF TG_OP = 'DELETE' AND OLD.channel_id IS NOT NULL THEN
    UPDATE public.circle_channels SET posts_count = GREATEST(posts_count - 1, 0)
      WHERE id = OLD.channel_id;
  ELSIF TG_OP = 'UPDATE' THEN
    /* channel_id a changé ? */
    IF OLD.channel_id IS DISTINCT FROM NEW.channel_id THEN
      IF OLD.channel_id IS NOT NULL THEN
        UPDATE public.circle_channels SET posts_count = GREATEST(posts_count - 1, 0)
          WHERE id = OLD.channel_id;
      END IF;
      IF NEW.channel_id IS NOT NULL THEN
        UPDATE public.circle_channels SET posts_count = posts_count + 1
          WHERE id = NEW.channel_id;
      END IF;
    END IF;
    /* Soft delete (deleted_at) compte comme une décrémentation. */
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND NEW.channel_id IS NOT NULL THEN
      UPDATE public.circle_channels SET posts_count = GREATEST(posts_count - 1, 0)
        WHERE id = NEW.channel_id;
    END IF;
    IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL AND NEW.channel_id IS NOT NULL THEN
      UPDATE public.circle_channels SET posts_count = posts_count + 1
        WHERE id = NEW.channel_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tg_sync_channel_posts_count_trg ON public.posts;
CREATE TRIGGER tg_sync_channel_posts_count_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_channel_posts_count();

-- ============================================================
-- 5. Migration data : "Général" par défaut sur cercles existants
-- ============================================================
-- Pour chaque cercle qui n'a pas encore de channel "general", on
-- en crée un + on assigne tous ses posts existants à ce channel.

DO $$
DECLARE
  c RECORD;
  general_id UUID;
BEGIN
  FOR c IN SELECT id FROM public.circles WHERE archived_at IS NULL LOOP
    /* Skip si déjà un channel "general" pour ce cercle. */
    IF EXISTS (
      SELECT 1 FROM public.circle_channels
      WHERE circle_id = c.id AND slug = 'general'
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.circle_channels (
      circle_id, slug, name, description, channel_type, position
    ) VALUES (
      c.id,
      'general',
      'Général',
      'Discussions générales du cercle',
      'text',
      0
    )
    RETURNING id INTO general_id;

    /* Assigne tous les posts existants du cercle à ce channel. */
    UPDATE public.posts
       SET channel_id = general_id
     WHERE circle_id = c.id AND channel_id IS NULL;

    /* Synchronise le posts_count après assignation. */
    UPDATE public.circle_channels
       SET posts_count = (
         SELECT COUNT(*) FROM public.posts
         WHERE channel_id = general_id AND deleted_at IS NULL
       )
     WHERE id = general_id;
  END LOOP;
END $$;

-- ============================================================
-- 6. RPC list_circle_channels
-- ============================================================

CREATE OR REPLACE FUNCTION public.list_circle_channels(p_circle_id UUID)
RETURNS TABLE (
  id UUID,
  slug text,
  name text,
  description text,
  channel_type text,
  "position" integer,
  posts_count integer,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    id, slug, name, description, channel_type, "position", posts_count, created_at
  FROM public.circle_channels
  WHERE circle_id = p_circle_id
    AND archived_at IS NULL
  ORDER BY "position" ASC, created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_circle_channels(UUID) TO authenticated;

COMMIT;
