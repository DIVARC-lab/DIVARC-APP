-- ============================================================================
-- 0171_live_tiktok_models.sql — Étape 1/60 Live TikTok-like
--
-- Modèles complets alignés sur le brief :
--   - LiveSession (étend circle_live_rooms)
--   - LiveLayout enum (solo/panel_2/4/6/8/pk_battle/audio_only)
--   - GuestRequestMode enum
--   - PanelGuest (nouvelle table live_panel_participants)
--   - GuestRequest (étend live_stage_requests)
--   - LiveComment (étend live_chat_messages avec CommentType enum)
-- ============================================================================

-- ============================================================================
-- 1. Enums
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE live_layout_kind AS ENUM (
    'solo', 'panel_2', 'panel_4', 'panel_6', 'panel_8', 'pk_battle', 'audio_only'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE guest_request_mode AS ENUM (
    'open', 'followers_only', 'friends_only', 'invite_only', 'off'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE live_comment_type AS ENUM (
    'normal', 'gift', 'follow', 'share', 'join', 'repost',
    'super_fan', 'milestone', 'system', 'pinned', 'like_burst'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 2. Extend circle_live_rooms (LiveSession)
-- ============================================================================

ALTER TABLE public.circle_live_rooms
  -- Identité host (dénormalisé pour éviter jointures fréquentes)
  ADD COLUMN IF NOT EXISTS host_username text,
  ADD COLUMN IF NOT EXISTS host_avatar_url text,
  ADD COLUMN IF NOT EXISTS host_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS host_followers_count integer NOT NULL DEFAULT 0,

  -- Layout & guests
  ADD COLUMN IF NOT EXISTS layout live_layout_kind NOT NULL DEFAULT 'solo',
  ADD COLUMN IF NOT EXISTS max_guests_on_panel integer NOT NULL DEFAULT 8
    CHECK (max_guests_on_panel BETWEEN 0 AND 8),
  ADD COLUMN IF NOT EXISTS guest_request_mode_v2 guest_request_mode NOT NULL DEFAULT 'open',

  -- Visibilité étendue
  ADD COLUMN IF NOT EXISTS age_restriction text,
  ADD COLUMN IF NOT EXISTS geo_blocked_countries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cover_url text,

  -- Stream technical
  ADD COLUMN IF NOT EXISTS stream_key text,
  ADD COLUMN IF NOT EXISTS playback_url text,

  -- Stats engagement (temps réel)
  ADD COLUMN IF NOT EXISTS viewers_total_unique integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_likes_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_comments_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_shares_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gifts_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gifts_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_diamonds_earned integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_followers_count integer NOT NULL DEFAULT 0,

  -- Modération étendue
  ADD COLUMN IF NOT EXISTS chat_keyword_filters text[] NOT NULL DEFAULT '{}',

  -- PK Battle (V2 mais on prépare le schéma)
  ADD COLUMN IF NOT EXISTS pk_battle_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pk_opponent_session_id UUID
    REFERENCES public.circle_live_rooms(id);

CREATE INDEX IF NOT EXISTS idx_clr_layout
  ON public.circle_live_rooms (layout)
  WHERE status = 'live';

CREATE INDEX IF NOT EXISTS idx_clr_pk_battle
  ON public.circle_live_rooms (pk_opponent_session_id)
  WHERE pk_battle_active = true;

-- Sync stream_key au create d'une nouvelle session via trigger (génère
-- un secret si absent à l'INSERT).
CREATE OR REPLACE FUNCTION public.live_session_default_stream_key()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.stream_key IS NULL THEN
    NEW.stream_key := encode(gen_random_bytes(24), 'base64url');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_live_session_stream_key ON public.circle_live_rooms;
CREATE TRIGGER trg_live_session_stream_key
  BEFORE INSERT ON public.circle_live_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.live_session_default_stream_key();

-- ============================================================================
-- 3. PanelGuest — qui est sur scène
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.live_panel_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.circle_live_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dénormalisation pour rendu UI rapide
  username text,
  avatar_url text,

  joined_panel_at timestamptz NOT NULL DEFAULT now(),
  position integer NOT NULL CHECK (position BETWEEN 0 AND 7),

  is_muted boolean NOT NULL DEFAULT false,
  is_video_off boolean NOT NULL DEFAULT false,

  -- Engagement guest
  gifts_received_during_session integer NOT NULL DEFAULT 0,
  coins_received_during_session integer NOT NULL DEFAULT 0,

  -- Permissions custom (host peut donner pouvoir d'inviter)
  can_invite_others boolean NOT NULL DEFAULT false,

  -- Sortie de scène
  left_panel_at timestamptz,
  removed_by UUID REFERENCES auth.users(id),
  removed_reason text,

  CONSTRAINT live_panel_unique_active_user
    UNIQUE (session_id, user_id, left_panel_at)
);

-- Index pour récupérer le panel actif rapidement (left_panel_at NULL).
CREATE INDEX IF NOT EXISTS idx_panel_active_session
  ON public.live_panel_participants (session_id, position)
  WHERE left_panel_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_panel_user
  ON public.live_panel_participants (user_id, joined_panel_at DESC);

-- 1 user ne peut être qu'une fois sur le panel actif d'une session.
CREATE UNIQUE INDEX IF NOT EXISTS idx_panel_one_active_per_user_per_session
  ON public.live_panel_participants (session_id, user_id)
  WHERE left_panel_at IS NULL;

-- 1 position ne peut être occupée que par 1 user à la fois sur une session.
CREATE UNIQUE INDEX IF NOT EXISTS idx_panel_one_user_per_position
  ON public.live_panel_participants (session_id, position)
  WHERE left_panel_at IS NULL;

ALTER TABLE public.live_panel_participants ENABLE ROW LEVEL SECURITY;

-- SELECT : tous les users authentifiés (visibilité publique du panel).
DROP POLICY IF EXISTS live_panel_select ON public.live_panel_participants;
CREATE POLICY live_panel_select
  ON public.live_panel_participants
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE : passe par Server Actions (host ou mod via admin
-- client). Pas de policy permissive client.
DROP POLICY IF EXISTS live_panel_insert_host ON public.live_panel_participants;
CREATE POLICY live_panel_insert_host
  ON public.live_panel_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
      WHERE r.id = session_id AND r.host_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.live_moderators m
      WHERE m.session_id = live_panel_participants.session_id
        AND m.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS live_panel_update_self_or_host ON public.live_panel_participants;
CREATE POLICY live_panel_update_self_or_host
  ON public.live_panel_participants
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())  -- le guest peut s'auto-mute / quitter
    OR EXISTS (
      SELECT 1 FROM public.circle_live_rooms r
      WHERE r.id = session_id AND r.host_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.live_moderators m
      WHERE m.session_id = live_panel_participants.session_id
        AND m.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (true);

COMMENT ON TABLE public.live_panel_participants IS
  'Étape 1/60 : Guests actuellement sur le panel vidéo (jusqu''à 8 selon layout).';

-- ============================================================================
-- 4. GuestRequest — étend live_stage_requests (existe depuis 0167)
-- ============================================================================

ALTER TABLE public.live_stage_requests
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS user_follower_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_is_following_host boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_is_followed_by_host boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Default expiration : 60s après création (auto-expire selon brief).
UPDATE public.live_stage_requests
  SET expires_at = created_at + interval '60 seconds'
  WHERE expires_at IS NULL;

ALTER TABLE public.live_stage_requests
  ALTER COLUMN expires_at SET DEFAULT now() + interval '60 seconds';

-- Étend l'enum status pour inclure 'expired'.
ALTER TABLE public.live_stage_requests
  DROP CONSTRAINT IF EXISTS live_stage_requests_status_check;
ALTER TABLE public.live_stage_requests
  ADD CONSTRAINT live_stage_requests_status_check
  CHECK (status IN ('pending', 'approved', 'denied', 'revoked', 'cancelled', 'expired'));

CREATE INDEX IF NOT EXISTS idx_stage_requests_expires
  ON public.live_stage_requests (expires_at)
  WHERE status = 'pending';

-- ============================================================================
-- 5. LiveComment — étend live_chat_messages avec CommentType + métas
-- ============================================================================

ALTER TABLE public.live_chat_messages
  ADD COLUMN IF NOT EXISTS comment_type live_comment_type NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS avatar_url text,

  -- Si gift attached
  ADD COLUMN IF NOT EXISTS gift_id text REFERENCES public.virtual_gifts(id),
  ADD COLUMN IF NOT EXISTS gift_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gift_emoji text,
  ADD COLUMN IF NOT EXISTS gift_color text,

  -- Likes burst (X a envoyé 100 likes)
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0,

  -- Badges utilisateur (snapshot au moment du message)
  ADD COLUMN IF NOT EXISTS user_badges jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS user_level integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_subscriber boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_moderator boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_live_chat_type
  ON public.live_chat_messages (session_id, comment_type, created_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.live_chat_messages.comment_type IS
  'Type sémantique : normal/gift/follow/share/join/milestone/system/pinned/like_burst.';

-- ============================================================================
-- 6. View pratique : live_session_full (LiveSession au format brief)
-- ============================================================================

CREATE OR REPLACE VIEW public.live_session_full AS
SELECT
  r.*,
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'user_id', p.user_id,
          'username', p.username,
          'avatar_url', p.avatar_url,
          'position', p.position,
          'is_muted', p.is_muted,
          'is_video_off', p.is_video_off,
          'gifts_received_during_session', p.gifts_received_during_session,
          'joined_panel_at', p.joined_panel_at
        ) ORDER BY p.position
      )
      FROM public.live_panel_participants p
      WHERE p.session_id = r.id AND p.left_panel_at IS NULL
    ),
    '[]'::json
  ) AS current_guests,
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', sr.id,
          'user_id', sr.requester_id,
          'username', sr.username,
          'avatar_url', sr.avatar_url,
          'requested_at', sr.created_at,
          'expires_at', sr.expires_at
        ) ORDER BY sr.created_at
      )
      FROM public.live_stage_requests sr
      WHERE sr.session_id = r.id
        AND sr.status = 'pending'
        AND (sr.expires_at IS NULL OR sr.expires_at > now())
    ),
    '[]'::json
  ) AS pending_guest_requests
FROM public.circle_live_rooms r;

GRANT SELECT ON public.live_session_full TO authenticated, anon;

-- ============================================================================
-- 7. RPC : expire_stale_guest_requests
-- À appeler depuis un cron ou périodiquement côté serveur.
-- Marque les pending dont expires_at < now() comme 'expired'.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.expire_stale_guest_requests()
RETURNS integer
LANGUAGE sql
AS $$
  WITH expired AS (
    UPDATE public.live_stage_requests
    SET status = 'expired',
        resolved_at = now()
    WHERE status = 'pending'
      AND expires_at IS NOT NULL
      AND expires_at < now()
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM expired;
$$;

COMMENT ON FUNCTION public.expire_stale_guest_requests() IS
  'Étape 1/60 : Marque les demandes de prise de parole non résolues > 60s comme expired.';
