-- =====================================================
-- DIVARC — Migration 0058 : Text overlays sur reels (V3.6)
--
-- Ajoute reels.text_overlays jsonb : array de textes superposés à la
-- vidéo avec position (% du frame), intervalle temporel (start/end),
-- style (couleur, taille, gras, fond). Le render se fait côté client
-- en synchronisant avec video.currentTime.
--
-- Structure d'un overlay :
--   {
--     "id": "uuid-client",
--     "text": "string max 100",
--     "start_s": 0.0,   -- secondes depuis le début (>= 0)
--     "end_s": 5.0,     -- secondes depuis le début (> start_s, <= duration)
--     "x_pct": 50,      -- centre X en % du frame (0-100)
--     "y_pct": 50,      -- centre Y en % du frame (0-100)
--     "font_size_px": 28,
--     "color": "#FFFFFF",  -- hex
--     "weight": "bold" | "regular",
--     "bg": "none" | "solid" | "outline",
--     "align": "left" | "center" | "right"
--   }
--
-- Validation : on stocke le jsonb tel quel (validation côté action +
-- côté client). Max 10 overlays par reel.
-- =====================================================

alter table public.reels
  add column if not exists text_overlays jsonb not null default '[]'::jsonb;

-- Index GIN si on veut requêter par contenu plus tard (analytics texte).
create index if not exists reels_text_overlays_idx
  on public.reels using gin (text_overlays);
