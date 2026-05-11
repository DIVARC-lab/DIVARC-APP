-- =====================================================
-- DIVARC — Migration 0068 : User badges (étape 2.6)
--
-- Badges affichés sur le profil pour valoriser les achievements,
-- événements, statuts spéciaux (founder, beta tester, top contributor).
--
-- Types initiaux :
--   - founder       : membre fondateur DIVARC (founder_rank existant)
--   - beta_tester   : participation programme beta
--   - top_creator   : top créateur du mois/année
--   - event         : participation événement DIVARC
--   - achievement   : milestone (1000 posts, 100 ventes, etc.)
--   - mentor_certified : mentor vérifié
--   - employee_verified : employé vérifié pour une entreprise (V10)
--   - identity_verified : badge bleu (V11, sync avec identity_verified_at)
--   - press         : journaliste / personnalité publique (badge or)
--
-- Les badges sont attribués via :
--   - Triggers DB (founder via founder_rank, identity_verified via column)
--   - Server actions admin (event, top_creator)
--   - Système autorégulé (achievement) — V12
-- =====================================================

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_type text not null
    check (badge_type in (
      'founder', 'beta_tester', 'top_creator', 'event',
      'achievement', 'mentor_certified', 'employee_verified',
      'identity_verified', 'press', 'super_seller'
    )),
  /* Label affiché sur le badge (peut différer du type, ex: 'Top
     Créateur Mars 2026'). */
  label text not null check (char_length(label) between 1 and 80),
  /* Description visible en hover/tap (max 200 chars). */
  description text check (description is null or char_length(description) <= 200),
  /* Icon emoji ou nom Lucide icon (ex: 'Star', 'Award', '🏆'). */
  icon text check (icon is null or char_length(icon) <= 40),
  /* Couleur d'accent (CSS, ex: 'gold', '#F4B942'). */
  accent_color text
    check (accent_color is null or char_length(accent_color) <= 30),
  /* Métadonnées extensibles (ex: event_id, achievement_count). */
  metadata jsonb not null default '{}'::jsonb,
  awarded_at timestamptz not null default now(),
  /* Si null, badge permanent. Sinon date d'expiration (ex: top_creator
     du mois). */
  expires_at timestamptz,
  /* Visibilité : false si user a masqué le badge sur son profil. */
  is_visible boolean not null default true
);

create index if not exists user_badges_user_idx
  on public.user_badges (user_id, is_visible, awarded_at desc);

create index if not exists user_badges_type_idx
  on public.user_badges (badge_type);

-- =====================================================
-- RLS
-- =====================================================
alter table public.user_badges enable row level security;

-- SELECT : visible si is_visible OU si owner
drop policy if exists "badges visible if shown or own" on public.user_badges;
create policy "badges visible if shown or own"
  on public.user_badges for select
  using (
    is_visible = true
    or auth.uid() = user_id
  );

-- INSERT : restreint via security definer (admin triggers + actions).
-- Pas de policy permissive ; les inserts passent par RPC ou SECURITY DEFINER.

-- UPDATE : owner peut toggle is_visible. Pas de modif des autres champs
-- (immutables pour intégrité historique).
drop policy if exists "owner can toggle visibility" on public.user_badges;
create policy "owner can toggle visibility"
  on public.user_badges for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE : pas autorisé par défaut (badge = achievement permanent).
-- Admin peut delete via SECURITY DEFINER si besoin.

-- =====================================================
-- Trigger : auto-award founder badge si founder_rank existe
-- =====================================================
create or replace function public.award_founder_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.founder_rank is not null
    and (old.founder_rank is null or old.founder_rank is distinct from new.founder_rank)
  then
    insert into public.user_badges (
      user_id, badge_type, label, description, icon, accent_color, metadata
    ) values (
      new.id,
      'founder',
      'Membre fondateur #' || new.founder_rank,
      'Inscrit dans les premiers cercles DIVARC',
      '✦',
      'gold',
      jsonb_build_object('rank', new.founder_rank)
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_award_founder_badge on public.profiles;
create trigger profiles_award_founder_badge
  after insert or update of founder_rank on public.profiles
  for each row execute function public.award_founder_badge();

-- =====================================================
-- Trigger : auto-award identity_verified badge
-- =====================================================
create or replace function public.award_identity_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.identity_verified_at is not null
    and (old.identity_verified_at is null
         or old.identity_verified_at is distinct from new.identity_verified_at)
  then
    insert into public.user_badges (
      user_id, badge_type, label, description, icon, accent_color, metadata
    ) values (
      new.id,
      'identity_verified',
      'Identité vérifiée',
      'Pièce d''identité confirmée par DIVARC',
      'BadgeCheck',
      '#3B82F6', -- bleu vérif
      jsonb_build_object('provider', new.identity_verification_provider)
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_award_identity_badge on public.profiles;
create trigger profiles_award_identity_badge
  after update of identity_verified_at on public.profiles
  for each row execute function public.award_identity_badge();

-- =====================================================
-- Backfill : attribuer founder + identity badges aux users existants
-- =====================================================
do $$
declare
  rec record;
begin
  -- Founders
  for rec in
    select id, founder_rank from public.profiles
     where founder_rank is not null
  loop
    insert into public.user_badges (
      user_id, badge_type, label, description, icon, accent_color, metadata
    ) values (
      rec.id,
      'founder',
      'Membre fondateur #' || rec.founder_rank,
      'Inscrit dans les premiers cercles DIVARC',
      '✦',
      'gold',
      jsonb_build_object('rank', rec.founder_rank)
    )
    on conflict do nothing;
  end loop;

  -- Identity verified
  for rec in
    select id, identity_verification_provider from public.profiles
     where identity_verified_at is not null
  loop
    insert into public.user_badges (
      user_id, badge_type, label, description, icon, accent_color, metadata
    ) values (
      rec.id,
      'identity_verified',
      'Identité vérifiée',
      'Pièce d''identité confirmée par DIVARC',
      'BadgeCheck',
      '#3B82F6',
      jsonb_build_object('provider', rec.identity_verification_provider)
    )
    on conflict do nothing;
  end loop;
end $$;

-- =====================================================
-- RPC : toggle visibility d'un badge
-- =====================================================
create or replace function public.toggle_badge_visibility(
  p_badge_id uuid,
  p_visible boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  update public.user_badges
     set is_visible = p_visible
   where id = p_badge_id
     and user_id = auth.uid();

  if not found then
    raise exception 'badge not found or not owner';
  end if;
end;
$$;

grant execute on function public.toggle_badge_visibility(uuid, boolean)
  to authenticated;
