-- ============================================================================
-- 0164_live_recordings.sql — Étape 21/25 Live Streaming
--
-- Enregistrement VOD via LiveKit Egress (RoomCompositeEgress).
-- Stockage : Supabase Storage S3-compatible OU LiveKit Cloud temporaire.
--
-- Lifecycle :
--   1. startLiveStreamSession + is_recording=true → startRoomCompositeEgress
--      → INSERT live_recordings status='starting'
--   2. Webhook LiveKit "egress_started" → status='recording', egress_id set
--   3. endLiveStreamSession → stopEgress(egress_id)
--   4. Webhook LiveKit "egress_ended" → status='completed', file_url +
--      duration + size, ou status='failed' avec error_message
--
-- 1 recording par session (UNIQUE partial). En cas de re-démarrage du
-- live, on créerait une 2e ligne en updatant l'ancienne en 'ended'.
-- ============================================================================

-- Colonne miroir pour affichage rapide côté viewer ended state.
ALTER TABLE public.circle_live_rooms
  ADD COLUMN IF NOT EXISTS vod_url text;

CREATE TABLE IF NOT EXISTS public.live_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.circle_live_rooms(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  egress_id text UNIQUE,
  status text NOT NULL DEFAULT 'starting'
    CHECK (status IN (
      'starting',  -- API call envoyé, en attente webhook
      'recording', -- egress actif
      'stopping',  -- stop demandé
      'completed', -- fichier disponible
      'failed',    -- erreur quelque part
      'aborted'    -- annulé manuellement
    )),

  file_url text,
  file_path text,           -- path dans Supabase Storage si uploadé
  storage_provider text DEFAULT 'supabase'
    CHECK (storage_provider IN ('supabase', 'livekit', 's3', 'other')),
  duration_seconds integer,
  size_bytes bigint,
  width integer,
  height integer,
  thumbnail_url text,

  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  raw_egress_info jsonb,    -- payload final LiveKit (debug)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_recordings_session
  ON public.live_recordings (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_recordings_host
  ON public.live_recordings (host_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_recordings_status
  ON public.live_recordings (status)
  WHERE status IN ('starting', 'recording', 'stopping');

ALTER TABLE public.live_recordings ENABLE ROW LEVEL SECURITY;

-- SELECT : tous les users authentifiés peuvent voir les VODs des lives
-- publics dont ils ont eu accès (cohérent avec visibility live).
-- Pour simplicité V1 : SELECT public. La filtration par visibility
-- (private/circle/subs) se fera côté UI (page replay vérifie visibility).
DROP POLICY IF EXISTS live_recordings_select ON public.live_recordings;
CREATE POLICY live_recordings_select
  ON public.live_recordings
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE : interdits côté client. Server Actions + webhook
-- LiveKit utilisent admin client (service role).
DROP POLICY IF EXISTS live_recordings_no_insert ON public.live_recordings;
DROP POLICY IF EXISTS live_recordings_insert_host ON public.live_recordings;
CREATE POLICY live_recordings_insert_host
  ON public.live_recordings
  FOR INSERT
  TO authenticated
  WITH CHECK (host_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS live_recordings_update_host ON public.live_recordings;
CREATE POLICY live_recordings_update_host
  ON public.live_recordings
  FOR UPDATE
  TO authenticated
  USING (host_id = (SELECT auth.uid()))
  WITH CHECK (host_id = (SELECT auth.uid()));

COMMENT ON TABLE public.live_recordings IS
  'Étape 21 : Enregistrements VOD des lives via LiveKit Egress.';
