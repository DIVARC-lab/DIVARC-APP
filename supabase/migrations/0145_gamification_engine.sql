-- Chantier Cercles v4 — Sprint F : Gamification Engine
-- ======================================================
--
-- 3 piliers :
--   F.1 Auto-award badges (extension user_badges + trigger first_post)
--   F.2 Quêtes hebdo (catalog + progress tracking + claim)
--   F.3 Streaks (profiles fields + helper RPC)
--
-- Architecture :
--   - user_badges déjà existant (migration 0068) — on étend les types
--     autorisés et on ajoute un trigger d'auto-award.
--   - quests = catalog statique (seed dans cette migration), avec
--     criteria jsonb pour décrire les conditions.
--   - user_quest_progress = 1 ligne par (user × quest × period_key).
--   - profiles.current_streak / longest_streak / last_active_day :
--     mis à jour côté Server Action (best-effort, calendrier UTC).
--
-- IDEMPOTENT.

BEGIN;

-- ============================================================
-- 1. user_badges : extension types autorisés
-- ============================================================

ALTER TABLE public.user_badges
  DROP CONSTRAINT IF EXISTS user_badges_badge_type_check;
ALTER TABLE public.user_badges
  ADD CONSTRAINT user_badges_badge_type_check
  CHECK (badge_type IN (
    /* legacy 0068 */
    'founder', 'beta_tester', 'top_creator', 'event',
    'achievement', 'mentor_certified', 'employee_verified',
    'identity_verified', 'press', 'super_seller',
    /* Sprint F.1 — extension gamification */
    'first_post', 'prolific_writer', 'streak_7', 'streak_30', 'streak_100',
    'circle_top_contributor', 'circle_founder', 'mentor_helper',
    'quest_master', 'early_bird'
  ));

/* Helper SECURITY DEFINER : insère un badge si pas déjà présent. */
CREATE OR REPLACE FUNCTION public.award_user_badge(
  p_user_id UUID,
  p_badge_type text,
  p_label text,
  p_description text DEFAULT NULL,
  p_icon text DEFAULT NULL,
  p_accent_color text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  /* Idempotent : ne re-award pas si déjà présent avec même type ET
     même label (le label distingue les editions ex: top_creator de
     mars vs avril). */
  SELECT id INTO v_id
    FROM public.user_badges
   WHERE user_id = p_user_id
     AND badge_type = p_badge_type
     AND label = p_label
   LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.user_badges (
    user_id, badge_type, label, description, icon, accent_color,
    metadata, expires_at
  ) VALUES (
    p_user_id, p_badge_type, p_label, p_description, p_icon,
    p_accent_color, p_metadata, p_expires_at
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_user_badge(
  UUID, text, text, text, text, text, jsonb, TIMESTAMPTZ
) TO authenticated;

-- ============================================================
-- 2. Trigger auto-award : first_post + prolific_writer
-- ============================================================

CREATE OR REPLACE FUNCTION public.tg_auto_award_post_milestones()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  /* Skip si pas un post real (draft, scheduled, etc.). */
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  /* Count posts publiés par l'auteur, hors soft-deleted. */
  SELECT COUNT(*) INTO v_count
    FROM public.posts
   WHERE author_id = NEW.author_id
     AND status = 'published'
     AND deleted_at IS NULL;

  /* first_post : 1er post. */
  IF v_count = 1 THEN
    PERFORM public.award_user_badge(
      NEW.author_id, 'first_post', 'Premier post',
      'Tu as posté ton premier message sur DIVARC.', '✨', 'gold',
      jsonb_build_object('post_id', NEW.id), NULL
    );
  END IF;

  /* prolific_writer : 100 posts. */
  IF v_count = 100 THEN
    PERFORM public.award_user_badge(
      NEW.author_id, 'prolific_writer', 'Plume prolifique',
      'Tu as franchi la barre des 100 posts.', '✍️', 'navy',
      jsonb_build_object('count', 100), NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_auto_award_post_milestones_trg ON public.posts;
CREATE TRIGGER tg_auto_award_post_milestones_trg
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_auto_award_post_milestones();

-- ============================================================
-- 3. Quêtes — catalog + progress
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quests (
  id text PRIMARY KEY,              -- slug stable, ex: 'weekly_3_posts'
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  description text NOT NULL CHECK (char_length(description) BETWEEN 5 AND 240),
  /* Période : weekly (reset lundi 00:00 UTC) ou daily. */
  period text NOT NULL CHECK (period IN ('daily', 'weekly')),
  /* Critères : { kind: 'post_count' | 'reaction_count' | 'comment_count',
     target: int, optional: { circle_id, etc. } } */
  criteria jsonb NOT NULL,
  /* Récompense XP (points abstraits — peut alimenter un badge plus tard). */
  xp_reward integer NOT NULL DEFAULT 10 CHECK (xp_reward BETWEEN 1 AND 1000),
  icon text DEFAULT '🎯',
  is_active boolean NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quests_active_idx
  ON public.quests (period) WHERE is_active = true;

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quests_read_all ON public.quests;
CREATE POLICY quests_read_all
  ON public.quests FOR SELECT
  USING (is_active = true);

/* Progress d'un user sur une quête pour une période donnée.
   period_key = 'YYYY-Wnn' (weekly) ou 'YYYY-MM-DD' (daily). */
CREATE TABLE IF NOT EXISTS public.user_quest_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id text NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_id, period_key)
);

CREATE INDEX IF NOT EXISTS user_quest_progress_user_idx
  ON public.user_quest_progress (user_id, completed_at NULLS FIRST);

ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_quest_progress_read_self ON public.user_quest_progress;
CREATE POLICY user_quest_progress_read_self
  ON public.user_quest_progress FOR SELECT
  USING (auth.uid() = user_id);

/* INSERT/UPDATE : Server Actions via SECURITY DEFINER bumpQuestProgress. */

/* Seed initial des quêtes (idempotent via ON CONFLICT DO NOTHING). */
INSERT INTO public.quests (id, title, description, period, criteria, xp_reward, icon)
VALUES
  ('weekly_3_posts',
   'Poste 3 fois cette semaine',
   'Publie 3 messages dans tes cercles cette semaine.',
   'weekly',
   '{"kind":"post_count","target":3}'::jsonb,
   30, '✍️'),
  ('weekly_5_reactions',
   'Réagis à 5 messages',
   'Donne 5 réactions ou likes cette semaine.',
   'weekly',
   '{"kind":"reaction_count","target":5}'::jsonb,
   15, '❤️'),
  ('weekly_2_comments',
   'Commente 2 posts',
   'Engage la discussion avec au moins 2 commentaires cette semaine.',
   'weekly',
   '{"kind":"comment_count","target":2}'::jsonb,
   20, '💬'),
  ('daily_login',
   'Connexion du jour',
   'Lance DIVARC aujourd''hui pour grappiller ton XP quotidien.',
   'daily',
   '{"kind":"login","target":1}'::jsonb,
   5, '☀️')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. RPC bump_quest_progress
-- ============================================================
--
-- Incrémente atomiquement le progress d'un user sur les quêtes actives
-- correspondant au kind donné. Si target atteint, set completed_at.
-- Appelée depuis les Server Actions (post create, reaction, comment).

CREATE OR REPLACE FUNCTION public.bump_quest_progress(
  p_user_id UUID,
  p_kind text,
  p_delta integer DEFAULT 1
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q RECORD;
  v_period_key text;
  v_target integer;
BEGIN
  IF p_user_id IS NULL OR p_kind IS NULL THEN RETURN; END IF;

  FOR q IN
    SELECT id, period, criteria
      FROM public.quests
     WHERE is_active = true
       AND criteria->>'kind' = p_kind
  LOOP
    /* period_key : 'YYYY-Wnn' pour weekly (ISO), 'YYYY-MM-DD' pour daily. */
    v_period_key := CASE q.period
      WHEN 'weekly' THEN to_char(now() AT TIME ZONE 'UTC', 'IYYY-"W"IW')
      WHEN 'daily' THEN to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ELSE NULL
    END;
    IF v_period_key IS NULL THEN CONTINUE; END IF;
    v_target := COALESCE((q.criteria->>'target')::integer, 1);

    INSERT INTO public.user_quest_progress (
      user_id, quest_id, period_key, progress, updated_at
    ) VALUES (
      p_user_id, q.id, v_period_key, p_delta, now()
    )
    ON CONFLICT (user_id, quest_id, period_key) DO UPDATE
      SET progress = user_quest_progress.progress + EXCLUDED.progress,
          updated_at = now();

    /* Si l'objectif est atteint et completed_at pas encore set, on l'arme. */
    UPDATE public.user_quest_progress
       SET completed_at = now()
     WHERE user_id = p_user_id
       AND quest_id = q.id
       AND period_key = v_period_key
       AND completed_at IS NULL
       AND progress >= v_target;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_quest_progress(UUID, text, integer)
  TO authenticated;

-- ============================================================
-- 5. Triggers — wire bump_quest_progress sur posts / reactions / comments
-- ============================================================

CREATE OR REPLACE FUNCTION public.tg_quest_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'published' THEN RETURN NEW; END IF;
  PERFORM public.bump_quest_progress(NEW.author_id, 'post_count', 1);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_quest_on_post_trg ON public.posts;
CREATE TRIGGER tg_quest_on_post_trg
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_quest_on_post();

CREATE OR REPLACE FUNCTION public.tg_quest_on_reaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.bump_quest_progress(NEW.user_id, 'reaction_count', 1);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_quest_on_reaction_trg ON public.post_likes;
CREATE TRIGGER tg_quest_on_reaction_trg
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.tg_quest_on_reaction();

CREATE OR REPLACE FUNCTION public.tg_quest_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  PERFORM public.bump_quest_progress(NEW.author_id, 'comment_count', 1);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_quest_on_comment_trg ON public.post_comments;
CREATE TRIGGER tg_quest_on_comment_trg
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_quest_on_comment();

-- ============================================================
-- 6. Streaks — colonnes profiles + RPC bump
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_day date;

CREATE OR REPLACE FUNCTION public.bump_user_streak(
  p_user_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last date;
  v_current integer;
  v_longest integer;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  SELECT last_active_day, current_streak, longest_streak
    INTO v_last, v_current, v_longest
    FROM public.profiles WHERE id = p_user_id;

  /* 1ère fois ou même jour : on initialise / no-op. */
  IF v_last IS NULL THEN
    UPDATE public.profiles
       SET current_streak = 1,
           longest_streak = GREATEST(longest_streak, 1),
           last_active_day = v_today
     WHERE id = p_user_id;
    PERFORM public.bump_quest_progress(p_user_id, 'login', 1);
    RETURN;
  END IF;

  IF v_last = v_today THEN
    RETURN; -- déjà actif aujourd'hui
  END IF;

  /* Streak day+1 si v_last = v_today-1, sinon reset à 1. */
  IF v_last = v_today - INTERVAL '1 day' THEN
    v_current := COALESCE(v_current, 0) + 1;
  ELSE
    v_current := 1;
  END IF;
  v_longest := GREATEST(COALESCE(v_longest, 0), v_current);

  UPDATE public.profiles
     SET current_streak = v_current,
         longest_streak = v_longest,
         last_active_day = v_today
   WHERE id = p_user_id;

  /* Bump quest login + déclenche badges streak_7/30/100 si jalons atteints. */
  PERFORM public.bump_quest_progress(p_user_id, 'login', 1);

  IF v_current = 7 THEN
    PERFORM public.award_user_badge(
      p_user_id, 'streak_7', 'Série de 7 jours',
      'Tu es revenu sur DIVARC 7 jours d''affilée.', '🔥', 'gold',
      jsonb_build_object('streak', 7), NULL
    );
  ELSIF v_current = 30 THEN
    PERFORM public.award_user_badge(
      p_user_id, 'streak_30', 'Série de 30 jours',
      'Un mois entier sans manquer une journée. Bravo !', '🔥', 'navy',
      jsonb_build_object('streak', 30), NULL
    );
  ELSIF v_current = 100 THEN
    PERFORM public.award_user_badge(
      p_user_id, 'streak_100', 'Série de 100 jours',
      'Cent jours d''affilée — légende DIVARC.', '🏆', 'gold',
      jsonb_build_object('streak', 100), NULL
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_user_streak(UUID) TO authenticated;

-- ============================================================
-- 7. Leaderboard cercle v2 (multi-sort)
-- ============================================================
--
-- Retourne top N membres d'un cercle, sortable par :
--   - 'karma'  : circle_karma_ledger sum sur 30j
--   - 'posts'  : count posts dans le cercle sur 30j
--   - 'streak' : current_streak du profil
--   - 'comments' : count comments écrits par l'user sur les posts du cercle
-- V1 simple, RPC unique.

CREATE OR REPLACE FUNCTION public.circle_leaderboard_v2(
  p_circle_id UUID,
  p_sort text DEFAULT 'karma',
  p_limit integer DEFAULT 25
) RETURNS TABLE (
  user_id UUID,
  full_name text,
  username text,
  avatar_url text,
  karma_30d integer,
  posts_30d integer,
  comments_30d integer,
  current_streak integer,
  score integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH cm AS (
    SELECT user_id
      FROM public.circle_members
     WHERE circle_id = p_circle_id
       AND status = 'active'
       AND is_banned = false
  ),
  karma AS (
    SELECT user_id, COALESCE(SUM(amount), 0)::integer AS karma_30d
      FROM public.circle_karma_ledger
     WHERE circle_id = p_circle_id
       AND created_at > now() - interval '30 days'
     GROUP BY user_id
  ),
  posts AS (
    SELECT author_id AS user_id, COUNT(*)::integer AS posts_30d
      FROM public.posts
     WHERE circle_id = p_circle_id
       AND status = 'published'
       AND deleted_at IS NULL
       AND created_at > now() - interval '30 days'
     GROUP BY author_id
  ),
  comments AS (
    SELECT c.author_id AS user_id, COUNT(*)::integer AS comments_30d
      FROM public.post_comments c
      JOIN public.posts p ON p.id = c.post_id
     WHERE p.circle_id = p_circle_id
       AND c.deleted_at IS NULL
       AND c.created_at > now() - interval '30 days'
     GROUP BY c.author_id
  )
  SELECT
    cm.user_id,
    pr.full_name,
    pr.username,
    pr.avatar_url,
    COALESCE(k.karma_30d, 0) AS karma_30d,
    COALESCE(p.posts_30d, 0) AS posts_30d,
    COALESCE(c.comments_30d, 0) AS comments_30d,
    COALESCE(pr.current_streak, 0) AS current_streak,
    CASE p_sort
      WHEN 'posts' THEN COALESCE(p.posts_30d, 0)
      WHEN 'comments' THEN COALESCE(c.comments_30d, 0)
      WHEN 'streak' THEN COALESCE(pr.current_streak, 0)
      ELSE COALESCE(k.karma_30d, 0)
    END AS score
  FROM cm
  JOIN public.profiles pr ON pr.id = cm.user_id
  LEFT JOIN karma k ON k.user_id = cm.user_id
  LEFT JOIN posts p ON p.user_id = cm.user_id
  LEFT JOIN comments c ON c.user_id = cm.user_id
  ORDER BY score DESC NULLS LAST
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.circle_leaderboard_v2(UUID, text, integer)
  TO authenticated;

COMMIT;
