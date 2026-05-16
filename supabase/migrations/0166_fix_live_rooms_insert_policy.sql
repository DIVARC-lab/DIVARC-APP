-- ============================================================================
-- 0166_fix_live_rooms_insert_policy.sql — Fix rétroactif RLS
--
-- L'INSERT policy du Sprint E (0135) exigeait que circle_id soit non
-- null + que l'user soit admin/owner/mod du cercle. Depuis la
-- généralisation Live Streaming V1 (0155), circle_id peut être NULL
-- pour les lives perso (public, friends_only, subscribers_only,
-- private, unlisted) → l'INSERT échouait pour tous les lives non-cercle.
--
-- Nouvelle policy :
--   host_id = auth.uid()
--   AND (
--     circle_id IS NULL                              -- live perso
--     OR EXISTS membre admin/owner/mod du cercle     -- live cercle
--   )
-- ============================================================================

DROP POLICY IF EXISTS circle_live_rooms_insert_admin ON public.circle_live_rooms;

CREATE POLICY circle_live_rooms_insert_host
  ON public.circle_live_rooms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    host_id = (SELECT auth.uid())
    AND (
      circle_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.circle_members
        WHERE circle_id = circle_live_rooms.circle_id
          AND user_id = (SELECT auth.uid())
          AND status = 'active'
          AND role IN ('owner', 'admin', 'moderator', 'mod')
      )
    )
  );

COMMENT ON POLICY circle_live_rooms_insert_host ON public.circle_live_rooms IS
  'Étape 25/fix : autorise les lives perso (circle_id NULL) en plus des lives cercle (admin/owner/mod).';
