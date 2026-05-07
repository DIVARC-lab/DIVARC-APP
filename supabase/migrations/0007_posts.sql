-- =====================================================
-- DIVARC — Migration 0007 : Posts & Feed
-- =====================================================

-- 1. posts table
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  body text check (body is null or char_length(body) <= 4000),
  visibility text not null default 'friends'
    check (visibility in ('public', 'friends', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists posts_author_id_created_at_idx
  on public.posts (author_id, created_at desc);

create index if not exists posts_created_at_idx
  on public.posts (created_at desc)
  where deleted_at is null;

-- 2. post_photos
create table if not exists public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists post_photos_post_id_position_idx
  on public.post_photos (post_id, position);

-- 3. post_likes
create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_post_id_idx
  on public.post_likes (post_id);

-- 4. post_comments
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists post_comments_post_id_created_at_idx
  on public.post_comments (post_id, created_at asc);

-- 5. helper: can current user see post ?
create or replace function public.can_view_post(post_row public.posts)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case
    when post_row.deleted_at is not null then post_row.author_id = auth.uid()
    when post_row.author_id = auth.uid() then true
    when post_row.visibility = 'public' then auth.uid() is not null
    when post_row.visibility = 'friends' then public.are_friends(post_row.author_id, auth.uid())
    when post_row.visibility = 'private' then false
    else false
  end;
$$;

grant execute on function public.can_view_post(public.posts) to authenticated;

-- 6. RLS — posts
alter table public.posts enable row level security;

drop policy if exists "posts visible per visibility rules" on public.posts;
create policy "posts visible per visibility rules"
  on public.posts for select
  using (
    deleted_at is null and (
      author_id = auth.uid()
      or visibility = 'public'
      or (visibility = 'friends' and public.are_friends(author_id, auth.uid()))
    )
  );

drop policy if exists "owner can insert post" on public.posts;
create policy "owner can insert post"
  on public.posts for insert
  with check (author_id = auth.uid());

drop policy if exists "owner can update post" on public.posts;
create policy "owner can update post"
  on public.posts for update
  using (author_id = auth.uid());

drop policy if exists "owner can delete post" on public.posts;
create policy "owner can delete post"
  on public.posts for delete
  using (author_id = auth.uid());

-- 7. RLS — post_photos
alter table public.post_photos enable row level security;

drop policy if exists "photos follow post visibility" on public.post_photos;
create policy "photos follow post visibility"
  on public.post_photos for select
  using (
    exists (
      select 1 from public.posts p
       where p.id = post_id
         and p.deleted_at is null
         and (
           p.author_id = auth.uid()
           or p.visibility = 'public'
           or (p.visibility = 'friends' and public.are_friends(p.author_id, auth.uid()))
         )
    )
  );

drop policy if exists "owner can insert photos" on public.post_photos;
create policy "owner can insert photos"
  on public.post_photos for insert
  with check (
    exists (
      select 1 from public.posts where id = post_id and author_id = auth.uid()
    )
  );

drop policy if exists "owner can delete photos" on public.post_photos;
create policy "owner can delete photos"
  on public.post_photos for delete
  using (
    exists (
      select 1 from public.posts where id = post_id and author_id = auth.uid()
    )
  );

-- 8. RLS — post_likes
alter table public.post_likes enable row level security;

drop policy if exists "likes visible if post visible" on public.post_likes;
create policy "likes visible if post visible"
  on public.post_likes for select
  using (
    exists (
      select 1 from public.posts p
       where p.id = post_id
         and p.deleted_at is null
         and (
           p.author_id = auth.uid()
           or p.visibility = 'public'
           or (p.visibility = 'friends' and public.are_friends(p.author_id, auth.uid()))
         )
    )
  );

drop policy if exists "users like own" on public.post_likes;
create policy "users like own"
  on public.post_likes for insert
  with check (user_id = auth.uid());

drop policy if exists "users unlike own" on public.post_likes;
create policy "users unlike own"
  on public.post_likes for delete
  using (user_id = auth.uid());

-- 9. RLS — post_comments
alter table public.post_comments enable row level security;

drop policy if exists "comments visible if post visible" on public.post_comments;
create policy "comments visible if post visible"
  on public.post_comments for select
  using (
    deleted_at is null
    and exists (
      select 1 from public.posts p
       where p.id = post_id
         and p.deleted_at is null
         and (
           p.author_id = auth.uid()
           or p.visibility = 'public'
           or (p.visibility = 'friends' and public.are_friends(p.author_id, auth.uid()))
         )
    )
  );

drop policy if exists "users can insert own comments" on public.post_comments;
create policy "users can insert own comments"
  on public.post_comments for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.posts p
       where p.id = post_id
         and p.deleted_at is null
         and (
           p.author_id = auth.uid()
           or p.visibility = 'public'
           or (p.visibility = 'friends' and public.are_friends(p.author_id, auth.uid()))
         )
    )
  );

drop policy if exists "users can update own comments" on public.post_comments;
create policy "users can update own comments"
  on public.post_comments for update
  using (author_id = auth.uid());

drop policy if exists "users can delete own comments" on public.post_comments;
create policy "users can delete own comments"
  on public.post_comments for delete
  using (author_id = auth.uid());

-- 10. updated_at trigger
drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- 11. Storage bucket pour les photos de posts
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

drop policy if exists "post photos publicly readable" on storage.objects;
create policy "post photos publicly readable"
  on storage.objects for select
  using (bucket_id = 'posts');

drop policy if exists "users upload own post photos" on storage.objects;
create policy "users upload own post photos"
  on storage.objects for insert
  with check (
    bucket_id = 'posts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users update own post photos" on storage.objects;
create policy "users update own post photos"
  on storage.objects for update
  using (
    bucket_id = 'posts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users delete own post photos" on storage.objects;
create policy "users delete own post photos"
  on storage.objects for delete
  using (
    bucket_id = 'posts'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 12. Triggers de notification

-- Like reçu
create or replace function public.notify_post_liked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  liker_name text;
begin
  select author_id into post_author
    from public.posts
   where id = new.post_id;

  if post_author is null or post_author = new.user_id then
    return new;
  end if;

  select coalesce(full_name, username, 'Quelqu''un') into liker_name
    from public.profiles
   where id = new.user_id;

  insert into public.notifications (
    user_id, type, title, body,
    related_user_id, href
  ) values (
    post_author,
    'system',
    liker_name || ' aime ton post',
    null,
    new.user_id,
    '/feed/' || new.post_id::text
  );

  return new;
end;
$$;

drop trigger if exists notify_post_liked_trg on public.post_likes;
create trigger notify_post_liked_trg
  after insert on public.post_likes
  for each row execute function public.notify_post_liked();

-- Commentaire reçu
create or replace function public.notify_post_commented()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
  commenter_name text;
  preview text;
begin
  select author_id into post_author
    from public.posts
   where id = new.post_id;

  if post_author is null or post_author = new.author_id then
    return new;
  end if;

  select coalesce(full_name, username, 'Quelqu''un') into commenter_name
    from public.profiles
   where id = new.author_id;

  preview := substring(new.body from 1 for 140);
  if char_length(new.body) > 140 then
    preview := preview || '…';
  end if;

  insert into public.notifications (
    user_id, type, title, body,
    related_user_id, href
  ) values (
    post_author,
    'system',
    commenter_name || ' a commenté ton post',
    preview,
    new.author_id,
    '/feed/' || new.post_id::text
  );

  return new;
end;
$$;

drop trigger if exists notify_post_commented_trg on public.post_comments;
create trigger notify_post_commented_trg
  after insert on public.post_comments
  for each row execute function public.notify_post_commented();

-- 13. Realtime (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'post_likes'
  ) then
    alter publication supabase_realtime add table public.post_likes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'post_comments'
  ) then
    alter publication supabase_realtime add table public.post_comments;
  end if;
end $$;
