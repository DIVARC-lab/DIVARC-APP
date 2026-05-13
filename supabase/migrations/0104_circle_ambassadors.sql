-- Chantier 5.4 — Système d'ambassadeurs par cercle.
--
-- Track les invitations acceptées par user/cercle pour débloquer des
-- badges progressifs :
--   5 invités  → "Connecteur"
--   10 invités → "Ambassadeur"
--   25 invités → "Champion"
--   50 invités → "Co-fondateur communautaire" (peut être nommé modo auto)
--
-- L'incrémentation se fait depuis acceptCircleInvitation (server action)
-- qui appelle bump_ambassador_count via RPC SECURITY DEFINER.
--
-- IDEMPOTENT.

create table if not exists public.circle_ambassador_rewards (
  user_id uuid not null references auth.users(id) on delete cascade,
  circle_id uuid not null references public.circles(id) on delete cascade,

  invitations_sent integer not null default 0 check (invitations_sent >= 0),
  invitations_accepted integer not null default 0 check (invitations_accepted >= 0),

  /* Badges débloqués (jsonb pour évolutivité simple). Schéma :
   *   { "connector": "2026-01-15T...", "ambassador": null, ... } */
  badges jsonb not null default '{}'::jsonb,

  /* Niveau ambassadeur calculé (1-4 ou 0 si aucun badge). */
  current_level integer not null default 0 check (current_level between 0 and 4),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (user_id, circle_id)
);

create index if not exists circle_ambassador_user_idx
  on public.circle_ambassador_rewards (user_id);

create index if not exists circle_ambassador_top_idx
  on public.circle_ambassador_rewards (circle_id, invitations_accepted desc)
  where invitations_accepted > 0;

alter table public.circle_ambassador_rewards enable row level security;

drop policy if exists "ambassador_rewards readable to all members"
  on public.circle_ambassador_rewards;
create policy "ambassador_rewards readable to all members"
  on public.circle_ambassador_rewards for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_ambassador_rewards.circle_id
         and m.user_id = auth.uid()
         and m.status = 'active'
    )
  );

drop trigger if exists circle_ambassador_set_updated_at
  on public.circle_ambassador_rewards;
create trigger circle_ambassador_set_updated_at
  before update on public.circle_ambassador_rewards
  for each row execute function public.set_updated_at();

-- =====================================================
-- RPC bump_ambassador_count
-- =====================================================
--
-- Appelée depuis acceptCircleInvitation quand un user rejoint via un
-- lien d'invitation. Incrémente invitations_accepted du créateur du
-- lien et débloque les badges éventuellement.

create or replace function public.bump_ambassador_count(
  p_inviter_user_id uuid,
  p_circle_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_badges jsonb;
  v_now text := now()::text;
  v_level integer;
begin
  /* Upsert. */
  insert into public.circle_ambassador_rewards (
    user_id, circle_id, invitations_accepted
  ) values (p_inviter_user_id, p_circle_id, 1)
  on conflict (user_id, circle_id)
  do update set invitations_accepted = circle_ambassador_rewards.invitations_accepted + 1;

  /* Lit le nouveau count + badges. */
  select invitations_accepted, badges
    into v_count, v_badges
    from public.circle_ambassador_rewards
   where user_id = p_inviter_user_id and circle_id = p_circle_id;

  /* Débloque les badges progressivement. */
  if v_count >= 5 and not (v_badges ? 'connector') then
    v_badges := v_badges || jsonb_build_object('connector', v_now);
    v_level := 1;
  end if;
  if v_count >= 10 and not (v_badges ? 'ambassador') then
    v_badges := v_badges || jsonb_build_object('ambassador', v_now);
    v_level := 2;
  end if;
  if v_count >= 25 and not (v_badges ? 'champion') then
    v_badges := v_badges || jsonb_build_object('champion', v_now);
    v_level := 3;
  end if;
  if v_count >= 50 and not (v_badges ? 'cofounder') then
    v_badges := v_badges || jsonb_build_object('cofounder', v_now);
    v_level := 4;
  end if;

  if v_level is not null then
    update public.circle_ambassador_rewards
       set badges = v_badges,
           current_level = greatest(current_level, v_level)
     where user_id = p_inviter_user_id and circle_id = p_circle_id;
  end if;
end;
$$;

grant execute on function public.bump_ambassador_count(uuid, uuid)
  to authenticated;

comment on table public.circle_ambassador_rewards is
  'Compteur invitations acceptées par user/cercle + badges progressifs.';
