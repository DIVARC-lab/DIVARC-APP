-- =====================================================
-- DIVARC — Migration 0024 : Posts vidéo verticaux (Reels)
--   Format vertical 9:16, 60s max comme TikTok/Reels.
--   Vignette extraite côté client.
-- =====================================================

alter table public.posts
  add column if not exists video_url text
    check (video_url is null or video_url ~* '^https?://'),
  add column if not exists video_thumbnail_url text
    check (video_thumbnail_url is null or video_thumbnail_url ~* '^https?://'),
  add column if not exists video_duration_ms integer
    check (
      video_duration_ms is null
      or (video_duration_ms > 0 and video_duration_ms <= 65000)
    ),
  add column if not exists video_width integer
    check (video_width is null or video_width > 0),
  add column if not exists video_height integer
    check (video_height is null or video_height > 0);

create index if not exists posts_video_idx
  on public.posts (created_at desc)
  where video_url is not null and deleted_at is null;

-- =========================================================
-- Bucket Storage post-videos (public, 50 MB max — 60s en H.264 720p)
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-videos',
  'post-videos',
  true,
  52428800,
  array['video/webm', 'video/mp4', 'video/quicktime', 'image/jpeg', 'image/webp', 'image/png']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload own post videos" on storage.objects;
create policy "users upload own post videos"
  on storage.objects for insert
  with check (
    bucket_id = 'post-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users update own post videos" on storage.objects;
create policy "users update own post videos"
  on storage.objects for update
  using (
    bucket_id = 'post-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users delete own post videos" on storage.objects;
create policy "users delete own post videos"
  on storage.objects for delete
  using (
    bucket_id = 'post-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "post videos are public" on storage.objects;
create policy "post videos are public"
  on storage.objects for select
  using (bucket_id = 'post-videos');
