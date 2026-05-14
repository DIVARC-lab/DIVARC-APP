-- Chantier Feed FB-style — Étape 7
-- ================================
--
-- Ajoute 2 réactions custom DIVARC aux 6 existantes (FB-compat) :
--   - fire    🔥  : "feu" / hype / bouillonne
--   - sparkle ✨  : "magique" / inspirant / DIVARC-vibe
--
-- Total 8 réactions : heart, applause, insightful, surprised, sad,
-- laugh, fire, sparkle.
--
-- IDEMPOTENT : si la contrainte autorise déjà fire/sparkle, no-op.

BEGIN;

-- ============================================================
-- 1. Élargir le CHECK sur post_reactions
-- ============================================================

ALTER TABLE public.post_reactions
  DROP CONSTRAINT IF EXISTS post_reactions_reaction_type_check;

ALTER TABLE public.post_reactions
  ADD CONSTRAINT post_reactions_reaction_type_check
  CHECK (
    reaction_type IN (
      'heart',
      'applause',
      'insightful',
      'surprised',
      'sad',
      'laugh',
      'fire',
      'sparkle'
    )
  );

-- ============================================================
-- 2. Mettre à jour la validation dans toggle_post_reaction
-- ============================================================
-- Le RPC actuel valide p_reaction_type avec un IN list hard-codé. On
-- recrée la fonction avec la liste étendue.

CREATE OR REPLACE FUNCTION public.toggle_post_reaction(
  p_post_id uuid,
  p_reaction_type text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_exists boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING errcode = '42501';
  END IF;
  IF p_reaction_type NOT IN (
    'heart', 'applause', 'insightful', 'surprised', 'sad', 'laugh',
    'fire', 'sparkle'
  ) THEN
    RAISE EXCEPTION 'invalid reaction type' USING errcode = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.post_reactions
     WHERE user_id = v_user
       AND post_id = p_post_id
       AND reaction_type = p_reaction_type
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.post_reactions
     WHERE user_id = v_user
       AND post_id = p_post_id
       AND reaction_type = p_reaction_type;
    RETURN false;
  END IF;

  INSERT INTO public.post_reactions (user_id, post_id, reaction_type)
       VALUES (v_user, p_post_id, p_reaction_type);
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_post_reaction(uuid, text)
  TO authenticated;

COMMIT;
