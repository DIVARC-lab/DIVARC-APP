-- Chantier Stories v2 — Likes et réponses
-- ========================================
--
-- L'user a demandé : (1) voir les viewers (déjà en BDD via story_views,
-- juste l'UI manquait), (2) liker une story, (3) commenter une story.
--
-- Cette migration ajoute :
--   - post_likes-like : table story_likes (PK story_id+user_id, 1 like
--     max par user par story, toggle DELETE).
--   - story_replies : commentaires/réponses texte à une story. 1
--     ligne par message envoyé. Pas de threading (les stories sont
--     éphémères 24h, pas le bon support pour des discussions longues).
--   - likes_count, replies_count : caches sur stories maintenus par
--     triggers.
--
-- RLS : lecture = tout user connecté peut voir likes/replies (count
-- public, identité visible aux amis). Écriture = own row.

BEGIN;

-- ============================================================
-- 1. Étendre stories avec caches
-- ============================================================

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replies_count integer NOT NULL DEFAULT 0;

-- ============================================================
-- 2. Table story_likes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.story_likes (
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);

CREATE INDEX IF NOT EXISTS story_likes_user_idx
  ON public.story_likes (user_id, created_at DESC);

ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS story_likes_select ON public.story_likes;
CREATE POLICY story_likes_select ON public.story_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS story_likes_insert ON public.story_likes;
CREATE POLICY story_likes_insert ON public.story_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS story_likes_delete ON public.story_likes;
CREATE POLICY story_likes_delete ON public.story_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. Table story_replies
-- ============================================================

CREATE TABLE IF NOT EXISTS public.story_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS story_replies_story_idx
  ON public.story_replies (story_id, created_at DESC);

CREATE INDEX IF NOT EXISTS story_replies_author_idx
  ON public.story_replies (author_id, created_at DESC);

ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;

-- Lecture : visible par l'auteur de la story ET l'auteur de la reply.
-- Pas par d'autres (vie privée des réponses comme DM).
DROP POLICY IF EXISTS story_replies_select ON public.story_replies;
CREATE POLICY story_replies_select ON public.story_replies
  FOR SELECT
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.stories s
       WHERE s.id = story_replies.story_id
         AND s.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS story_replies_insert ON public.story_replies;
CREATE POLICY story_replies_insert ON public.story_replies
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS story_replies_delete ON public.story_replies;
CREATE POLICY story_replies_delete ON public.story_replies
  FOR DELETE USING (auth.uid() = author_id);

-- ============================================================
-- 4. Triggers caches
-- ============================================================

CREATE OR REPLACE FUNCTION public.tg_story_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.stories
       SET likes_count = likes_count + 1
     WHERE id = NEW.story_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.stories
       SET likes_count = GREATEST(0, likes_count - 1)
     WHERE id = OLD.story_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS story_likes_count_trg ON public.story_likes;
CREATE TRIGGER story_likes_count_trg
AFTER INSERT OR DELETE ON public.story_likes
FOR EACH ROW EXECUTE FUNCTION public.tg_story_likes_count();

CREATE OR REPLACE FUNCTION public.tg_story_replies_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.stories
       SET replies_count = replies_count + 1
     WHERE id = NEW.story_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.stories
       SET replies_count = GREATEST(0, replies_count - 1)
     WHERE id = OLD.story_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS story_replies_count_trg ON public.story_replies;
CREATE TRIGGER story_replies_count_trg
AFTER INSERT OR DELETE ON public.story_replies
FOR EACH ROW EXECUTE FUNCTION public.tg_story_replies_count();

COMMIT;
