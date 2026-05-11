-- =====================================================
-- DIVARC — Migration 0064 : Story Highlights (Profil v2 étape 2.2)
--
-- Highlights style Instagram : stories épinglées sur le profil, groupées
-- par thème. Une story peut appartenir à plusieurs highlights.
--
-- Tables :
--   - story_highlights : groupe (titre + cover + position)
--   - story_highlight_items : N-N (highlight ↔ story)
--
-- Behavior :
--   - Le user choisit cover_image_url (peut être l'image d'une story
--     incluse ou une image custom uploadée)
--   - Les stories incluses dans un highlight ne disparaissent PAS à
--     expiration (24h normal) — elles restent accessibles via le
--     highlight tant que ce dernier existe
--   - Suppression d'une story → CASCADE supprime ses entries dans items
--   - Suppression d'un highlight → ne supprime pas les stories (CASCADE
--     seulement sur l'item, pas sur la story réelle)
-- =====================================================

create table if not exists public.story_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  cover_image_url text not null
    check (cover_image_url ~* '^https?://'),
  /* Position pour réordonnancement (drag-drop). 0 = premier. */
  position integer not null default 0,
  /* Compteur dénormalisé : nb de stories incluses. Maintenu par trigger
     sur story_highlight_items. */
  items_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists story_highlights_user_idx
  on public.story_highlights (user_id, position);

-- Trigger : updated_at
drop trigger if exists story_highlights_set_updated_at on public.story_highlights;
create trigger story_highlights_set_updated_at
  before update on public.story_highlights
  for each row execute function public.set_updated_at();

-- Table N-N stories ↔ highlights
create table if not exists public.story_highlight_items (
  highlight_id uuid not null references public.story_highlights(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  /* Position de la story dans le highlight (ordre de lecture). */
  position integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (highlight_id, story_id)
);

create index if not exists story_highlight_items_highlight_idx
  on public.story_highlight_items (highlight_id, position);

create index if not exists story_highlight_items_story_idx
  on public.story_highlight_items (story_id);

-- Trigger : maintenir story_highlights.items_count
create or replace function public.bump_highlight_items_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.story_highlights
       set items_count = items_count + 1,
           updated_at = now()
     where id = new.highlight_id;
  elsif tg_op = 'DELETE' then
    update public.story_highlights
       set items_count = greatest(items_count - 1, 0),
           updated_at = now()
     where id = old.highlight_id;
  end if;
  return null;
end;
$$;

drop trigger if exists story_highlight_items_count_ins on public.story_highlight_items;
drop trigger if exists story_highlight_items_count_del on public.story_highlight_items;
create trigger story_highlight_items_count_ins
  after insert on public.story_highlight_items
  for each row execute function public.bump_highlight_items_count();
create trigger story_highlight_items_count_del
  after delete on public.story_highlight_items
  for each row execute function public.bump_highlight_items_count();

-- =====================================================
-- RLS
-- =====================================================
alter table public.story_highlights enable row level security;
alter table public.story_highlight_items enable row level security;

-- story_highlights : SELECT pour tout authenticated (sera filtré côté
-- profil par sections_visibility V12). INSERT/UPDATE/DELETE owner only.
drop policy if exists "highlights visible by everyone" on public.story_highlights;
create policy "highlights visible by everyone"
  on public.story_highlights for select
  using (true);

drop policy if exists "owner can manage highlights" on public.story_highlights;
create policy "owner can manage highlights"
  on public.story_highlights for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- story_highlight_items : visible si le highlight parent l'est + l'user
-- doit pouvoir voir la story (RLS de stories). On délègue.
drop policy if exists "items visible if highlight is" on public.story_highlight_items;
create policy "items visible if highlight is"
  on public.story_highlight_items for select
  using (
    exists (
      select 1 from public.story_highlights h
       where h.id = highlight_id
    )
  );

drop policy if exists "owner can manage highlight items" on public.story_highlight_items;
create policy "owner can manage highlight items"
  on public.story_highlight_items for all
  using (
    exists (
      select 1 from public.story_highlights h
       where h.id = highlight_id
         and h.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.story_highlights h
       where h.id = highlight_id
         and h.user_id = auth.uid()
    )
  );

-- =====================================================
-- RPC : liste les highlights d'un user avec leurs stories
-- =====================================================
create or replace function public.get_user_highlights_with_items(p_user_id uuid)
returns table (
  highlight_id uuid,
  title text,
  cover_image_url text,
  position integer,
  items_count integer,
  story_ids uuid[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    h.id as highlight_id,
    h.title,
    h.cover_image_url,
    h.position,
    h.items_count,
    coalesce(
      array_agg(i.story_id order by i.position)
        filter (where i.story_id is not null),
      array[]::uuid[]
    ) as story_ids
  from public.story_highlights h
  left join public.story_highlight_items i on i.highlight_id = h.id
  where h.user_id = p_user_id
  group by h.id
  order by h.position asc, h.created_at desc;
$$;

grant execute on function public.get_user_highlights_with_items(uuid)
  to authenticated;
