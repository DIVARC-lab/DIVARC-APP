-- Sprint Auth Onboarding — Inscription Facebook-style
-- =====================================================
--
-- Ajoute les champs date_of_birth et gender à profiles + étend le
-- trigger handle_new_user pour lire ces données depuis raw_user_meta_data
-- au moment du signup.
--
-- L'auto-génération de username reste comme fallback si l'user n'en
-- fournit pas (back-compat avec les comptes existants).
--
-- IDEMPOTENT.

BEGIN;

-- ============================================================
-- 1. Nouveaux champs profiles
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_date_of_birth_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_date_of_birth_check
  CHECK (
    date_of_birth IS NULL OR (
      date_of_birth > '1900-01-01'::date
      AND date_of_birth < (CURRENT_DATE - INTERVAL '13 years')
    )
  );

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_gender_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gender_check
  CHECK (gender IS NULL OR gender IN (
    'female', 'male', 'non_binary', 'other', 'prefer_not_to_say'
  ));

/* Index gender + age (computed) pour ads targeting + recsys
   demographics. Pas critique pour V1 mais peu coûteux. */
CREATE INDEX IF NOT EXISTS profiles_gender_idx
  ON public.profiles (gender)
  WHERE gender IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_dob_idx
  ON public.profiles (date_of_birth)
  WHERE date_of_birth IS NOT NULL;

-- ============================================================
-- 2. Trigger handle_new_user étendu
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meta jsonb;
  v_full_name text;
  v_username_raw text;
  v_username_final text;
  v_phone text;
  v_dob date;
  v_gender text;
  v_location_city text;
  base_username text;
  candidate text;
BEGIN
  v_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  /* Lecture des metadata fournies au signup. */
  v_full_name := v_meta->>'full_name';
  v_username_raw := lower(trim(COALESCE(v_meta->>'username', '')));
  v_phone := NULLIF(trim(COALESCE(v_meta->>'phone_number', '')), '');
  v_location_city := NULLIF(trim(COALESCE(v_meta->>'location_city', '')), '');

  /* DOB : metadata 'date_of_birth' au format ISO 'YYYY-MM-DD'. */
  BEGIN
    v_dob := NULLIF(v_meta->>'date_of_birth', '')::date;
  EXCEPTION WHEN OTHERS THEN
    v_dob := NULL;
  END;

  /* Gender : whitelist côté metadata, sinon NULL. */
  v_gender := v_meta->>'gender';
  IF v_gender NOT IN ('female', 'male', 'non_binary', 'other', 'prefer_not_to_say') THEN
    v_gender := NULL;
  END IF;

  /* Username : si fourni et valide (regex), on l'utilise. Sinon
     fallback sur l'auto-génération à partir de l'email. */
  IF v_username_raw ~ '^[a-z0-9_]{3,30}$' THEN
    /* Le caller (server action signUp) doit avoir déjà vérifié l'unicité.
       Si collision malgré tout (race condition), on suffixe avec un
       chunk de l'UUID. */
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username_raw) THEN
      v_username_final := v_username_raw || '_' || substring(NEW.id::text, 1, 5);
    ELSE
      v_username_final := v_username_raw;
    END IF;
  ELSE
    /* Fallback historique : génère depuis l'email. */
    base_username := regexp_replace(
      lower(split_part(NEW.email, '@', 1)),
      '[^a-z0-9_]', '', 'g'
    );
    IF length(base_username) < 3 THEN
      base_username := 'user';
    END IF;
    candidate := substring(base_username, 1, 14) || '_' || substring(NEW.id::text, 1, 5);
    v_username_final := candidate;
  END IF;

  INSERT INTO public.profiles (
    id, full_name, username, phone_number, date_of_birth, gender, location
  ) VALUES (
    NEW.id,
    v_full_name,
    v_username_final,
    v_phone,
    v_dob,
    v_gender,
    v_location_city
  );

  RETURN NEW;
END;
$$;

/* Le trigger lui-même est inchangé — il pointait déjà sur cette
   fonction. On le re-create par sécurité. */
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. RPC check_username_available pour la validation live côté form
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = lower(trim(p_username))
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_username_available(text) TO authenticated, anon;

COMMIT;
