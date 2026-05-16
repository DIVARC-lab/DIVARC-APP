-- Chantier Recsys DIVARC — Étape 20 : Cold start phase tracker
-- ===============================================================
--
-- Calcule la phase de "cold start" d'un utilisateur en fonction de l'âge
-- de son compte. Sert au ranker pour booster les sources network+geo
-- pendant les premières heures (UX critique) et à l'UI pour afficher un
-- banner contextuel "Ton fil s'adapte à mesure que tu interagis".
--
-- Phases :
--   NEW         : < 1h après signup (basé uniquement déclaratif onboarding)
--   LEARNING    : 1h - 24h (premier learning sur events)
--   ADJUSTING   : 1j - 7j (ajustement actif)
--   STABILIZED  : > 7j (fonctionnement normal)
--
-- Pas de colonne stockée : phase calculée à la volée à partir de
-- profiles.created_at (single source of truth, jamais désynchronisée).
--
-- IDEMPOTENT.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_user_cold_start_phase(
  p_user_id UUID
) RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p.created_at IS NULL THEN 'new'
      WHEN p.created_at > now() - interval '1 hour' THEN 'new'
      WHEN p.created_at > now() - interval '24 hours' THEN 'learning'
      WHEN p.created_at > now() - interval '7 days' THEN 'adjusting'
      ELSE 'stabilized'
    END
  FROM public.profiles p
  WHERE p.id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_cold_start_phase(UUID)
  TO authenticated;

/* RPC enrichi : retourne aussi l'âge en heures et un % de progression
 * dans la phase courante. Utile pour l'UI banner. */
CREATE OR REPLACE FUNCTION public.get_user_cold_start_info(
  p_user_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_created_at TIMESTAMPTZ;
  v_age_hours float;
  v_phase text;
  v_phase_progress_pct integer;
  v_phase_label text;
  v_phase_desc text;
BEGIN
  SELECT created_at INTO v_created_at
    FROM public.profiles WHERE id = p_user_id;

  IF v_created_at IS NULL THEN
    RETURN jsonb_build_object(
      'phase', 'new',
      'age_hours', 0,
      'phase_progress_pct', 0
    );
  END IF;

  v_age_hours := EXTRACT(EPOCH FROM (now() - v_created_at)) / 3600.0;

  IF v_age_hours < 1 THEN
    v_phase := 'new';
    v_phase_label := 'Bienvenue';
    v_phase_desc := 'Ton fil démarre avec les centres d''intérêt que tu as déclarés. Il va s''affiner dans les prochaines heures.';
    v_phase_progress_pct := LEAST(100, GREATEST(0, ROUND((v_age_hours / 1.0) * 100)::integer));
  ELSIF v_age_hours < 24 THEN
    v_phase := 'learning';
    v_phase_label := 'En apprentissage';
    v_phase_desc := 'DIVARC apprend de tes interactions. Chaque like, commentaire et minute regardée nous aide à mieux te comprendre.';
    v_phase_progress_pct := LEAST(100, GREATEST(0, ROUND(((v_age_hours - 1) / 23.0) * 100)::integer));
  ELSIF v_age_hours < 24 * 7 THEN
    v_phase := 'adjusting';
    v_phase_label := 'Ajustements en cours';
    v_phase_desc := 'Ton fil se précise. Tu peux toujours customiser tes intérêts dans les réglages.';
    v_phase_progress_pct := LEAST(100, GREATEST(0, ROUND(((v_age_hours - 24) / (24.0 * 6)) * 100)::integer));
  ELSE
    v_phase := 'stabilized';
    v_phase_label := 'Fil personnalisé';
    v_phase_desc := 'Ton fil est calibré sur tes habitudes.';
    v_phase_progress_pct := 100;
  END IF;

  RETURN jsonb_build_object(
    'phase', v_phase,
    'phase_label', v_phase_label,
    'phase_desc', v_phase_desc,
    'phase_progress_pct', v_phase_progress_pct,
    'age_hours', ROUND(v_age_hours::numeric, 2),
    'is_new_user', v_age_hours < 24 * 7,
    'created_at', v_created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_cold_start_info(UUID)
  TO authenticated;

COMMIT;
