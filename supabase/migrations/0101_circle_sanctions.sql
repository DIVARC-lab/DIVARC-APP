-- Chantier 4.4 — Sanctions progressives par cercle.
--
-- Table `circle_sanctions` qui track l'historique de toutes les sanctions
-- appliquées sur un membre dans un cercle. Chaque ligne est immuable
-- (audit) ; le statut "actif" est calculé via expires_at + lifted_at.
--
-- 6 niveaux de sanctions (escalade progressive) :
--   1. warning      : avertissement (pas d'action sur le membre)
--   2. mute_1h      : muet 1h (peut lire, pas poster/commenter)
--   3. mute_24h     : muet 24h
--   4. mute_7d      : muet 7 jours
--   5. temp_ban_30d : ban temporaire 30 jours (kick + status=banned)
--   6. permanent_ban: ban définitif
--
-- Les sanctions du cercle ne touchent PAS le compte global DIVARC.
--
-- IDEMPOTENT.

create table if not exists public.circle_sanctions (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  issued_by uuid references auth.users(id) on delete set null,

  level int not null check (level between 1 and 6),
  action text not null check (action in (
    'warning',
    'mute_1h',
    'mute_24h',
    'mute_7d',
    'temp_ban_30d',
    'permanent_ban'
  )),

  reason text check (reason is null or char_length(reason) <= 1000),

  issued_at timestamptz not null default now(),
  /* Date d'expiration calculée à l'insert. NULL = permanent. */
  expires_at timestamptz,

  /* Levée anticipée (par modo). */
  lifted_at timestamptz,
  lifted_by uuid references auth.users(id) on delete set null,
  lifted_reason text check (lifted_reason is null or char_length(lifted_reason) <= 500)
);

create index if not exists circle_sanctions_target_idx
  on public.circle_sanctions (target_user_id, circle_id, issued_at desc);

create index if not exists circle_sanctions_active_idx
  on public.circle_sanctions (circle_id, expires_at)
  where lifted_at is null;

alter table public.circle_sanctions enable row level security;

drop policy if exists "circle_sanctions readable by mods or target"
  on public.circle_sanctions;
create policy "circle_sanctions readable by mods or target"
  on public.circle_sanctions for select
  using (
    auth.uid() = target_user_id
    or exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_sanctions.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin', 'moderator', 'mod')
         and m.status = 'active'
    )
  );

drop policy if exists "circle_sanctions insert by mods" on public.circle_sanctions;
create policy "circle_sanctions insert by mods"
  on public.circle_sanctions for insert
  with check (
    issued_by = auth.uid()
    and exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_sanctions.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin', 'moderator', 'mod')
         and m.status = 'active'
    )
  );

/* Update : seuls les modos peuvent lever une sanction (lifted_at/lifted_by). */
drop policy if exists "circle_sanctions lift by mods" on public.circle_sanctions;
create policy "circle_sanctions lift by mods"
  on public.circle_sanctions for update
  using (
    exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_sanctions.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin', 'moderator', 'mod')
         and m.status = 'active'
    )
  );

comment on table public.circle_sanctions is
  'Historique immuable des sanctions appliquées par cercle. 6 niveaux progressifs.';
comment on column public.circle_sanctions.expires_at is
  'Calculée à l''insert. NULL = permanent (level=6).';
