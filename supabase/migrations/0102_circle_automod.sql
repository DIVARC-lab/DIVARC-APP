-- Chantier 4.5 — Règles AutoMod par cercle.
--
-- Table `circle_automod_rules` : configuration des règles automatiques
-- appliquées par le système quand un post est créé ou signalé. 4 types V1 :
--   - slow_mode      : max N posts par user / fenêtre
--   - word_filter    : liste de mots/regex qui hide le post auto
--   - report_threshold : si N reports sur un post → hide auto
--   - link_filter    : si le post contient un lien externe non whitelisté
--
-- Les règles sont **configurables** ici (table + UI) mais l'enforcement
-- réel se fait dans le code applicatif au moment de l'INSERT post (hooks
-- côté server actions) — branchement V2.
--
-- IDEMPOTENT.

create table if not exists public.circle_automod_rules (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete set null,

  rule_type text not null check (rule_type in (
    'slow_mode',
    'word_filter',
    'report_threshold',
    'link_filter'
  )),

  /* Configuration spécifique au rule_type. Schémas indicatifs :
   *   slow_mode        : { "max_posts": 5, "window_minutes": 60 }
   *   word_filter      : { "words": ["spam", "scam"], "case_insensitive": true }
   *   report_threshold : { "threshold": 3, "action": "hide" }
   *   link_filter      : { "allowlist": ["youtube.com"], "block_others": true }
   */
  config jsonb not null default '{}'::jsonb,

  /* Action déclenchée. */
  on_match_action text not null default 'flag' check (on_match_action in (
    'flag',        -- juste signaler aux modos
    'hide',        -- masquer le post (soft delete avec restore possible)
    'require_approval' -- requires_approval=true sur le post
  )),

  enabled boolean not null default true,

  /* Stats — incrémentées par les hooks runtime. */
  match_count integer not null default 0 check (match_count >= 0),
  last_matched_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists circle_automod_rules_circle_idx
  on public.circle_automod_rules (circle_id, enabled);

alter table public.circle_automod_rules enable row level security;

drop policy if exists "automod_rules readable by mods" on public.circle_automod_rules;
create policy "automod_rules readable by mods"
  on public.circle_automod_rules for select
  using (
    exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_automod_rules.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin', 'moderator', 'mod')
         and m.status = 'active'
    )
  );

drop policy if exists "automod_rules manageable by admins"
  on public.circle_automod_rules;
create policy "automod_rules manageable by admins"
  on public.circle_automod_rules for all
  using (
    exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_automod_rules.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin')
         and m.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_automod_rules.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin')
         and m.status = 'active'
    )
  );

drop trigger if exists circle_automod_rules_set_updated_at
  on public.circle_automod_rules;
create trigger circle_automod_rules_set_updated_at
  before update on public.circle_automod_rules
  for each row execute function public.set_updated_at();

comment on table public.circle_automod_rules is
  'Configuration AutoMod par cercle. Enforcement runtime branché dans les hooks server actions (V2).';
