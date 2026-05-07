-- =====================================================
-- DIVARC — Migration 0010 : Stories (24h ephemeral)
-- =====================================================

-- 1. stories table
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('photo', 'text')),
  photo_url text,
  caption text check (caption is null or char_length(caption) <= 280),
  background text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint photo_requires_url check (
    (type = 'photo' and photo_url is not null)
    or type = 'text'
  ),
  constraint text_requires_content check (
    (type = 'text' and (caption is not null or background is not null))
    or type = 'photo'
  )
);

create index if not exists stories_author_id_created_at_idx
  on public.stories (author_id, created_at desc);

create index if not exists stories_expires_at_idx
  on public.stories (expires_at);

-- 2. story_views
create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create index if not exists story_views_viewer_id_idx
  on public.story_views (viewer_id);

-- 3. RLS — stories
alter table public.stories enable row level security;

drop policy if exists "stories visible to author and friends" on public.stories;
create policy "stories visible to author and friends"
  on public.stories for select
  using (
    expires_at > now()
    and (
      author_id = auth.uid()
      or public.are_friends(author_id, auth.uid())
    )
  );

drop policy if exists "owner can insert story" on public.stories;
create policy "owner can insert story"
  on public.stories for insert
  with check (author_id = auth.uid());

drop policy if exists "owner can delete story" on public.stories;
create policy "owner can delete story"
  on public.stories for delete
  using (author_id = auth.uid());

-- 4. RLS — story_views
alter table public.story_views enable row level security;

drop policy if exists "viewer or story author can read views" on public.story_views;
create policy "viewer or story author can read views"
  on public.story_views for select
  using (
    viewer_id = auth.uid()
    or exists (
      select 1 from public.stories
       where id = story_id and author_id = auth.uid()
    )
  );

drop policy if exists "users record their own views" on public.story_views;
create policy "users record their own views"
  on public.story_views for insert
  with check (viewer_id = auth.uid());

-- 5. Storage bucket
insert into storage.buckets (id, name, public)
values ('stories', 'stories', true)
on conflict (id) do nothing;

drop policy if exists "story photos publicly readable" on storage.objects;
create policy "story photos publicly readable"
  on storage.objects for select
  using (bucket_id = 'stories');

drop policy if exists "users upload own story photos" on storage.objects;
create policy "users upload own story photos"
  on storage.objects for insert
  with check (
    bucket_id = 'stories'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users delete own story photos" on storage.objects;
create policy "users delete own story photos"
  on storage.objects for delete
  using (
    bucket_id = 'stories'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. Realtime (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'stories'
  ) then
    alter publication supabase_realtime add table public.stories;
  end if;
end $$;
