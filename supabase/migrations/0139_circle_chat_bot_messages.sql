-- Chantier Cercles v4 — Sprint A étape A.2 (sub) : support bot messages
-- =====================================================================
--
-- Les bots doivent pouvoir poster dans le chat cercle sans être
-- attachés à un user humain. Plutôt que créer des comptes "bot users"
-- (lourd), on autorise `author_id` à être NULL si `bot_id` est défini.
--
-- Côté UI : le rendu d'un message avec bot_id non-null affiche le
-- nom + avatar du bot au lieu du profil author.

BEGIN;

-- ============================================================
-- 1. Ajout colonne bot_id sur circle_chat_messages
-- ============================================================

ALTER TABLE public.circle_chat_messages
  ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES public.circle_bots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS circle_chat_messages_bot_idx
  ON public.circle_chat_messages (bot_id)
  WHERE bot_id IS NOT NULL;

-- ============================================================
-- 2. Relaxer la contrainte NOT NULL sur author_id
-- ============================================================
-- author_id NULL est OK seulement si bot_id est défini.
-- On ajoute un CHECK pour garantir l'intégrité.

ALTER TABLE public.circle_chat_messages
  ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE public.circle_chat_messages
  DROP CONSTRAINT IF EXISTS circle_chat_messages_author_or_bot;

ALTER TABLE public.circle_chat_messages
  ADD CONSTRAINT circle_chat_messages_author_or_bot
  CHECK (author_id IS NOT NULL OR bot_id IS NOT NULL);

-- ============================================================
-- 3. Policy INSERT pour les bots (via SECURITY DEFINER)
-- ============================================================
-- Le runtime bot (Server Action) appelle des fonctions SECURITY
-- DEFINER qui bypassent RLS. Pas de policy supplémentaire nécessaire
-- côté table.
--
-- Si le runtime devait passer par INSERT direct depuis le client,
-- on ajouterait :
--   CREATE POLICY circle_chat_messages_insert_bot
--     ON public.circle_chat_messages FOR INSERT
--     WITH CHECK (
--       bot_id IS NOT NULL
--       AND EXISTS (SELECT 1 FROM circle_bots b
--                    WHERE b.id = bot_id AND b.is_active = true)
--     );
-- Mais pour V1, on garde le bot runtime en SECURITY DEFINER côté
-- Server Action Next.js.

-- ============================================================
-- 4. RPC pour poster un message en tant que bot (utilisé par engine)
-- ============================================================

CREATE OR REPLACE FUNCTION public.bot_post_chat_message(
  p_bot_id UUID,
  p_circle_id UUID,
  p_body text
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_message_id UUID;
  bot_active boolean;
BEGIN
  /* Vérifie que le bot existe, est actif, et appartient au cercle. */
  SELECT (is_active AND circle_id = p_circle_id) INTO bot_active
    FROM public.circle_bots WHERE id = p_bot_id;
  IF NOT COALESCE(bot_active, false) THEN
    RAISE EXCEPTION 'bot not active or circle mismatch';
  END IF;

  IF char_length(p_body) < 1 OR char_length(p_body) > 4000 THEN
    RAISE EXCEPTION 'body length out of bounds (1-4000)';
  END IF;

  INSERT INTO public.circle_chat_messages (
    circle_id, author_id, bot_id, body
  ) VALUES (
    p_circle_id, NULL, p_bot_id, p_body
  )
  RETURNING id INTO new_message_id;

  RETURN new_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bot_post_chat_message(UUID, UUID, text)
  TO authenticated;

COMMIT;
