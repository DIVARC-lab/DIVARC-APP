-- =====================================================
-- DIVARC — Migration 0061 : Stickers sur reels (V3.9)
--
-- Ajoute reels.stickers jsonb : array de stickers (image + emoji)
-- positionnés sur la vidéo avec rotate/scale/timeline.
--
-- Structure d'un sticker :
--   {
--     "id": "uuid-client",
--     "kind": "emoji" | "image",
--     "content": "🔥" | "https://...sticker.png",
--     "start_s": 0.0,
--     "end_s": 5.0,
--     "x_pct": 50,
--     "y_pct": 50,
--     "scale": 1.0,      -- 0.2..3.0
--     "rotation_deg": 0  -- -180..180
--   }
--
-- Max 10 stickers par reel (UX cap).
-- =====================================================

alter table public.reels
  add column if not exists stickers jsonb not null default '[]'::jsonb;

create index if not exists reels_stickers_idx
  on public.reels using gin (stickers);
