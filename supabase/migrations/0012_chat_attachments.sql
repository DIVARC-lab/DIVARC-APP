-- =====================================================
-- DIVARC — Migration 0012 : Pièces jointes dans le chat
-- =====================================================

-- 1. Ajouter les colonnes attachment_* à messages
alter table public.messages
  add column if not exists attachment_url text,
  add column if not exists attachment_type text
    check (attachment_type is null or attachment_type in ('image', 'audio', 'file', 'video')),
  add column if not exists attachment_name text
    check (attachment_name is null or char_length(attachment_name) <= 200),
  add column if not exists attachment_size integer
    check (attachment_size is null or attachment_size >= 0),
  add column if not exists attachment_width integer,
  add column if not exists attachment_height integer;

-- 2. Relâcher la contrainte body : un message peut être texte OU pièce jointe (ou les deux)
alter table public.messages
  alter column body drop not null;

alter table public.messages
  drop constraint if exists messages_body_check;

alter table public.messages
  drop constraint if exists messages_must_have_content;
alter table public.messages
  add constraint messages_must_have_content check (
    (body is not null and char_length(body) between 1 and 4000)
    or attachment_url is not null
  );

-- 3. Storage bucket chat-media
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

drop policy if exists "chat media publicly readable" on storage.objects;
create policy "chat media publicly readable"
  on storage.objects for select
  using (bucket_id = 'chat-media');

drop policy if exists "users upload own chat media" on storage.objects;
create policy "users upload own chat media"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users delete own chat media" on storage.objects;
create policy "users delete own chat media"
  on storage.objects for delete
  using (
    bucket_id = 'chat-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
