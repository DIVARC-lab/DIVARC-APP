-- =====================================================
-- DIVARC — Migration 0028 : Cercles (communautés persistantes)
--   - Différent des group conversations (0013) : ce sont
--     des communautés nommées avec membres, public/privé,
--     proches du quartier ou centres d'intérêt.
--   - V1 : créer, rejoindre, quitter, lister, voir membres.
--   - À venir : events, posts, pinned, invitations, modos.
-- =====================================================

-- 1. circles table
create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$'),
  name text not null
    check (char_length(name) between 2 and 80),
  description text
    check (description is null or char_length(description) <= 500),
  emoji text
    check (emoji is null or char_length(emoji) <= 8),
  /* Tailwind color token (e.g. 'gold', 'navy', 'emerald') used for
     the avatar tile background. NULL = default 'gold'. */
  color text
    check (color is null or color in (
      'gold', 'navy', 'emerald', 'rose', 'violet', 'cream'
    )),
  is_private boolean not null default false,
  owner_id uuid not null references auth.users(id) on delete cascade,
  members_count integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists circles_owner_id_idx
  on public.circles (owner_id);

create index if not exists circles_created_at_idx
  on public.circles (created_at desc);

-- 2. circle_members table
create table if not exists public.circle_members (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('admin', 'mod', 'member')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create index if not exists circle_members_user_id_idx
  on public.circle_members (user_id);

-- 3. Helper : is_circle_member
create or replace function public.is_circle_member(
  p_circle_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.circle_members
     where circle_id = p_circle_id and user_id = p_user_id
  );
$$;

grant execute on function public.is_circle_member(uuid, uuid) to authenticated;

-- 4. Trigger : ajouter le owner comme admin à la création
create or replace function public.add_circle_owner_as_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.circle_members (circle_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict (circle_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists circles_add_owner_admin on public.circles;
create trigger circles_add_owner_admin
  after insert on public.circles
  for each row execute function public.add_circle_owner_as_admin();

-- 5. Trigger : maintenir members_count
create or replace function public.bump_circle_members_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.circles
       set members_count = members_count + 1
     where id = new.circle_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.circles
       set members_count = greatest(members_count - 1, 0)
     where id = old.circle_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists circle_members_bump_count on public.circle_members;
create trigger circle_members_bump_count
  after insert or delete on public.circle_members
  for each row execute function public.bump_circle_members_count();

-- 6. RLS — circles
alter table public.circles enable row level security;

drop policy if exists "circles publicly readable or by members" on public.circles;
create policy "circles publicly readable or by members"
  on public.circles for select
  using (
    not is_private
    or owner_id = auth.uid()
    or public.is_circle_member(id, auth.uid())
  );

drop policy if exists "users can create circles" on public.circles;
create policy "users can create circles"
  on public.circles for insert
  with check (owner_id = auth.uid());

drop policy if exists "owner updates circle" on public.circles;
create policy "owner updates circle"
  on public.circles for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "owner deletes circle" on public.circles;
create policy "owner deletes circle"
  on public.circles for delete
  using (owner_id = auth.uid());

-- 7. RLS — circle_members
alter table public.circle_members enable row level security;

drop policy if exists "members visible to anyone for public circles" on public.circle_members;
create policy "members visible to anyone for public circles"
  on public.circle_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.circles c
       where c.id = circle_id
         and (
           not c.is_private
           or c.owner_id = auth.uid()
           or public.is_circle_member(c.id, auth.uid())
         )
    )
  );

drop policy if exists "users join public circles" on public.circle_members;
create policy "users join public circles"
  on public.circle_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.circles c
       where c.id = circle_id
         and not c.is_private
    )
  );

drop policy if exists "users leave a circle" on public.circle_members;
create policy "users leave a circle"
  on public.circle_members for delete
  using (
    user_id = auth.uid()
    /* owner peut pas se retirer d'office (il doit transférer
       l'owner avant — feature future). */
    and not exists (
      select 1 from public.circles c
       where c.id = circle_id and c.owner_id = auth.uid()
    )
  );
