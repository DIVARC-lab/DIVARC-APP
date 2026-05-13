-- Chantier 4.3 — Audit log modération par cercle.
--
-- Distinct du système de modération globale DIVARC (moderation_actions,
-- migration 0046) qui couvre les sanctions plateforme. Ici on track les
-- actions des modos/admins d'un cercle :
--   - approve / reject post
--   - pin / unpin
--   - lock / unlock
--   - promote / demote member
--   - warn / mute / ban member (Chantier 4.4 — table circle_sanctions)
--
-- IDEMPOTENT.

create table if not exists public.circle_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete set null,
  /* Type d'action — string libre pour évolutivité, mais whitelisté côté code. */
  action_type text not null check (action_type in (
    'post_approved',
    'post_rejected',
    'post_pinned',
    'post_unpinned',
    'post_locked',
    'post_unlocked',
    'post_announcement_set',
    'post_announcement_unset',
    'member_promoted',
    'member_demoted',
    'member_warned',
    'member_muted',
    'member_unmuted',
    'member_banned',
    'member_unbanned',
    'rule_added',
    'rule_removed',
    'rule_updated',
    'flair_added',
    'flair_removed'
  )),
  target_post_id uuid references public.posts(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  /* Détails libres (raison, ancien/nouveau rôle, etc.). */
  metadata jsonb not null default '{}'::jsonb,
  reason text check (reason is null or char_length(reason) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists circle_mod_actions_circle_idx
  on public.circle_moderation_actions (circle_id, created_at desc);

create index if not exists circle_mod_actions_target_post_idx
  on public.circle_moderation_actions (target_post_id)
  where target_post_id is not null;

create index if not exists circle_mod_actions_target_user_idx
  on public.circle_moderation_actions (target_user_id)
  where target_user_id is not null;

alter table public.circle_moderation_actions enable row level security;

/* Lecture : visible aux modos/admins du cercle + à l'utilisateur target
 * (qu'il sache qui a fait quoi sur lui). */
drop policy if exists "circle_mod_actions readable by mods or target"
  on public.circle_moderation_actions;
create policy "circle_mod_actions readable by mods or target"
  on public.circle_moderation_actions for select
  using (
    auth.uid() = target_user_id
    or exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_moderation_actions.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin', 'moderator', 'mod')
         and m.status = 'active'
    )
  );

/* Insert : modos/admins du cercle uniquement. */
drop policy if exists "circle_mod_actions insert by mods"
  on public.circle_moderation_actions;
create policy "circle_mod_actions insert by mods"
  on public.circle_moderation_actions for insert
  with check (
    actor_user_id = auth.uid()
    and exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_moderation_actions.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin', 'moderator', 'mod')
         and m.status = 'active'
    )
  );

/* Update / Delete : immuable (audit log). */

comment on table public.circle_moderation_actions is
  'Audit log des actions de modération par cercle (Chantier 4.3). Immuable.';
