-- ============================================================================
-- 0176_fix_stream_key_encoding.sql — Fix urgent encoding base64url
--
-- PostgreSQL encode() ne supporte pas 'base64url'. Seulement 'base64',
-- 'hex' et 'escape'. On utilise 'base64' + replace pour URL-safe.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.live_session_default_stream_key()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.stream_key IS NULL THEN
    /* base64 → URL-safe : + → -, / → _, retire les = */
    NEW.stream_key := translate(
      replace(encode(gen_random_bytes(24), 'base64'), E'\n', ''),
      '+/=',
      '-_'
    );
  END IF;
  RETURN NEW;
END;
$$;
