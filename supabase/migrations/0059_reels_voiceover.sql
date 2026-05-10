-- =====================================================
-- DIVARC — Migration 0059 : Voix off + mix audio reels (V3.7)
--
-- Ajoute aux reels :
--   - voiceover_url : URL Supabase Storage de l'audio voix off (webm/opus
--     ou mp4/aac, max 90s comme la vidéo)
--   - video_volume : volume du track audio de la vidéo source [0..1]
--   - voiceover_volume : volume de la voix off mixée [0..1]
--
-- Note : le mixage final n'est pas pré-encodé en V3.7 — le client joue
-- la vidéo et la voix off via 2 <audio> elements synchronisés (timeUpdate
-- sur le video, audio.currentTime aligné), chaque channel a son volume
-- réglable. V4 : pré-encoder via ffmpeg.wasm pour un seul mp4 final.
-- =====================================================

alter table public.reels
  add column if not exists voiceover_url text,
  add column if not exists video_volume numeric(4,3) not null default 1.0
    check (video_volume >= 0 and video_volume <= 1),
  add column if not exists voiceover_volume numeric(4,3) not null default 1.0
    check (voiceover_volume >= 0 and voiceover_volume <= 1);

-- has_voiceover existait déjà comme boolean — on garde pour signaler
-- la présence d'un track sans devoir lire voiceover_url.
