-- Chantier Cercles v4 — Sprint J : Reports + queue de modération cercle
-- ======================================================================
--
-- Permet à n'importe quel membre actif de signaler un post / commentaire /
-- chat_message dans un cercle. Les admins voient la file dans une nouvelle
-- page /circles/[slug]/moderation/reports et peuvent dismiss / résoudre.
--
-- Architecture :
--   - 1 table circle_reports (1 ligne par signalement)
--   - Status workflow : open → in_review → resolved | dismissed
--   - Resolution action audit : kind + admin_id + resolved_at
--
-- IDEMPOTENT.

BEGIN;

CREATE TABLE IF NOT EXISTS public.circle_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  /* Contenu signalé : on garde le kind pour ne pas mettre 3 FK
     mutuellement exclusives. Le ref_id pointe sur l'ID du contenu. */
  target_kind text NOT NULL CHECK (target_kind IN (
    'post', 'comment', 'chat_message', 'member'
  )),
  target_id UUID NOT NULL,
  /* Raison sélectionnée. */
  reason text NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'hate_speech', 'nsfw',
    'misinfo', 'self_harm', 'other'
  )),
  /* Note libre optionnelle (max 1000 chars). */
  note text CHECK (note IS NULL OR char_length(note) <= 1000),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  /* Quand un admin résout. */
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_kind text CHECK (resolution_kind IS NULL OR resolution_kind IN (
    'content_removed', 'member_warned', 'member_muted', 'member_banned', 'no_action'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS circle_reports_open_idx
  ON public.circle_reports (circle_id, created_at DESC)
  WHERE status IN ('open', 'in_review');

CREATE INDEX IF NOT EXISTS circle_reports_target_idx
  ON public.circle_reports (target_kind, target_id);

ALTER TABLE public.circle_reports ENABLE ROW LEVEL SECURITY;

/* SELECT : reporter voit ses propres reports + admin voit ceux du cercle. */
DROP POLICY IF EXISTS circle_reports_select ON public.circle_reports;
CREATE POLICY circle_reports_select
  ON public.circle_reports FOR SELECT
  USING (
    auth.uid() = reporter_id
    OR public.is_circle_admin(circle_id)
  );

/* INSERT : membres actifs du cercle uniquement. */
DROP POLICY IF EXISTS circle_reports_insert ON public.circle_reports;
CREATE POLICY circle_reports_insert
  ON public.circle_reports FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id
    AND public.is_circle_active_member(circle_id)
  );

/* UPDATE : admin uniquement (résolution / dismissal). */
DROP POLICY IF EXISTS circle_reports_update ON public.circle_reports;
CREATE POLICY circle_reports_update
  ON public.circle_reports FOR UPDATE
  USING (public.is_circle_admin(circle_id))
  WITH CHECK (public.is_circle_admin(circle_id));

-- RPC : compte file ouverte (badge nav) — non-bloquant si l'user n'est
-- pas admin (RLS retourne 0).
CREATE OR REPLACE FUNCTION public.count_open_circle_reports(p_circle_id UUID)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.circle_reports
   WHERE circle_id = p_circle_id
     AND status IN ('open', 'in_review');
$$;

GRANT EXECUTE ON FUNCTION public.count_open_circle_reports(UUID) TO authenticated;

COMMIT;
