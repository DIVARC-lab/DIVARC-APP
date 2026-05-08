-- =====================================================
-- DIVARC — Migration 0025 : Bookmarks + Collections
--   Système Instagram-like : sauvegarder un post pour y revenir.
--   Collections optionnelles pour organiser (« À lire », « Idées », etc.).
-- =====================================================

-- =========================================================
-- 1. post_collections : dossiers de l'utilisateur
--    Une collection par défaut (sans nom) est implicite — pas de row
--    requise pour bookmarker.
-- =========================================================
create table if not exists public.post_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  emoji text check (emoji is null or char_length(emoji) between 1 and 8),
  is_private boolean not null default true,
  bookmarks_count integer not null default 0,
  position_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists post_collections_user_idx
  on public.post_collections (user_id, position_order);

-- =========================================================
-- 2. post_bookmarks : (post, user) avec collection optionnelle
-- =========================================================
create table if not exists public.post_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  collection_id uuid references public.post_collections(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists post_bookmarks_user_created_idx
  on public.post_bookmarks (user_id, created_at desc);
create index if not exists post_bookmarks_collection_idx
  on public.post_bookmarks (collection_id, created_at desc)
  where collection_id is not null;

-- =========================================================
-- 3. Trigger compteur bookmarks_count par collection
-- =========================================================
create or replace function public.bump_collection_bookmarks_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.collection_id is not null then
    update public.post_collections
       set bookmarks_count = bookmarks_count + 1
     where id = new.collection_id;
  elsif tg_op = 'DELETE' and old.collection_id is not null then
    update public.post_collections
       set bookmarks_count = greatest(bookmarks_count - 1, 0)
     where id = old.collection_id;
  elsif tg_op = 'UPDATE' and new.collection_id is distinct from old.collection_id then
    if old.collection_id is not null then
      update public.post_collections
         set bookmarks_count = greatest(bookmarks_count - 1, 0)
       where id = old.collection_id;
    end if;
    if new.collection_id is not null then
      update public.post_collections
         set bookmarks_count = bookmarks_count + 1
       where id = new.collection_id;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists post_bookmarks_collection_count_ins on public.post_bookmarks;
drop trigger if exists post_bookmarks_collection_count_del on public.post_bookmarks;
drop trigger if exists post_bookmarks_collection_count_upd on public.post_bookmarks;
create trigger post_bookmarks_collection_count_ins
  after insert on public.post_bookmarks
  for each row execute function public.bump_collection_bookmarks_count();
create trigger post_bookmarks_collection_count_del
  after delete on public.post_bookmarks
  for each row execute function public.bump_collection_bookmarks_count();
create trigger post_bookmarks_collection_count_upd
  after update on public.post_bookmarks
  for each row execute function public.bump_collection_bookmarks_count();

-- =========================================================
-- 4. RLS — collections + bookmarks
-- =========================================================

alter table public.post_collections enable row level security;
alter table public.post_bookmarks enable row level security;

-- Collections privées : visibles seulement par leur owner.
-- Collections publiques : lecture par tous (auth).
drop policy if exists "owner reads collections" on public.post_collections;
create policy "owner reads collections"
  on public.post_collections for select
  using (user_id = auth.uid() or is_private = false);

drop policy if exists "owner writes collections" on public.post_collections;
create policy "owner writes collections"
  on public.post_collections for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Bookmarks toujours privés.
drop policy if exists "users see own bookmarks" on public.post_bookmarks;
create policy "users see own bookmarks"
  on public.post_bookmarks for select
  using (user_id = auth.uid());

drop policy if exists "users write own bookmarks" on public.post_bookmarks;
create policy "users write own bookmarks"
  on public.post_bookmarks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =========================================================
-- 5. Realtime
-- =========================================================
do $$
declare
  t text;
begin
  foreach t in array array['post_collections', 'post_bookmarks'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;
