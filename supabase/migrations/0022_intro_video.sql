-- =====================================================
-- DIVARC — Migration 0022 : Vidéo de présentation (CV vidéo)
--   60 secondes max, format vertical 9:16, vignette extraite
--   au 1er frame côté client (canvas).
-- =====================================================

alter table public.profiles
  add column if not exists intro_video_url text
    check (intro_video_url is null or intro_video_url ~* '^https?://'),
  add column if not exists intro_video_thumbnail_url text
    check (intro_video_thumbnail_url is null or intro_video_thumbnail_url ~* '^https?://'),
  add column if not exists intro_video_duration_ms integer
    check (
      intro_video_duration_ms is null
      or (intro_video_duration_ms > 0 and intro_video_duration_ms <= 65000)
    ),
  add column if not exists intro_video_uploaded_at timestamptz;

-- =========================================================
-- Storage bucket pour les vidéos de présentation
--   - Public : oui (accès direct via URL)
--   - File size limit : 25 MB (60s en H.264 720p reste en deçà)
--   - MIME types autorisés : video/webm, video/mp4, image/jpeg, image/webp
--     (les images servent pour les thumbnails)
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-videos',
  'profile-videos',
  true,
  26214400,
  array['video/webm', 'video/mp4', 'video/quicktime', 'image/jpeg', 'image/webp', 'image/png']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- =========================================================
-- Storage RLS : un user peut uploader/supprimer dans son propre dossier
--   ({user_id}/...).  Lecture publique car bucket public.
-- =========================================================

drop policy if exists "users upload own profile videos" on storage.objects;
create policy "users upload own profile videos"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users update own profile videos" on storage.objects;
create policy "users update own profile videos"
  on storage.objects for update
  using (
    bucket_id = 'profile-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users delete own profile videos" on storage.objects;
create policy "users delete own profile videos"
  on storage.objects for delete
  using (
    bucket_id = 'profile-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "profile videos are public" on storage.objects;
create policy "profile videos are public"
  on storage.objects for select
  using (bucket_id = 'profile-videos');
