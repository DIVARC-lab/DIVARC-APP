-- ============================================================================
-- 0180_fix_messages_type_check.sql — Fix check messages_type
--
-- La migration 0177 a remplacé le check constraint mais omis les
-- anciens noms (voice, audio, location_live, link, call_record) déjà
-- présents en DB depuis 0073. Résultat : ERROR 23514 si rows existantes.
--
-- Fix : check union (anciens + nouveaux). On garde les anciens noms
-- comme alias pour ne pas casser les rows existantes ni le code TS.
-- ============================================================================

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_type_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_type_check
  CHECK (type IN (
    -- Originaux (0003)
    'text', 'system',
    -- Anciens types 0073 (gardés pour rétro-compat)
    'image', 'video',
    'voice',           -- ancien nom voice_note
    'audio',           -- ancien nom audio_file
    'document',
    'location',
    'location_live',   -- ancien nom live_location
    'contact', 'sticker', 'gif',
    'link',            -- ancien nom link_preview
    'call_record',     -- ancien nom call_log
    -- Nouveaux types 0177 (alias + types DIVARC natifs)
    'voice_note', 'audio_file', 'live_location',
    'link_preview', 'call_log',
    'poll', 'payment',
    'event_invite', 'post_share', 'profile_share',
    'listing_share', 'job_share', 'circle_invite',
    'ai_response'
  ));

COMMENT ON CONSTRAINT messages_type_check ON public.messages IS
  'Union anciens noms (0073) + nouveaux (0177). Voice/voice_note, audio/audio_file, etc. sont des alias pour la rétro-compat.';
