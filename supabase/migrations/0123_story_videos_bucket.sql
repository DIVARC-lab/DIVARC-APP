-- Migration 0123 — Création bucket story-videos manquant.
--
-- La migration 0035 a ajouté le support video aux stories (colonnes
-- video_url, video_thumbnail_url, video_duration_ms) MAIS a oublié de
-- créer le bucket Supabase Storage 'story-videos' utilisé par le
-- StoryComposer. Résultat : tout upload de story vidéo échouait avec
-- "Bucket not found" → toast "Échec téléversement vidéo" côté user.
--
-- Cette migration crée le bucket + les RLS policies (publication
-- publique en lecture, write réservé à l'auteur authentifié).
--
-- IDEMPOTENT.

-- =====================================================
-- 1. Bucket story-videos (public, max 30 Mo)
-- =====================================================

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'story-videos',
  'story-videos',
  true,
  32505856,  -- 31 Mo soft cap (30 Mo côté UI)
  array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =====================================================
-- 2. RLS policies
-- =====================================================

drop policy if exists "story videos publicly readable" on storage.objects;
create policy "story videos publicly readable"
  on storage.objects for select
  using (bucket_id = 'story-videos');

drop policy if exists "users upload own story videos" on storage.objects;
create policy "users upload own story videos"
  on storage.objects for insert
  with check (
    bucket_id = 'story-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users delete own story videos" on storage.objects;
create policy "users delete own story videos"
  on storage.objects for delete
  using (
    bucket_id = 'story-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- NOTE : on évite `comment on table storage.buckets` qui demande des
-- droits OWNER sur le schéma `storage` (ERROR 42501 sur Supabase Cloud,
-- où l'user postgres n'est pas owner du schéma système). Les
-- INSERT/UPDATE sur storage.buckets ci-dessus sont autorisés via la
-- politique storage par défaut.
