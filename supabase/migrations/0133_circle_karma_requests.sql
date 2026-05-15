-- Chantier Cercles v3 — Karma + Demandes/Offres
-- ==============================================
--
-- 2 features liées qui créent une micro-économie interne au cercle :
--
-- 1. **Karma** : points gagnés par activité (poster, commenter,
--    inviter, aider) → réputation + utilisables comme "monnaie" pour
--    promouvoir une demande/offre dans le board interne.
--
-- 2. **Board Demandes & Offres** : un mur typé (cherche / offre)
--    distinct du feed posts et du marketplace. Ex :
--      - "Je cherche un dev React pour 2h" (demande, optionnel paid)
--      - "Je propose 1h de mentorat marketing gratuit" (offre)
--    Permet aux membres de se rendre service au sein du cercle.
--
-- Architecture :
--  - circle_member_karma : agrégat dénormalisé (lecture rapide)
--  - circle_karma_ledger : historique transactions (audit + animation)
--  - circle_requests : table principale des annonces
--  - circle_request_responses : réponses des autres membres
--  - Triggers pour incrémenter karma sur activité

BEGIN;

-- ============================================================
-- 1. Karma agrégé par membre (lecture rapide leaderboard / profil)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_member_karma (
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  /* Décomposition pour affichage profil. */
  posts_points integer NOT NULL DEFAULT 0,
  comments_points integer NOT NULL DEFAULT 0,
  reactions_received_points integer NOT NULL DEFAULT 0,
  invites_points integer NOT NULL DEFAULT 0,
  helpful_points integer NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (circle_id, user_id)
);

CREATE INDEX IF NOT EXISTS circle_member_karma_circle_points_idx
  ON public.circle_member_karma (circle_id, points DESC);

-- ============================================================
-- 2. Historique transactions karma (audit + animation feed)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_karma_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN (
    'post_published',
    'comment_published',
    'reaction_received',
    'invite_accepted',
    'helpful_marked',
    'request_fulfilled',
    'manual_admin'
  )),
  delta integer NOT NULL,
  /* Référence optionnelle (post_id, comment_id, request_id, etc.) */
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS circle_karma_ledger_user_circle_idx
  ON public.circle_karma_ledger (user_id, circle_id, created_at DESC);

-- ============================================================
-- 3. Board Demandes & Offres
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('request', 'offer')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 140),
  body text CHECK (body IS NULL OR char_length(body) <= 4000),
  /* Taxonomie thématique : skills/expertise concernés. */
  tags text[] DEFAULT '{}',
  /* Compensation optionnelle : null = gratuit, sinon montant + currency. */
  budget_amount numeric(10, 2),
  budget_currency text CHECK (budget_currency IS NULL OR budget_currency IN ('EUR', 'USD', 'XOF', 'XAF', 'KARMA')),
  /* Localisation optionnelle (en personne vs remote). */
  is_remote boolean DEFAULT true,
  location_city text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'fulfilled', 'closed', 'expired')),
  /* Karma boost : si l'auteur dépense du karma pour mettre en avant. */
  karma_boost integer NOT NULL DEFAULT 0,
  fulfilled_by UUID REFERENCES auth.users(id),
  fulfilled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS circle_requests_circle_status_created_idx
  ON public.circle_requests (circle_id, status, karma_boost DESC, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS circle_requests_author_idx
  ON public.circle_requests (author_id);

-- ============================================================
-- 4. Réponses aux demandes/offres
-- ============================================================

CREATE TABLE IF NOT EXISTS public.circle_request_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.circle_requests(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  /* Statut côté réponse : envoyée / acceptée par auteur / refusée */
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS circle_request_responses_request_idx
  ON public.circle_request_responses (request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS circle_request_responses_responder_idx
  ON public.circle_request_responses (responder_id);

-- ============================================================
-- 5. RLS
-- ============================================================

ALTER TABLE public.circle_member_karma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_karma_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_request_responses ENABLE ROW LEVEL SECURITY;

/* Karma : tous les membres voient le karma de tout le monde (leaderboard).
   Pas d'écriture directe — passe par les triggers / admins via RPC. */
DROP POLICY IF EXISTS circle_member_karma_select_member ON public.circle_member_karma;
CREATE POLICY circle_member_karma_select_member
  ON public.circle_member_karma FOR SELECT
  USING (public.is_circle_active_member(circle_id));

/* Karma ledger : own history visible. */
DROP POLICY IF EXISTS circle_karma_ledger_select_own ON public.circle_karma_ledger;
CREATE POLICY circle_karma_ledger_select_own
  ON public.circle_karma_ledger FOR SELECT
  USING (user_id = auth.uid());

/* Requests : SELECT membres actifs. */
DROP POLICY IF EXISTS circle_requests_select_member ON public.circle_requests;
CREATE POLICY circle_requests_select_member
  ON public.circle_requests FOR SELECT
  USING (
    deleted_at IS NULL AND public.is_circle_active_member(circle_id)
  );

/* Requests INSERT : membres actifs. */
DROP POLICY IF EXISTS circle_requests_insert_member ON public.circle_requests;
CREATE POLICY circle_requests_insert_member
  ON public.circle_requests FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_circle_active_member(circle_id)
  );

/* Requests UPDATE : own seulement (+ status change limité). */
DROP POLICY IF EXISTS circle_requests_update_own ON public.circle_requests;
CREATE POLICY circle_requests_update_own
  ON public.circle_requests FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

/* Requests DELETE (soft via UPDATE deleted_at). */
DROP POLICY IF EXISTS circle_requests_delete_own ON public.circle_requests;
CREATE POLICY circle_requests_delete_own
  ON public.circle_requests FOR DELETE
  USING (author_id = auth.uid());

/* Responses : SELECT par auteur de la request OU responder. */
DROP POLICY IF EXISTS circle_request_responses_select ON public.circle_request_responses;
CREATE POLICY circle_request_responses_select
  ON public.circle_request_responses FOR SELECT
  USING (
    responder_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.circle_requests r
      WHERE r.id = circle_request_responses.request_id
        AND r.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS circle_request_responses_insert ON public.circle_request_responses;
CREATE POLICY circle_request_responses_insert
  ON public.circle_request_responses FOR INSERT
  WITH CHECK (
    responder_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.circle_requests r
      WHERE r.id = circle_request_responses.request_id
        AND r.deleted_at IS NULL
        AND public.is_circle_active_member(r.circle_id)
    )
  );

DROP POLICY IF EXISTS circle_request_responses_update ON public.circle_request_responses;
CREATE POLICY circle_request_responses_update
  ON public.circle_request_responses FOR UPDATE
  USING (
    responder_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.circle_requests r
      WHERE r.id = circle_request_responses.request_id
        AND r.author_id = auth.uid()
    )
  );

-- ============================================================
-- 6. Trigger : credit karma sur INSERT post / comment
-- ============================================================

CREATE OR REPLACE FUNCTION public.credit_circle_karma(
  p_circle_id UUID,
  p_user_id UUID,
  p_source text,
  p_delta integer,
  p_ref_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  col_to_increment text;
BEGIN
  IF p_circle_id IS NULL OR p_user_id IS NULL THEN RETURN; END IF;

  /* Ledger entry. */
  INSERT INTO public.circle_karma_ledger (
    circle_id, user_id, source, delta, ref_id
  ) VALUES (p_circle_id, p_user_id, p_source, p_delta, p_ref_id);

  /* Upsert agrégat. */
  INSERT INTO public.circle_member_karma (circle_id, user_id, points)
  VALUES (p_circle_id, p_user_id, p_delta)
  ON CONFLICT (circle_id, user_id) DO UPDATE
  SET points = circle_member_karma.points + p_delta,
      updated_at = now();

  /* Update sub-counter selon source. */
  col_to_increment := CASE p_source
    WHEN 'post_published' THEN 'posts_points'
    WHEN 'comment_published' THEN 'comments_points'
    WHEN 'reaction_received' THEN 'reactions_received_points'
    WHEN 'invite_accepted' THEN 'invites_points'
    WHEN 'helpful_marked' THEN 'helpful_points'
    ELSE NULL
  END;

  IF col_to_increment IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.circle_member_karma SET %I = %I + $1 WHERE circle_id = $2 AND user_id = $3',
      col_to_increment, col_to_increment
    ) USING p_delta, p_circle_id, p_user_id;
  END IF;
END;
$$;

/* Trigger sur post INSERT (si circle_id IS NOT NULL) : +10 pts */
CREATE OR REPLACE FUNCTION public.tg_circle_post_karma()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.circle_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.credit_circle_karma(
    NEW.circle_id, NEW.author_id, 'post_published', 10, NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_circle_post_karma_trg ON public.posts;
CREATE TRIGGER tg_circle_post_karma_trg
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_circle_post_karma();

/* Trigger sur post_comment INSERT : +3 pts si parent post.circle_id non-null */
CREATE OR REPLACE FUNCTION public.tg_circle_comment_karma()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_circle_id UUID;
BEGIN
  SELECT circle_id INTO parent_circle_id FROM public.posts WHERE id = NEW.post_id;
  IF parent_circle_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.credit_circle_karma(
    parent_circle_id, NEW.author_id, 'comment_published', 3, NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_circle_comment_karma_trg ON public.post_comments;
CREATE TRIGGER tg_circle_comment_karma_trg
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_circle_comment_karma();

/* Trigger sur post_reaction INSERT : +1 pt à l'auteur du post */
CREATE OR REPLACE FUNCTION public.tg_circle_reaction_karma()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_circle_id UUID;
  parent_author UUID;
BEGIN
  SELECT circle_id, author_id INTO parent_circle_id, parent_author
    FROM public.posts WHERE id = NEW.post_id;
  IF parent_circle_id IS NULL OR parent_author = NEW.user_id THEN
    RETURN NEW;
  END IF;
  PERFORM public.credit_circle_karma(
    parent_circle_id, parent_author, 'reaction_received', 1, NEW.post_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_circle_reaction_karma_trg ON public.post_reactions;
CREATE TRIGGER tg_circle_reaction_karma_trg
  AFTER INSERT ON public.post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_circle_reaction_karma();

-- ============================================================
-- 7. Activer le module `requests` sur tous les cercles existants
-- ============================================================

UPDATE public.circles
SET modules = COALESCE(modules, '{}'::jsonb) || '{"requests": true}'::jsonb
WHERE NOT (modules ? 'requests');

COMMIT;
