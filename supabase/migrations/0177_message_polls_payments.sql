-- ============================================================================
-- 0177_message_polls_payments.sql — Étape Polls + Payments in-chat
--
-- 1. Ajoute type 'poll' et 'payment' à messages.type
-- 2. Crée tables message_polls + message_poll_votes
-- 3. Crée table message_payments (Stripe checkout integration)
-- ============================================================================

-- Étend le check constraint sur messages.type. On lit la définition
-- actuelle et on ajoute les nouveaux types.
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_type_check
  CHECK (type IN (
    'text', 'system',
    'image', 'video', 'voice_note', 'audio_file',
    'document', 'location', 'live_location',
    'contact', 'sticker', 'gif',
    'poll', 'payment',
    'event_invite', 'post_share', 'profile_share',
    'listing_share', 'job_share', 'circle_invite',
    'link_preview', 'call_log', 'ai_response'
  ));

-- ============================================================================
-- POLLS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.message_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL UNIQUE
    REFERENCES public.messages(id) ON DELETE CASCADE,
  question text NOT NULL CHECK (char_length(question) BETWEEN 3 AND 280),
  options jsonb NOT NULL,  -- array of { id: string, text: string }
  is_multiple_choice boolean NOT NULL DEFAULT false,
  is_anonymous boolean NOT NULL DEFAULT false,
  closes_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_polls_options_valid
    CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 10)
);

CREATE INDEX IF NOT EXISTS idx_message_polls_message
  ON public.message_polls (message_id);

CREATE TABLE IF NOT EXISTS public.message_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.message_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id text NOT NULL,
  voted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_poll_votes_unique UNIQUE (poll_id, user_id, option_id)
);

CREATE INDEX IF NOT EXISTS idx_message_poll_votes_poll
  ON public.message_poll_votes (poll_id);

ALTER TABLE public.message_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS message_polls_select ON public.message_polls;
CREATE POLICY message_polls_select
  ON public.message_polls FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND public.is_conversation_member(m.conversation_id)
    )
  );

DROP POLICY IF EXISTS message_polls_insert ON public.message_polls;
CREATE POLICY message_polls_insert
  ON public.message_polls FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND m.sender_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS message_polls_update ON public.message_polls;
CREATE POLICY message_polls_update
  ON public.message_polls FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND m.sender_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS message_poll_votes_select ON public.message_poll_votes;
CREATE POLICY message_poll_votes_select
  ON public.message_poll_votes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.message_polls p
      JOIN public.messages m ON m.id = p.message_id
      WHERE p.id = poll_id
        AND public.is_conversation_member(m.conversation_id)
    )
  );

DROP POLICY IF EXISTS message_poll_votes_insert_self ON public.message_poll_votes;
CREATE POLICY message_poll_votes_insert_self
  ON public.message_poll_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS message_poll_votes_delete_self ON public.message_poll_votes;
CREATE POLICY message_poll_votes_delete_self
  ON public.message_poll_votes FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- RPC : vote_message_poll(poll_id, option_id)
-- Toggle vote : si déjà voté pour cette option → UNvote ; sinon vote.
-- Si poll non-multiple, supprime les autres votes du même user d'abord.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.vote_message_poll(
  p_poll_id uuid,
  p_option_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_poll record;
  v_existing record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT id, is_multiple_choice, closed_at INTO v_poll
    FROM public.message_polls WHERE id = p_poll_id;
  IF v_poll IS NULL THEN
    RAISE EXCEPTION 'poll_not_found';
  END IF;
  IF v_poll.closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'poll_closed';
  END IF;

  /* Toggle. */
  SELECT id INTO v_existing
    FROM public.message_poll_votes
    WHERE poll_id = p_poll_id
      AND user_id = v_user_id
      AND option_id = p_option_id;

  IF v_existing IS NOT NULL THEN
    DELETE FROM public.message_poll_votes WHERE id = v_existing.id;
    RETURN;
  END IF;

  /* Si non multiple_choice, supprime les autres votes. */
  IF NOT v_poll.is_multiple_choice THEN
    DELETE FROM public.message_poll_votes
      WHERE poll_id = p_poll_id AND user_id = v_user_id;
  END IF;

  INSERT INTO public.message_poll_votes (poll_id, user_id, option_id)
    VALUES (p_poll_id, v_user_id, p_option_id);
END;
$$;

REVOKE ALL ON FUNCTION public.vote_message_poll(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vote_message_poll(uuid, text) TO authenticated;

-- ============================================================================
-- PAYMENTS in-chat (Stripe direct charge non-Connect ; sender → recipient
-- direct via Checkout simple)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.message_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL UNIQUE
    REFERENCES public.messages(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  amount_cents integer NOT NULL CHECK (amount_cents BETWEEN 100 AND 100000),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  description text CHECK (description IS NULL OR char_length(description) <= 200),

  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'declined', 'expired', 'refunded')),

  paid_at timestamptz,
  declined_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_payments_sender
  ON public.message_payments (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_payments_recipient
  ON public.message_payments (recipient_id, status);

ALTER TABLE public.message_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS message_payments_select ON public.message_payments;
CREATE POLICY message_payments_select
  ON public.message_payments FOR SELECT TO authenticated
  USING (
    sender_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS message_payments_insert_self ON public.message_payments;
CREATE POLICY message_payments_insert_self
  ON public.message_payments FOR INSERT TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()));

COMMENT ON TABLE public.message_polls IS
  'Sondages in-chat (jusqu''à 10 options, anonymous ou public).';
COMMENT ON TABLE public.message_payments IS
  'Paiements directs entre users via Stripe Checkout (montant 1€-1000€).';
