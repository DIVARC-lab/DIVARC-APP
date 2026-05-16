-- ============================================================================
-- 0179_purge_disappearing.sql — Purge des messages éphémères
--
-- Marque comme deleted_at NOW() les messages dont l'âge dépasse
-- conversations.auto_delete_after_days.
--
-- À appeler via pg_cron (ou Vercel cron API route) toutes les heures.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.purge_disappearing_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.messages m
    SET deleted_at = now()
    FROM public.conversations c
    WHERE m.conversation_id = c.id
      AND c.auto_delete_after_days IS NOT NULL
      AND m.deleted_at IS NULL
      AND m.created_at < now() - (c.auto_delete_after_days * interval '1 day')
    RETURNING m.id
  )
  SELECT COUNT(*) INTO v_count FROM expired;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_disappearing_messages() FROM PUBLIC;

COMMENT ON FUNCTION public.purge_disappearing_messages() IS
  'À appeler via cron horaire : marque deleted_at les messages dont l''âge dépasse auto_delete_after_days de la conv.';
