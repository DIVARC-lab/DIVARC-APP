-- =====================================================
-- DIVARC — Migration 0053 : Pipeline transcoding vidéo HLS
-- =====================================================
-- Phase 2.6 — préparation pour streaming HLS adaptatif via Mux ou
-- Cloudflare Stream. Ajoute les colonnes nécessaires sur posts pour
-- stocker l'URL .m3u8 + status de transcoding.
--
-- Fluxd'upload :
--   1. Client → upload MP4 vers Supabase Storage (existant)
--   2. Server action : créer le post avec status='transcoding'
--      (V2) ou status='published' immédiat avec mp4 inline (V1)
--   3. Si transcoding activé : webhook Mux → mise à jour
--      video_hls_url + video_status='ready'
--   4. Front : useHlsVideo() bascule auto sur HLS quand dispo.
--
-- Tolérant à V1 : quand video_hls_url est null, le front fallback
-- gracieusement sur video_url (MP4).

alter table public.posts
  /* URL HLS .m3u8 — null si transcoding pas encore fini ou
     pipeline désactivé. */
  add column if not exists video_hls_url text,

  /* URL Mux/Cloudflare asset_id pour suivi + suppression. */
  add column if not exists video_provider_asset_id text,

  /* Statut transcoding pipeline. */
  add column if not exists video_status text
    check (
      video_status is null
      or video_status in (
        'pending', 'transcoding', 'ready', 'failed'
      )
    ),

  /* Erreur si video_status='failed'. */
  add column if not exists video_error text,

  /* Blurhash pour placeholder pendant chargement (V2). */
  add column if not exists video_blurhash text;

/* Index pour le webhook qui cherche par asset_id provider. */
create index if not exists posts_video_provider_asset_id_idx
  on public.posts (video_provider_asset_id)
  where video_provider_asset_id is not null;
