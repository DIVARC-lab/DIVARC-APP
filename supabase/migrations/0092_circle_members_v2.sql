-- Chantier 1.2 — circle_members v2 (extension additive, aucune breaking change).
--
-- Étend la table circle_members avec :
--   - rôles enrichis : owner / admin / moderator (legacy 'mod' alias) /
--     ambassador / contributor / member
--   - statut : active / pending_approval / pending_invite / left / banned
--   - activité agrégée : last_active_at, posts_count, comments_count, reactions
--   - personnalisation par membre : nickname, badge, custom_role_color
--   - notifications granulaires (jsonb par cercle)
--   - subscription pour cercles payants (chantier 4 monétisation)
--   - modération par cercle : is_muted/muted_until, warnings, is_banned/ban_reason
--
-- IDEMPOTENT.

-- =====================================================
-- 1. Étendre la CHECK des rôles
-- =====================================================
--
-- Legacy 'mod' reste accepté (alias de 'moderator') pour pas casser les rows
-- existants. Le code applicatif unifiera via mapping.

alter table public.circle_members
  drop constraint if exists circle_members_role_check;
alter table public.circle_members
  add constraint circle_members_role_check
  check (role in (
    'owner',
    'admin',
    'moderator',
    'mod',           -- legacy alias
    'ambassador',
    'contributor',
    'member'
  ));

-- =====================================================
-- 2. Statut (workflow d'adhésion)
-- =====================================================

alter table public.circle_members
  add column if not exists status text not null default 'active';
alter table public.circle_members
  drop constraint if exists circle_members_status_check;
alter table public.circle_members
  add constraint circle_members_status_check
  check (status in (
    'active',
    'pending_approval',  -- demande en attente de validation admin
    'pending_invite',    -- invité non encore accepté
    'left',
    'banned'
  ));

-- =====================================================
-- 3. Activité agrégée (compteurs recalculés async)
-- =====================================================

alter table public.circle_members
  add column if not exists last_active_at timestamptz not null default now();

alter table public.circle_members
  add column if not exists posts_count integer not null default 0
    check (posts_count >= 0);

alter table public.circle_members
  add column if not exists comments_count integer not null default 0
    check (comments_count >= 0);

alter table public.circle_members
  add column if not exists reactions_given_count integer not null default 0
    check (reactions_given_count >= 0);

-- =====================================================
-- 4. Personnalisation par membre
-- =====================================================

alter table public.circle_members
  add column if not exists nickname text
    check (nickname is null or char_length(nickname) between 1 and 40);

alter table public.circle_members
  add column if not exists badge text
    check (badge is null or char_length(badge) between 1 and 30);

alter table public.circle_members
  add column if not exists custom_role_color text
    check (custom_role_color is null or custom_role_color ~* '^#[0-9a-f]{6}$');

-- =====================================================
-- 5. Notifications granulaires par cercle (jsonb)
-- =====================================================
--
-- Schéma :
--   {
--     "new_posts":         'all' | 'highlights' | 'mentions_only' | 'off',
--     "new_marketplace":   'all' | 'matching_interests' | 'off',
--     "new_jobs":          'all' | 'matching_profile' | 'off',
--     "new_events":        'all' | 'rsvp_only' | 'off',
--     "mentions":          boolean,
--     "direct_replies":    boolean,
--     "moderator_messages": boolean,
--     "weekly_digest":     boolean
--   }
--
-- Default : highlights pour posts, matching_interests pour market/jobs, all
-- pour events. Évite spam tout en gardant engagement.

alter table public.circle_members
  add column if not exists notifications jsonb not null default jsonb_build_object(
    'new_posts', 'highlights',
    'new_marketplace', 'matching_interests',
    'new_jobs', 'matching_profile',
    'new_events', 'all',
    'mentions', true,
    'direct_replies', true,
    'moderator_messages', true,
    'weekly_digest', true
  );

-- =====================================================
-- 6. Subscription (cercles payants — Chantier 4 monétisation)
-- =====================================================

alter table public.circle_members
  add column if not exists subscription_status text;
alter table public.circle_members
  drop constraint if exists circle_members_subscription_status_check;
alter table public.circle_members
  add constraint circle_members_subscription_status_check
  check (subscription_status is null or subscription_status in (
    'active', 'cancelled', 'expired'
  ));

alter table public.circle_members
  add column if not exists subscription_started_at timestamptz;

alter table public.circle_members
  add column if not exists subscription_renews_at timestamptz;

-- =====================================================
-- 7. Modération par cercle (sanctions progressives)
-- =====================================================

alter table public.circle_members
  add column if not exists is_muted boolean not null default false;

alter table public.circle_members
  add column if not exists muted_until timestamptz;

alter table public.circle_members
  add column if not exists warnings_count integer not null default 0
    check (warnings_count >= 0);

alter table public.circle_members
  add column if not exists is_banned boolean not null default false;

alter table public.circle_members
  add column if not exists banned_at timestamptz;

alter table public.circle_members
  add column if not exists ban_reason text
    check (ban_reason is null or char_length(ban_reason) <= 500);

-- =====================================================
-- 8. Indexes pour discovery + modération
-- =====================================================

create index if not exists circle_members_status_idx
  on public.circle_members (circle_id, status)
  where status = 'active';

create index if not exists circle_members_last_active_idx
  on public.circle_members (circle_id, last_active_at desc)
  where status = 'active';

create index if not exists circle_members_pending_approval_idx
  on public.circle_members (circle_id, status)
  where status = 'pending_approval';

create index if not exists circle_members_banned_idx
  on public.circle_members (circle_id)
  where is_banned = true;

-- =====================================================
-- 9. Backfill : insère le owner du cercle dans circle_members si absent
-- =====================================================
--
-- Pour les rows existantes : si le owner_id du cercle n'a pas de row dans
-- circle_members, on l'ajoute avec role='owner'. Ça unifie les sources
-- (circles.owner_id reste la source de vérité de "qui est créateur" mais
-- circle_members reflète aussi le rôle pour les queries).

insert into public.circle_members (circle_id, user_id, role, status, joined_at)
select c.id, c.owner_id, 'owner', 'active', c.created_at
  from public.circles c
 where not exists (
   select 1 from public.circle_members m
    where m.circle_id = c.id and m.user_id = c.owner_id
 )
on conflict (circle_id, user_id) do nothing;

-- Met à jour les rows où user_id == owner_id et role != 'owner' (cohérence)
update public.circle_members m
   set role = 'owner'
  from public.circles c
 where m.circle_id = c.id
   and m.user_id = c.owner_id
   and m.role <> 'owner';

comment on column public.circle_members.notifications is
  'Préférences notifications par cercle. Voir migration 0092 pour le schéma.';
comment on column public.circle_members.subscription_status is
  'Statut abonnement pour cercles payants (Chantier 4 monétisation).';
