-- =====================================================
-- DIVARC — Migration 0015 : Rôle administrateur
-- =====================================================

-- 1. Colonne is_admin sur profiles
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create index if not exists profiles_is_admin_idx
  on public.profiles (is_admin)
  where is_admin = true;

-- 2. Helper : vérifier si l'utilisateur courant est admin
create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_current_user_admin() to authenticated;

-- 3. Vue agrégée des stats globales (admin only via les fonctions ci-dessous)
create or replace function public.admin_stats()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_current_user_admin() then
    raise exception 'forbidden';
  end if;

  select json_build_object(
    'profiles_total', (select count(*) from public.profiles),
    'profiles_new_7d', (
      select count(*) from public.profiles
       where created_at > now() - interval '7 days'
    ),
    'posts_total', (
      select count(*) from public.posts where deleted_at is null
    ),
    'listings_active', (
      select count(*) from public.listings where status = 'active'
    ),
    'jobs_active', (
      select count(*) from public.jobs where status = 'active'
    ),
    'stories_active', (
      select count(*) from public.stories where expires_at > now()
    ),
    'conversations_total', (
      select count(*) from public.conversations
    ),
    'messages_total', (
      select count(*) from public.messages where deleted_at is null
    ),
    'transfers_count', (
      select count(*) from public.transactions where type = 'transfer'
    ),
    'transfers_volume_eur', (
      select coalesce(sum(amount), 0)
        from public.transactions
       where type = 'transfer' and currency = 'EUR'
    )
  )
  into result;

  return result;
end;
$$;

grant execute on function public.admin_stats() to authenticated;

-- 4. RPC : lister les profils récents (admin only)
create or replace function public.admin_recent_users(items_limit integer default 50)
returns table (
  id uuid,
  email text,
  full_name text,
  username text,
  avatar_url text,
  founder_rank integer,
  is_admin boolean,
  onboarded_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'forbidden';
  end if;

  return query
    select
      p.id,
      au.email,
      p.full_name,
      p.username,
      p.avatar_url,
      p.founder_rank,
      p.is_admin,
      p.onboarded_at,
      p.created_at
    from public.profiles p
    left join auth.users au on au.id = p.id
    order by p.created_at desc
    limit items_limit;
end;
$$;

grant execute on function public.admin_recent_users(integer) to authenticated;
