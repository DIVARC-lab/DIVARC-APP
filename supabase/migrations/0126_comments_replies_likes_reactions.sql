-- Chantier Comments v2 — Réponses, likes et réactions emoji
-- ===========================================================
--
-- Avant : post_comments est plat (id, post_id, author_id, body).
-- Aucun mécanisme de réponse, like ou réaction emoji.
--
-- Maintenant :
--  - parent_comment_id : auto-référence pour threads (réponses).
--  - likes_count, replies_count, reactions_count : caches matérialisés
--    maintenus par triggers (évite COUNT(*) à chaque lecture).
--  - post_comment_likes : 1 like par (comment_id, user_id) max.
--  - post_comment_reactions : 1 emoji par (comment_id, user_id), 8 valeurs.
--
-- RLS strict : lecture = lecture du post parent, écriture = own row.
-- Soft-delete préservé (deleted_at sur post_comments).

BEGIN;

-- ============================================================
-- 1. Extension post_comments
-- ============================================================

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid
    REFERENCES public.post_comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replies_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reactions_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS post_comments_parent_idx
  ON public.post_comments (parent_comment_id, created_at DESC)
  WHERE parent_comment_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS post_comments_post_root_idx
  ON public.post_comments (post_id, created_at DESC)
  WHERE parent_comment_id IS NULL AND deleted_at IS NULL;

-- ============================================================
-- 2. Table post_comment_likes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.post_comment_likes (
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS post_comment_likes_user_idx
  ON public.post_comment_likes (user_id, created_at DESC);

ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;

-- Lecture : tout le monde voit (count public).
DROP POLICY IF EXISTS post_comment_likes_select ON public.post_comment_likes;
CREATE POLICY post_comment_likes_select ON public.post_comment_likes
  FOR SELECT
  USING (true);

-- Insert : uniquement own user_id.
DROP POLICY IF EXISTS post_comment_likes_insert ON public.post_comment_likes;
CREATE POLICY post_comment_likes_insert ON public.post_comment_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Delete : uniquement own row.
DROP POLICY IF EXISTS post_comment_likes_delete ON public.post_comment_likes;
CREATE POLICY post_comment_likes_delete ON public.post_comment_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. Table post_comment_reactions (emoji ∈ 8 valeurs)
-- ============================================================
-- 1 réaction par user par comment max. Si l'user change d'emoji, on
-- UPSERT (overwrite). Si même emoji que l'existant, on DELETE (toggle).

CREATE TABLE IF NOT EXISTS public.post_comment_reactions (
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id),
  CONSTRAINT post_comment_reactions_emoji_valid CHECK (
    emoji IN ('👍', '❤️', '😂', '🔥', '👏', '🤔', '😢', '😠')
  )
);

CREATE INDEX IF NOT EXISTS post_comment_reactions_user_idx
  ON public.post_comment_reactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS post_comment_reactions_comment_emoji_idx
  ON public.post_comment_reactions (comment_id, emoji);

ALTER TABLE public.post_comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_comment_reactions_select ON public.post_comment_reactions;
CREATE POLICY post_comment_reactions_select ON public.post_comment_reactions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS post_comment_reactions_insert ON public.post_comment_reactions;
CREATE POLICY post_comment_reactions_insert ON public.post_comment_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS post_comment_reactions_update ON public.post_comment_reactions;
CREATE POLICY post_comment_reactions_update ON public.post_comment_reactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS post_comment_reactions_delete ON public.post_comment_reactions;
CREATE POLICY post_comment_reactions_delete ON public.post_comment_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. Triggers maintenant les caches likes_count / replies_count / reactions_count
-- ============================================================

-- ---- likes_count ----
CREATE OR REPLACE FUNCTION public.tg_post_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.post_comments
       SET likes_count = likes_count + 1
     WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.post_comments
       SET likes_count = GREATEST(0, likes_count - 1)
     WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_comment_likes_count_trg ON public.post_comment_likes;
CREATE TRIGGER post_comment_likes_count_trg
AFTER INSERT OR DELETE ON public.post_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.tg_post_comment_likes_count();

-- ---- reactions_count ----
CREATE OR REPLACE FUNCTION public.tg_post_comment_reactions_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.post_comments
       SET reactions_count = reactions_count + 1
     WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.post_comments
       SET reactions_count = GREATEST(0, reactions_count - 1)
     WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  -- UPDATE : pas de changement count (1 réaction par user reste 1).
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_comment_reactions_count_trg ON public.post_comment_reactions;
CREATE TRIGGER post_comment_reactions_count_trg
AFTER INSERT OR DELETE ON public.post_comment_reactions
FOR EACH ROW EXECUTE FUNCTION public.tg_post_comment_reactions_count();

-- ---- replies_count (incrémenté sur le parent à l'insert d'un comment enfant) ----
CREATE OR REPLACE FUNCTION public.tg_post_comments_replies_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.parent_comment_id IS NOT NULL THEN
      UPDATE public.post_comments
         SET replies_count = replies_count + 1
       WHERE id = NEW.parent_comment_id;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Soft-delete : décrémente le compteur parent si on passe à deleted_at.
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL
       AND NEW.parent_comment_id IS NOT NULL THEN
      UPDATE public.post_comments
         SET replies_count = GREATEST(0, replies_count - 1)
       WHERE id = NEW.parent_comment_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_comments_replies_count_trg ON public.post_comments;
CREATE TRIGGER post_comments_replies_count_trg
AFTER INSERT OR UPDATE OF deleted_at ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.tg_post_comments_replies_count();

-- ============================================================
-- 5. Backfill counts pour les commentaires existants
-- ============================================================
-- Au cas où des likes auraient déjà été insérés via une API alpha.

UPDATE public.post_comments c
   SET likes_count = COALESCE(sub.cnt, 0)
  FROM (
    SELECT comment_id, COUNT(*)::int AS cnt
      FROM public.post_comment_likes
     GROUP BY comment_id
  ) sub
 WHERE sub.comment_id = c.id;

UPDATE public.post_comments c
   SET reactions_count = COALESCE(sub.cnt, 0)
  FROM (
    SELECT comment_id, COUNT(*)::int AS cnt
      FROM public.post_comment_reactions
     GROUP BY comment_id
  ) sub
 WHERE sub.comment_id = c.id;

UPDATE public.post_comments c
   SET replies_count = COALESCE(sub.cnt, 0)
  FROM (
    SELECT parent_comment_id, COUNT(*)::int AS cnt
      FROM public.post_comments
     WHERE parent_comment_id IS NOT NULL
       AND deleted_at IS NULL
     GROUP BY parent_comment_id
  ) sub
 WHERE sub.parent_comment_id = c.id;

COMMIT;
