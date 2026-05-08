-- =====================================================
-- DIVARC — Migration 0018 : Présence WhatsApp-grade
--   - Statut online / away / offline
--   - Statut perso (available / busy / dnd / invisible)
--   - last_seen_at
--   - Visibilité (everyone / friends / nobody) + réciprocité
-- =====================================================

-- 1. Colonnes profil
alter table public.profiles
  add column if not exists presence_status text
    not null default 'offline'
    check (presence_status in ('online', 'away', 'offline')),
  add column if not exists last_seen_at timestamptz,
  add column if not exists custom_status text
    not null default 'available'
    check (custom_status in ('available', 'busy', 'dnd', 'invisible')),
  add column if not exists presence_visibility text
    not null default 'everyone'
    check (presence_visibility in ('everyone', 'friends', 'nobody'));

create index if not exists profiles_last_seen_idx
  on public.profiles (last_seen_at desc nulls last)
  where presence_status <> 'offline';

-- 2. Heartbeat — l'utilisateur signale son état
--    `presence_status` ∈ {online, away, offline}
create or replace function public.update_my_presence(new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth required';
  end if;
  if new_status not in ('online', 'away', 'offline') then
    raise exception 'invalid presence status: %', new_status;
  end if;

  update public.profiles
     set presence_status = new_status,
         last_seen_at = now()
   where id = auth.uid();
end;
$$;

grant execute on function public.update_my_presence(text) to authenticated;

-- 3. Lecture filtrée par règles de visibilité (utilisée pour 1 user)
--    Retourne null si la cible masque sa présence pour le viewer.
create or replace function public.get_visible_presence(target_user_id uuid)
returns table (
  user_id uuid,
  presence_status text,
  last_seen_at timestamptz,
  custom_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
  target_visibility text;
  target_custom text;
  viewer_visibility text;
begin
  if viewer is null then
    return;
  end if;

  -- Soi-même : tout est visible
  if viewer = target_user_id then
    return query
      select p.id, p.presence_status, p.last_seen_at, p.custom_status
        from public.profiles p
       where p.id = target_user_id;
    return;
  end if;

  select p.presence_visibility, p.custom_status
    into target_visibility, target_custom
    from public.profiles p
   where p.id = target_user_id;

  if target_visibility is null then
    return;
  end if;

  -- Réciprocité : si JE masque ma propre présence, je ne vois pas celle des autres
  -- (sauf de mes amis si je suis en mode "friends")
  select p.presence_visibility into viewer_visibility
    from public.profiles p
   where p.id = viewer;

  -- Cible "nobody" → invisible pour tout le monde sauf elle
  if target_visibility = 'nobody' then
    return;
  end if;

  -- Cible "friends" → visible uniquement par amis
  if target_visibility = 'friends' and not public.are_friends(viewer, target_user_id) then
    return;
  end if;

  -- Custom status "invisible" → online forcé à offline
  return query
    select p.id,
           case when p.custom_status = 'invisible'
                then 'offline'
                else p.presence_status end as presence_status,
           case when p.custom_status = 'invisible'
                then null
                else p.last_seen_at end as last_seen_at,
           p.custom_status
      from public.profiles p
     where p.id = target_user_id;
end;
$$;

grant execute on function public.get_visible_presence(uuid) to authenticated;

-- 4. Lecture batch (utilisée dans les listes : conversations, amis, feed authors)
--    Applique les mêmes règles, retourne 0..N lignes.
create or replace function public.get_visible_presence_batch(target_user_ids uuid[])
returns table (
  user_id uuid,
  presence_status text,
  last_seen_at timestamptz,
  custom_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  viewer uuid := auth.uid();
begin
  if viewer is null or target_user_ids is null then
    return;
  end if;

  return query
    with friends as (
      select case when f.requester_id = viewer then f.recipient_id
                  else f.requester_id end as friend_id
        from public.friendships f
       where f.status = 'accepted'
         and (f.requester_id = viewer or f.recipient_id = viewer)
    )
    select p.id,
           case when p.custom_status = 'invisible'
                then 'offline'
                else p.presence_status end,
           case when p.custom_status = 'invisible'
                then null
                else p.last_seen_at end,
           p.custom_status
      from public.profiles p
     where p.id = any(target_user_ids)
       and (
         p.id = viewer
         or p.presence_visibility = 'everyone'
         or (p.presence_visibility = 'friends'
             and exists (select 1 from friends fr where fr.friend_id = p.id))
       );
end;
$$;

grant execute on function public.get_visible_presence_batch(uuid[]) to authenticated;

-- 5. Maintenance : passer en offline les heartbeats expirés (> 90s sans nouvelle)
--    À appeler depuis un cron Supabase ou un Edge Function. Idempotent.
create or replace function public.expire_stale_presence()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.profiles
     set presence_status = 'offline'
   where presence_status <> 'offline'
     and (last_seen_at is null or last_seen_at < now() - interval '90 seconds');
  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.expire_stale_presence() to service_role;
