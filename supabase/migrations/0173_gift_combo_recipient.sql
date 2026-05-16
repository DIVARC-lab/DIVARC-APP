-- ============================================================================
-- 0173_gift_combo_recipient.sql — Étape 18/60
--
-- Combo gift + recipient (host OU guest sur panel).
-- Selon le brief : si user envoie même gift X fois en <5s → combo.
-- + Possibilité d'envoyer à un guest spécifique sur le panel.
-- ============================================================================

ALTER TABLE public.live_gift_sends
  ADD COLUMN IF NOT EXISTS recipient_user_id UUID
    REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS combo_id UUID,
  ADD COLUMN IF NOT EXISTS combo_count integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_live_gift_sends_combo
  ON public.live_gift_sends (combo_id)
  WHERE combo_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_live_gift_sends_recipient
  ON public.live_gift_sends (recipient_user_id, session_id)
  WHERE status = 'paid';

-- Default recipient = host de la session si pas spécifié.
-- Pas de trigger compat parce que c'est calculé côté Server Action.

COMMENT ON COLUMN public.live_gift_sends.recipient_user_id IS
  'Étape 18/60 : destinataire si pas le host (guest sur panel).';
COMMENT ON COLUMN public.live_gift_sends.combo_id IS
  'Étape 18/60 : UUID partagé entre les envois successifs d''un même
  gift par même user en <5s.';
