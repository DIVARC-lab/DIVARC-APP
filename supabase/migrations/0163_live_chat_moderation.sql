-- ============================================================================
-- 0163_live_chat_moderation.sql — Étape 19/25 Live Streaming
--
-- Colonnes de modération sur live_chat_messages + table audit log.
-- Pattern hybride (latence <100ms) :
--   1. Pré-check synchrone : blacklist keywords FR codée côté TS
--      → refuse insert si match (auto_mod_action='blocked_keyword')
--   2. Claude Haiku 4.5 synchrone si auto_mod_level >= medium
--      → refuse insert si flag (auto_mod_action='blocked_ai')
--   3. Sinon insert direct avec auto_mod_action='allowed'.
--
-- Pas de pattern post-insert pour V1 : on attend la réponse Claude
-- avant d'INSERT. Latence ~500-800ms acceptable vs UX "message qui
-- apparaît puis disparaît".
-- ============================================================================

ALTER TABLE public.live_chat_messages
  ADD COLUMN IF NOT EXISTS auto_mod_action text
    CHECK (auto_mod_action IN (
      'none', 'allowed', 'flagged',
      'blocked_keyword', 'blocked_ai', 'shadow_muted'
    )),
  ADD COLUMN IF NOT EXISTS auto_mod_reason text,
  ADD COLUMN IF NOT EXISTS auto_mod_categories text[],
  ADD COLUMN IF NOT EXISTS auto_mod_score numeric(4,3);

CREATE INDEX IF NOT EXISTS idx_live_chat_mod_flagged
  ON public.live_chat_messages (session_id, auto_mod_action)
  WHERE auto_mod_action IN ('flagged', 'blocked_keyword', 'blocked_ai');

-- ============================================================================
-- Table audit : tentatives bloquées (non insérées dans messages).
-- Utile pour les hosts qui veulent voir le volume de spam filtré.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.live_chat_moderation_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.circle_live_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_preview text NOT NULL CHECK (char_length(content_preview) <= 80),
  block_kind text NOT NULL
    CHECK (block_kind IN ('keyword', 'ai', 'rate_limited')),
  reason text,
  categories text[],
  score numeric(4,3),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mod_blocks_session
  ON public.live_chat_moderation_blocks (session_id, created_at DESC);

ALTER TABLE public.live_chat_moderation_blocks ENABLE ROW LEVEL SECURITY;

-- SELECT : host de la session uniquement (privacy : pas exposé aux viewers).
DROP POLICY IF EXISTS mod_blocks_select_host ON public.live_chat_moderation_blocks;
CREATE POLICY mod_blocks_select_host
  ON public.live_chat_moderation_blocks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
      WHERE r.id = session_id AND r.host_id = (SELECT auth.uid())
    )
  );

-- INSERT : seuls les Server Actions (mais on garde une policy permissive
-- self pour cohérence — un user ne peut logger que ses propres blocages).
DROP POLICY IF EXISTS mod_blocks_insert_self ON public.live_chat_moderation_blocks;
CREATE POLICY mod_blocks_insert_self
  ON public.live_chat_moderation_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

COMMENT ON TABLE public.live_chat_moderation_blocks IS
  'Étape 19 : Log des tentatives chat bloquées (keyword/AI/rate-limit). Visible host pour stats.';
