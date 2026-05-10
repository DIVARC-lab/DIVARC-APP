-- =====================================================
-- DIVARC — Migration 0046 : Modération Trust & Safety
--
-- Fondation complète du système de modération conforme :
--   - DSA (Digital Services Act) art. 16, 17, 20, 22, 24
--   - LCEN art. 6 (conservation 1 an logs identification)
--   - Loi Avia / Pharos (signalement < 24h contenus terroristes/CSAM)
--   - RGPD (traçabilité, anonymisation reporter, droit d'accès)
--
-- Tables créées :
--   moderation_reports          — signalements utilisateurs (art. 16)
--   moderation_queue            — file priorisée traitement
--   moderation_actions          — décisions immuables (audit log)
--   moderation_appeals          — recours utilisateurs (art. 20)
--   user_sanctions              — sanctions actives & historiques
--   trusted_flaggers            — registre signaleurs de confiance (art. 22)
--   moderation_known_hashes     — hashes contenus déjà violation (réupload)
--   moderation_text_cache       — cache scans texte (perf)
--   moderation_image_cache      — cache scans image (perf)
--   moderation_critical_incidents — CSAM/terrorisme (Pharos/NCMEC)
--   legal_data_requests         — réquisitions judiciaires (LCEN)
--
-- Politique RLS : reporter voit ses propres reports, target voit ses
-- sanctions/appeals, modérateurs (is_admin) voient tout, public ne voit rien.
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- 1. moderation_reports — Signalements utilisateurs (DSA art. 16)
-- =====================================================
create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  /* Type de cible polymorphe — un seul de target_post_id, target_comment_id,
     etc. doit être non-null (CHECK constraint plus bas). */
  target_type text not null check (
    target_type in ('post','comment','user','message','listing','story','job','listing_offer')
  ),
  target_post_id uuid references public.posts(id) on delete set null,
  target_comment_id uuid references public.post_comments(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_message_id uuid references public.messages(id) on delete set null,
  target_listing_id uuid references public.listings(id) on delete set null,
  target_story_id uuid references public.stories(id) on delete set null,
  target_job_id uuid references public.jobs(id) on delete set null,
  /* Catégorie DSA — taxonomie alignée brief Trust & Safety. */
  category text not null check (category in (
    'hate_speech','harassment','violence','nudity_sexual',
    'child_safety','self_harm','spam','scam_fraud',
    'impersonation','intellectual_property','privacy',
    'illegal_activity','other'
  )),
  subcategory text,
  description text check (length(description) <= 1000),
  /* URLs S3/Supabase Storage des preuves attachées. */
  evidence_urls text[] not null default array[]::text[],
  /* Conservation données identification reporter pour LCEN art. 6 (1 an min). */
  reporter_ip inet,
  reporter_user_agent text,
  /* Statut & priorisation. */
  status text not null default 'pending' check (status in (
    'pending','triaging','under_review','actioned','dismissed','duplicate'
  )),
  priority_score integer not null default 0 check (priority_score between 0 and 100),
  /* Modérateur assigné (FIFO + skip si conflit). */
  assigned_moderator_id uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz,
  resolved_at timestamptz,
  resolution_action_id uuid, -- FK posée plus bas après création de moderation_actions
  /* Évite les doublons (un reporter ne signale pas 2× le même contenu/cat). */
  created_at timestamptz not null default now(),
  /* CHECK : exactement un target_*_id non-null */
  constraint moderation_reports_one_target check (
    (case when target_post_id is not null then 1 else 0 end) +
    (case when target_comment_id is not null then 1 else 0 end) +
    (case when target_user_id is not null then 1 else 0 end) +
    (case when target_message_id is not null then 1 else 0 end) +
    (case when target_listing_id is not null then 1 else 0 end) +
    (case when target_story_id is not null then 1 else 0 end) +
    (case when target_job_id is not null then 1 else 0 end) = 1
  )
);

create unique index if not exists moderation_reports_dedup_idx
  on public.moderation_reports (
    reporter_id, category,
    coalesce(target_post_id::text, ''),
    coalesce(target_comment_id::text, ''),
    coalesce(target_user_id::text, ''),
    coalesce(target_message_id::text, ''),
    coalesce(target_listing_id::text, ''),
    coalesce(target_story_id::text, ''),
    coalesce(target_job_id::text, '')
  );
create index if not exists moderation_reports_status_priority_idx
  on public.moderation_reports (status, priority_score desc, created_at asc);
create index if not exists moderation_reports_target_post_idx
  on public.moderation_reports (target_post_id) where target_post_id is not null;
create index if not exists moderation_reports_assigned_idx
  on public.moderation_reports (assigned_moderator_id, status)
  where assigned_moderator_id is not null;

-- =====================================================
-- 2. moderation_actions — Décisions IMMUABLES (audit log art. 17)
-- =====================================================
create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  /* Modérateur ayant pris la décision (NULL = action automatique). */
  moderator_id uuid references public.profiles(id) on delete set null,
  is_automated boolean not null default false,
  target_type text not null,
  target_post_id uuid references public.posts(id) on delete set null,
  target_comment_id uuid references public.post_comments(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_message_id uuid references public.messages(id) on delete set null,
  target_listing_id uuid references public.listings(id) on delete set null,
  target_story_id uuid references public.stories(id) on delete set null,
  target_job_id uuid references public.jobs(id) on delete set null,
  action text not null check (action in (
    'no_action','warn','hide','delete','restrict_24h','restrict_7d',
    'restrict_30d','suspend','ban_permanent','escalate','authority_report'
  )),
  category text not null,
  reason_internal text,        -- visible modérateurs uniquement
  reason_user text not null,   -- communiqué à l'utilisateur (DSA art. 17)
  legal_basis text,            -- ex: "CGU §4.3", "DSA art. 22", "Code pénal art. R.625-7"
  /* Snapshot complet du contenu au moment de la décision (preuve). */
  content_snapshot jsonb not null,
  ml_scores jsonb,             -- {toxicity: 0.92, hate: 0.78, ...}
  reports_referenced uuid[] not null default array[]::uuid[],
  appealable boolean not null default true,
  appeal_deadline timestamptz, -- 6 mois après décision (DSA art. 20.1)
  created_at timestamptz not null default now()
);

create index if not exists moderation_actions_target_user_idx
  on public.moderation_actions (target_user_id, created_at desc)
  where target_user_id is not null;
create index if not exists moderation_actions_target_post_idx
  on public.moderation_actions (target_post_id) where target_post_id is not null;
create index if not exists moderation_actions_moderator_idx
  on public.moderation_actions (moderator_id, created_at desc)
  where moderator_id is not null;
create index if not exists moderation_actions_action_created_idx
  on public.moderation_actions (action, created_at desc);

-- FK différée pour resolution_action_id sur moderation_reports.
alter table public.moderation_reports
  drop constraint if exists moderation_reports_resolution_action_fkey;
alter table public.moderation_reports
  add constraint moderation_reports_resolution_action_fkey
  foreign key (resolution_action_id)
  references public.moderation_actions(id) on delete set null;

-- =====================================================
-- IMMUTABILITÉ moderation_actions — Triggers anti-UPDATE/DELETE
-- =====================================================
create or replace function public.tg_moderation_actions_immutable()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE') then
    raise exception 'moderation_actions sont immuables (audit log) — UPDATE refusé. Créer une nouvelle action si correction nécessaire.';
  end if;
  if (tg_op = 'DELETE') then
    raise exception 'moderation_actions sont immuables (audit log) — DELETE refusé. Conservation légale 5 ans (DSA + LCEN).';
  end if;
  return null;
end;
$$;

drop trigger if exists moderation_actions_immutable_update on public.moderation_actions;
create trigger moderation_actions_immutable_update
  before update on public.moderation_actions
  for each row execute function public.tg_moderation_actions_immutable();

drop trigger if exists moderation_actions_immutable_delete on public.moderation_actions;
create trigger moderation_actions_immutable_delete
  before delete on public.moderation_actions
  for each row execute function public.tg_moderation_actions_immutable();

-- =====================================================
-- 3. moderation_appeals — Recours utilisateurs (DSA art. 20)
-- =====================================================
create table if not exists public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.moderation_actions(id) on delete cascade,
  appellant_id uuid not null references public.profiles(id) on delete cascade,
  user_explanation text not null check (length(user_explanation) <= 2000),
  additional_evidence_urls text[] not null default array[]::text[],
  status text not null default 'pending' check (status in (
    'pending','assigned','accepted','rejected','escalated_external'
  )),
  /* Modérateur assigné DOIT être différent de moderator_id de l'action
     initiale (DSA art. 20.6). Check applicatif côté API. */
  assigned_moderator_id uuid references public.profiles(id) on delete set null,
  resolution_note text,
  resolution_action_id uuid references public.moderation_actions(id) on delete set null,
  resolved_at timestamptz,
  /* SLA légal 6 mois max ; SLA opérationnel 7 jours. Escalade auto J+5. */
  sla_deadline timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists moderation_appeals_status_sla_idx
  on public.moderation_appeals (status, sla_deadline asc)
  where status in ('pending','assigned');
create index if not exists moderation_appeals_appellant_idx
  on public.moderation_appeals (appellant_id, created_at desc);

-- =====================================================
-- 4. user_sanctions — Sanctions actives & historiques (cumul/décay)
-- =====================================================
create table if not exists public.user_sanctions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  level smallint not null check (level between 1 and 5),
  /* 1=warning, 2=readonly_24h, 3=readonly_7d, 4=readonly_30d, 5=banned */
  type text not null check (type in (
    'warning','readonly','suspended','banned'
  )),
  reason text not null,
  source_action_id uuid references public.moderation_actions(id) on delete set null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz, -- NULL = permanent
  /* Décay : sanctions annulées du calcul après 6 mois sans nouvelle
     violation (cf RPC recalculate_trust_score). */
  is_active boolean not null default true,
  lifted_at timestamptz,
  lifted_reason text,
  created_at timestamptz not null default now()
);

create index if not exists user_sanctions_user_active_idx
  on public.user_sanctions (user_id, is_active, expires_at);
create index if not exists user_sanctions_expires_idx
  on public.user_sanctions (expires_at)
  where is_active = true and expires_at is not null;

-- =====================================================
-- 5. trusted_flaggers — Signaleurs de confiance (DSA art. 22)
-- =====================================================
create table if not exists public.trusted_flaggers (
  id uuid primary key default gen_random_uuid(),
  /* Soit un user DIVARC, soit une organisation externe (NULL user_id). */
  user_id uuid references public.profiles(id) on delete cascade,
  organization_name text,
  contact_email text not null,
  /* Catégories sur lesquelles le flagger a expertise reconnue. */
  expertise_categories text[] not null default array[]::text[],
  /* Statut DSA art. 22 : awarded by Digital Services Coordinator. */
  awarded_by text,           -- ex: "ARCOM 2026-03-15"
  awarded_at timestamptz,
  is_active boolean not null default true,
  /* Stats — mises à jour par cron. */
  reports_submitted integer not null default 0,
  reports_actioned integer not null default 0,
  precision_rate numeric(5,4), -- reports_actioned / reports_submitted
  created_at timestamptz not null default now(),
  constraint trusted_flaggers_actor_check check (
    user_id is not null or organization_name is not null
  )
);

create index if not exists trusted_flaggers_active_idx
  on public.trusted_flaggers (is_active);
create unique index if not exists trusted_flaggers_user_uniq
  on public.trusted_flaggers (user_id) where user_id is not null;

-- =====================================================
-- 6. moderation_queue — File priorisée pour async (pg_cron consumer)
-- =====================================================
create table if not exists public.moderation_queue (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in (
    'preflight_text','preflight_image','deep_scan','behavioral_check',
    'csam_scan','review_handoff','appeal_handoff'
  )),
  payload jsonb not null,
  priority integer not null default 50,
  status text not null default 'queued' check (status in (
    'queued','running','done','failed','dead_letter'
  )),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  scheduled_for timestamptz not null default now(),
  picked_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists moderation_queue_pickup_idx
  on public.moderation_queue (status, scheduled_for asc, priority desc)
  where status in ('queued','failed');

-- =====================================================
-- 7. moderation_known_hashes — Hashes de contenus déjà violation
-- =====================================================
create table if not exists public.moderation_known_hashes (
  id uuid primary key default gen_random_uuid(),
  /* SHA-256 du média OU pHash perceptuel (libimagehash). */
  hash text not null,
  hash_type text not null check (hash_type in (
    'sha256','phash','blockhash','photodna'
  )),
  category text not null,
  /* Référence vers l'action originale qui a créé ce hash. */
  source_action_id uuid references public.moderation_actions(id) on delete set null,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  /* Pas de delete : si réinstauration, on flag is_active = false. */
  is_active boolean not null default true
);

create unique index if not exists moderation_known_hashes_uniq
  on public.moderation_known_hashes (hash, hash_type);
create index if not exists moderation_known_hashes_active_idx
  on public.moderation_known_hashes (is_active, hash_type);

-- =====================================================
-- 8. moderation_text_cache + moderation_image_cache — perf scans
-- =====================================================
create table if not exists public.moderation_text_cache (
  text_hash text primary key,                      -- SHA-256 du texte normalisé
  scan_result jsonb not null,                       -- résultat OpenAI Moderation
  detected_categories text[] not null default array[]::text[],
  highest_score numeric(5,4) not null,
  scanned_at timestamptz not null default now()
);
create index if not exists moderation_text_cache_scanned_idx
  on public.moderation_text_cache (scanned_at);

create table if not exists public.moderation_image_cache (
  image_hash text primary key,                      -- SHA-256 du fichier
  phash text,                                       -- pHash pour near-duplicate
  scan_result jsonb not null,                       -- structure unifiée
  nsfw_score numeric(5,4),
  violence_score numeric(5,4),
  csam_match boolean not null default false,
  scanned_at timestamptz not null default now()
);
create index if not exists moderation_image_cache_phash_idx
  on public.moderation_image_cache (phash) where phash is not null;
create index if not exists moderation_image_cache_csam_idx
  on public.moderation_image_cache (csam_match) where csam_match = true;

-- =====================================================
-- 9. moderation_critical_incidents — CSAM/terrorisme (Pharos/NCMEC)
-- =====================================================
create table if not exists public.moderation_critical_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_type text not null check (incident_type in (
    'csam','terrorism','imminent_violence','revenge_porn'
  )),
  /* Référence du contenu (peut avoir été supprimé). Évidence dans
     Storage chiffré — accès service-role uniquement. */
  evidence_storage_path text not null,
  evidence_metadata jsonb not null, -- {ip, user_agent, post_id, hashes...}
  /* Infos auteur — conservées même après suppression du compte
     (obligation conservation LCEN). */
  perpetrator_user_id uuid,
  perpetrator_email text,
  perpetrator_ip inet,
  /* Statut envois autorités. */
  ncmec_submitted_at timestamptz,
  ncmec_report_id text,
  pharos_submitted_at timestamptz,
  pharos_reference text,
  /* Tracking interne. */
  detected_by text not null check (detected_by in (
    'photodna','user_report','moderator','external_api'
  )),
  status text not null default 'detected' check (status in (
    'detected','authorities_notified','closed'
  )),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists moderation_critical_incidents_status_idx
  on public.moderation_critical_incidents (status, created_at);

-- =====================================================
-- 10. legal_data_requests — Réquisitions judiciaires (LCEN/RGPD)
-- =====================================================
create table if not exists public.legal_data_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in (
    'judicial','administrative','dpa','court_order','urgent_life_at_risk'
  )),
  authority_name text not null,        -- "Procureur République de Paris", etc.
  authority_reference text,            -- numéro de procédure
  contact_email text not null,
  /* Cible : user, posts, messages, etc. */
  target_user_id uuid references public.profiles(id) on delete set null,
  target_scope text not null,          -- "all_messages", "specific_posts", etc.
  scope_details jsonb,                 -- ids spécifiques, période, etc.
  /* Délai de réponse — 24h pour urgence, 7j sinon. */
  sla_deadline timestamptz not null,
  legal_basis text not null,           -- ex: "Art. 6-II LCEN", "Art. 60-1 CPP"
  /* Process. */
  received_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  responded_at timestamptz,
  response_payload_path text,          -- Storage chiffré
  /* Audit — qui a accepté/refusé/répondu. */
  handled_by uuid references public.profiles(id) on delete set null,
  status text not null default 'received' check (status in (
    'received','validated','responded','rejected','withdrawn'
  )),
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index if not exists legal_data_requests_status_idx
  on public.legal_data_requests (status, sla_deadline);
create index if not exists legal_data_requests_target_user_idx
  on public.legal_data_requests (target_user_id) where target_user_id is not null;

-- legal_data_requests immuabilité partielle (UPDATE autorisé pour status
-- mais pas pour les colonnes audit-critiques).
create or replace function public.tg_legal_data_requests_protect()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE') then
    if old.received_at is distinct from new.received_at
       or old.target_user_id is distinct from new.target_user_id
       or old.legal_basis is distinct from new.legal_basis
       or old.authority_name is distinct from new.authority_name then
      raise exception 'legal_data_requests : champs received_at/target_user_id/legal_basis/authority_name immuables.';
    end if;
  end if;
  if (tg_op = 'DELETE') then
    raise exception 'legal_data_requests sont immuables (LCEN art. 6 — conservation 1 an min).';
  end if;
  return new;
end;
$$;

drop trigger if exists legal_data_requests_protect on public.legal_data_requests;
create trigger legal_data_requests_protect
  before update or delete on public.legal_data_requests
  for each row execute function public.tg_legal_data_requests_protect();

-- =====================================================
-- RPC : compute_report_priority_score
-- =====================================================
create or replace function public.compute_report_priority_score(
  p_category text,
  p_reporter_id uuid,
  p_target_user_id uuid,
  p_target_post_id uuid
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_score integer := 0;
  v_duplicate_count integer := 0;
  v_is_trusted boolean := false;
  v_target_age_days integer := null;
begin
  /* Catégorie. */
  v_score := case p_category
    when 'child_safety' then 100
    when 'self_harm' then 90
    when 'violence' then 60
    when 'hate_speech' then 60
    when 'harassment' then 40
    when 'scam_fraud' then 40
    when 'illegal_activity' then 50
    when 'privacy' then 35
    when 'nudity_sexual' then 35
    when 'impersonation' then 30
    when 'intellectual_property' then 25
    when 'spam' then 15
    else 20
  end;

  /* Trusted flagger boost (DSA art. 22). */
  select exists(
    select 1 from public.trusted_flaggers
    where user_id = p_reporter_id and is_active = true
  ) into v_is_trusted;
  if v_is_trusted then
    v_score := v_score + 30;
  end if;

  /* Reports multiples sur la même cible. */
  if p_target_post_id is not null then
    select count(*) into v_duplicate_count
    from public.moderation_reports
    where target_post_id = p_target_post_id
      and status in ('pending','triaging','under_review');
    v_score := v_score + least(v_duplicate_count * 5, 30);
  end if;

  /* Compte target récent (< 7j) = + de chance d'être troll/spam. */
  if p_target_user_id is not null then
    select extract(day from (now() - created_at))::integer
    into v_target_age_days
    from public.profiles where id = p_target_user_id;
    if v_target_age_days is not null and v_target_age_days < 7 then
      v_score := v_score + 10;
    end if;
  end if;

  return greatest(0, least(100, v_score));
end;
$$;

revoke all on function public.compute_report_priority_score from public;
grant execute on function public.compute_report_priority_score
  to authenticated, service_role;

-- =====================================================
-- RLS Policies
-- =====================================================
alter table public.moderation_reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.moderation_appeals enable row level security;
alter table public.user_sanctions enable row level security;
alter table public.trusted_flaggers enable row level security;
alter table public.moderation_queue enable row level security;
alter table public.moderation_known_hashes enable row level security;
alter table public.moderation_text_cache enable row level security;
alter table public.moderation_image_cache enable row level security;
alter table public.moderation_critical_incidents enable row level security;
alter table public.legal_data_requests enable row level security;

-- Helper : is_admin shortcut
create or replace function public.current_user_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- moderation_reports : reporter voit ses propres reports, modos voient tout.
drop policy if exists "reports_insert_self" on public.moderation_reports;
create policy "reports_insert_self" on public.moderation_reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "reports_select_self_or_mod" on public.moderation_reports;
create policy "reports_select_self_or_mod" on public.moderation_reports
  for select using (
    auth.uid() = reporter_id or public.current_user_is_admin()
  );

drop policy if exists "reports_update_mod_only" on public.moderation_reports;
create policy "reports_update_mod_only" on public.moderation_reports
  for update using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- moderation_actions : target voit ses actions (transparence DSA), modos voient tout.
drop policy if exists "actions_select_target_or_mod" on public.moderation_actions;
create policy "actions_select_target_or_mod" on public.moderation_actions
  for select using (
    auth.uid() = target_user_id or public.current_user_is_admin()
  );

/* INSERT : modérateurs uniquement (les actions automatiques passent par
   service_role qui bypass RLS). */
drop policy if exists "actions_insert_mod_only" on public.moderation_actions;
create policy "actions_insert_mod_only" on public.moderation_actions
  for insert with check (public.current_user_is_admin());

-- moderation_appeals : appelant voit son appel, modos voient tout.
drop policy if exists "appeals_insert_self" on public.moderation_appeals;
create policy "appeals_insert_self" on public.moderation_appeals
  for insert with check (auth.uid() = appellant_id);

drop policy if exists "appeals_select_self_or_mod" on public.moderation_appeals;
create policy "appeals_select_self_or_mod" on public.moderation_appeals
  for select using (
    auth.uid() = appellant_id or public.current_user_is_admin()
  );

drop policy if exists "appeals_update_mod_only" on public.moderation_appeals;
create policy "appeals_update_mod_only" on public.moderation_appeals
  for update using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- user_sanctions : user voit ses propres sanctions, modos voient tout.
drop policy if exists "sanctions_select_self_or_mod" on public.user_sanctions;
create policy "sanctions_select_self_or_mod" on public.user_sanctions
  for select using (
    auth.uid() = user_id or public.current_user_is_admin()
  );

-- trusted_flaggers : public lecture (transparence DSA art. 22), insert/update modos.
drop policy if exists "flaggers_select_public" on public.trusted_flaggers;
create policy "flaggers_select_public" on public.trusted_flaggers
  for select using (true);

-- moderation_queue, known_hashes, caches, critical_incidents, legal :
-- accès modos uniquement (lecture) ; service_role pour les writes.
drop policy if exists "queue_mod_read" on public.moderation_queue;
create policy "queue_mod_read" on public.moderation_queue
  for select using (public.current_user_is_admin());

drop policy if exists "hashes_mod_read" on public.moderation_known_hashes;
create policy "hashes_mod_read" on public.moderation_known_hashes
  for select using (public.current_user_is_admin());

drop policy if exists "critical_mod_read" on public.moderation_critical_incidents;
create policy "critical_mod_read" on public.moderation_critical_incidents
  for select using (public.current_user_is_admin());

drop policy if exists "legal_mod_read" on public.legal_data_requests;
create policy "legal_mod_read" on public.legal_data_requests
  for select using (public.current_user_is_admin());

/* Caches : pas accessibles aux users (data fuzz). Service-role only. */

-- =====================================================
-- Comments doc
-- =====================================================
comment on table public.moderation_reports is
  'Signalements utilisateurs DSA art. 16. Anonymisation reporter côté UI.';
comment on table public.moderation_actions is
  'Décisions modération immuables (audit log DSA art. 17 + LCEN). UPDATE/DELETE bloqués par triggers.';
comment on table public.moderation_appeals is
  'Recours utilisateurs DSA art. 20. Modérateur assigné DOIT être différent de celui de l''action initiale (check applicatif).';
comment on table public.legal_data_requests is
  'Réquisitions judiciaires LCEN art. 6. Champs critiques immuables. Conservation 5 ans.';
