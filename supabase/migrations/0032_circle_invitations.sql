-- =====================================================
-- DIVARC — Migration 0032 : Invitations de cercle (V5)
--   - Permet aux admin/mod de générer des liens d'invitation
--     pour rejoindre un cercle (publique OU privé).
--   - Token unique URL-safe.
--   - Optionnel : limite d'usages, date d'expiration.
--   - Une RPC dédiée gère le join via token, qui contourne
--     la policy RLS "users join public circles" (utilisable
--     même pour les cercles privés).
-- =====================================================

-- 1. circle_invitations
create table if not exists public.circle_invitations (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  token text not null unique
    check (char_length(token) between 16 and 64 and token ~ '^[A-Za-z0-9_-]+$'),
  created_by uuid not null references auth.users(id) on delete cascade,
  max_uses integer
    check (max_uses is null or max_uses between 1 and 1000),
  uses integer not null default 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists circle_invitations_circle_id_idx
  on public.circle_invitations (circle_id);

create unique index if not exists circle_invitations_token_lookup_idx
  on public.circle_invitations (token)
  where revoked_at is null;

-- 2. RLS — circle_invitations
alter table public.circle_invitations enable row level security;

drop policy if exists "invitations visible to mods + creator" on public.circle_invitations;
create policy "invitations visible to mods + creator"
  on public.circle_invitations for select
  using (
    created_by = auth.uid()
    or public.can_moderate_circle(circle_id, auth.uid())
  );

drop policy if exists "mods create invitations" on public.circle_invitations;
create policy "mods create invitations"
  on public.circle_invitations for insert
  with check (
    created_by = auth.uid()
    and public.can_moderate_circle(circle_id, auth.uid())
  );

drop policy if exists "mods revoke invitations" on public.circle_invitations;
create policy "mods revoke invitations"
  on public.circle_invitations for update
  using (public.can_moderate_circle(circle_id, auth.uid()))
  with check (public.can_moderate_circle(circle_id, auth.uid()));

drop policy if exists "mods delete invitations" on public.circle_invitations;
create policy "mods delete invitations"
  on public.circle_invitations for delete
  using (public.can_moderate_circle(circle_id, auth.uid()));

-- 3. RPC publique : preview d'une invitation (sans révéler les autres)
--    Anyone (auth) peut preview un cercle via un token valide,
--    même un cercle privé. Ne révèle que le minimum.
create or replace function public.preview_circle_invitation(p_token text)
returns table (
  circle_id uuid,
  slug text,
  name text,
  description text,
  emoji text,
  color text,
  is_private boolean,
  members_count integer,
  invitation_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return query
  select
    c.id          as circle_id,
    c.slug        as slug,
    c.name        as name,
    c.description as description,
    c.emoji       as emoji,
    c.color       as color,
    c.is_private  as is_private,
    c.members_count as members_count,
    i.id          as invitation_id,
    i.expires_at  as expires_at
  from public.circle_invitations i
  join public.circles c on c.id = i.circle_id
  where i.token = p_token
    and i.revoked_at is null
    and (i.expires_at is null or i.expires_at > now())
    and (i.max_uses is null or i.uses < i.max_uses)
  limit 1;
end;
$$;

grant execute on function public.preview_circle_invitation(text) to authenticated;

-- 4. RPC : accepter une invitation et rejoindre le cercle
create or replace function public.accept_circle_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv record;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select i.id, i.circle_id, i.max_uses, i.uses, i.expires_at, i.revoked_at
    into inv
    from public.circle_invitations i
   where i.token = p_token
   limit 1;

  if not found then
    raise exception 'invitation introuvable';
  end if;
  if inv.revoked_at is not null then
    raise exception 'invitation révoquée';
  end if;
  if inv.expires_at is not null and inv.expires_at <= now() then
    raise exception 'invitation expirée';
  end if;
  if inv.max_uses is not null and inv.uses >= inv.max_uses then
    raise exception 'invitation épuisée';
  end if;

  /* Idempotent : déjà membre, on incrémente quand même les uses pas. */
  insert into public.circle_members (circle_id, user_id, role)
  values (inv.circle_id, uid, 'member')
  on conflict (circle_id, user_id) do nothing;

  /* Incrémenter uses uniquement si on a effectivement rejoint (pas un re-clic). */
  if found then
    update public.circle_invitations
       set uses = uses + 1
     where id = inv.id;
  end if;

  return inv.circle_id;
end;
$$;

grant execute on function public.accept_circle_invitation(text) to authenticated;
