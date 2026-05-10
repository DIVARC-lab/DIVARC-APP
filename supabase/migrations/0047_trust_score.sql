-- =====================================================
-- DIVARC — Migration 0047 : Trust Score utilisateur
--
-- Ajoute les signaux de vérification + compteurs de violation
-- nécessaires pour calculer un trust_score (0-100). Le score module
-- la sévérité de la modération (cf brief Trust & Safety) :
--
--   trust >= 80 : seuils permissifs
--   40-79      : seuils standards
--   20-39      : seuils stricts
--   < 20       : tout passe en review humaine
--
-- Le score est recalculé via RPC recalculate_trust_score appelée :
--   - À chaque insertion dans user_sanctions (trigger)
--   - Au signup (init à 50)
--   - Lors de la vérification email/téléphone/identité (server action)
--   - Périodiquement par cron (décay des sanctions > 6 mois)
-- =====================================================

-- Colonnes profile pour les signaux de vérification
alter table public.profiles
  add column if not exists email_verified_at timestamptz,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists phone_number text,
  add column if not exists identity_verified_at timestamptz,
  /* identity_verification_provider : 'stripe_identity' | 'idnow' | 'manual' */
  add column if not exists identity_verification_provider text,
  /* Compteurs cumulatifs de violations — ne descendent jamais.
     Les sanctions périmées sont gérées via user_sanctions.is_active
     dans le calcul du score. */
  add column if not exists warnings_count integer not null default 0,
  add column if not exists content_removed_count integer not null default 0,
  add column if not exists timeouts_received integer not null default 0,
  /* Score actuel — dénormalisé pour query rapide au render. */
  add column if not exists trust_score integer not null default 50
    check (trust_score between 0 and 100),
  add column if not exists trust_score_updated_at timestamptz default now();

create index if not exists profiles_trust_score_idx
  on public.profiles (trust_score);

-- =====================================================
-- RPC : recalculate_trust_score
--
-- Reconstruit le trust_score à partir des signaux primitifs :
--   baseline 50
--   + bonus vérifications (email +5, phone +10, identity +15)
--   + bonus ancienneté (+1 par 30j, cap 20)
--   + bonus profil complet (+5 si full_name + bio + avatar)
--   - pénalités cumulées (warnings ×5, removed ×10, timeouts ×15)
--
-- Pour le décay : les sanctions de niveau 1 (warning) > 180 jours
-- sont ignorées. Niveau 2-3 > 365j. Niveau 4-5 jamais (banned/longs).
-- =====================================================
create or replace function public.recalculate_trust_score(p_user_id uuid)
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  v_score integer := 50;
  v_profile record;
  v_age_days integer;
  v_active_warnings integer;
  v_active_removals integer;
  v_active_timeouts integer;
begin
  select id, full_name, bio, avatar_url, email_verified_at,
         phone_verified_at, identity_verified_at, created_at
    into v_profile
    from public.profiles where id = p_user_id;
  if not found then
    return 50;
  end if;

  /* Bonus vérifications. */
  if v_profile.email_verified_at is not null then v_score := v_score + 5; end if;
  if v_profile.phone_verified_at is not null then v_score := v_score + 10; end if;
  if v_profile.identity_verified_at is not null then v_score := v_score + 15; end if;

  /* Ancienneté : +1 par 30 jours, cap +20. */
  v_age_days := extract(day from (now() - v_profile.created_at))::integer;
  v_score := v_score + least(v_age_days / 30, 20);

  /* Profil complet : +5 si full_name + bio + avatar. */
  if v_profile.full_name is not null
     and v_profile.bio is not null and length(v_profile.bio) > 20
     and v_profile.avatar_url is not null then
    v_score := v_score + 5;
  end if;

  /* Pénalités — calculées depuis user_sanctions actives + non périmées
     selon la règle de décay. Les compteurs profile.{warnings_count,
     content_removed_count, timeouts_received} servent de fallback
     historique mais ne sont pas le truth source pour le score. */
  select
    count(*) filter (where level = 1
                       and (lifted_at is null)
                       and starts_at > now() - interval '180 days'),
    count(*) filter (where type in ('readonly','suspended')
                       and (lifted_at is null)
                       and (level <= 3 and starts_at > now() - interval '365 days'
                            or level >= 4)),
    count(*) filter (where type = 'readonly'
                       and (lifted_at is null)
                       and starts_at > now() - interval '365 days')
    into v_active_warnings, v_active_removals, v_active_timeouts
  from public.user_sanctions
  where user_id = p_user_id;

  v_score := v_score - (v_active_warnings * 5);
  v_score := v_score - (v_active_removals * 10);
  v_score := v_score - (v_active_timeouts * 15);

  /* Clamp 0-100. */
  v_score := greatest(0, least(100, v_score));

  /* Persist. */
  update public.profiles
    set trust_score = v_score,
        trust_score_updated_at = now()
    where id = p_user_id;

  return v_score;
end;
$$;

revoke all on function public.recalculate_trust_score(uuid) from public;
grant execute on function public.recalculate_trust_score(uuid)
  to authenticated, service_role;

-- =====================================================
-- Trigger : recalcul auto du trust_score sur user_sanctions
-- (INSERT, UPDATE de is_active/lifted_at, DELETE)
-- =====================================================
create or replace function public.tg_recalculate_trust_on_sanction()
returns trigger language plpgsql security definer as $$
declare
  v_user_id uuid;
begin
  v_user_id := coalesce(new.user_id, old.user_id);
  perform public.recalculate_trust_score(v_user_id);
  return null;
end;
$$;

drop trigger if exists user_sanctions_trust_recalc
  on public.user_sanctions;
create trigger user_sanctions_trust_recalc
  after insert or update of is_active, lifted_at, expires_at
       or delete on public.user_sanctions
  for each row execute function public.tg_recalculate_trust_on_sanction();

-- =====================================================
-- RPC : apply_sanction
--
-- Atomique : insert user_sanctions + incrémente compteurs profile +
-- recalcule trust_score (via trigger ci-dessus).
-- À appeler depuis le decision flow modération.
-- =====================================================
create or replace function public.apply_sanction(
  p_user_id uuid,
  p_level smallint,
  p_reason text,
  p_source_action_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_sanction_id uuid;
  v_type text;
  v_expires_at timestamptz;
  v_duration interval;
begin
  /* Mapping niveau → type + durée. */
  case p_level
    when 1 then v_type := 'warning'; v_duration := null;
    when 2 then v_type := 'readonly'; v_duration := interval '24 hours';
    when 3 then v_type := 'readonly'; v_duration := interval '7 days';
    when 4 then v_type := 'readonly'; v_duration := interval '30 days';
    when 5 then v_type := 'banned'; v_duration := null;
    else raise exception 'Niveau de sanction invalide : %', p_level;
  end case;

  v_expires_at := case
    when v_duration is null then null
    else now() + v_duration
  end;

  insert into public.user_sanctions (
    user_id, level, type, reason, source_action_id, expires_at
  ) values (
    p_user_id, p_level, v_type, p_reason, p_source_action_id, v_expires_at
  ) returning id into v_sanction_id;

  /* Compteurs cumulatifs. */
  if p_level = 1 then
    update public.profiles set warnings_count = warnings_count + 1
      where id = p_user_id;
  elsif p_level between 2 and 4 then
    update public.profiles set timeouts_received = timeouts_received + 1
      where id = p_user_id;
  end if;

  return v_sanction_id;
end;
$$;

revoke all on function public.apply_sanction(uuid, smallint, text, uuid) from public;
grant execute on function public.apply_sanction(uuid, smallint, text, uuid)
  to authenticated, service_role;

-- =====================================================
-- RPC : is_user_under_active_sanction
--
-- Helper rapide pour les guards (server actions, RLS) qui doivent
-- bloquer les écritures d'un user en readonly/banned.
-- =====================================================
create or replace function public.is_user_under_active_sanction(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.user_sanctions
    where user_id = p_user_id
      and is_active = true
      and type in ('readonly','suspended','banned')
      and (expires_at is null or expires_at > now())
  );
$$;

revoke all on function public.is_user_under_active_sanction(uuid) from public;
grant execute on function public.is_user_under_active_sanction(uuid)
  to authenticated, service_role;

-- =====================================================
-- Backfill initial : trust_score à 50 pour tous les profils existants
-- puis recalcul via la RPC pour ceux qui ont déjà des vérifications.
-- =====================================================
do $$
declare
  v_id uuid;
begin
  for v_id in select id from public.profiles loop
    perform public.recalculate_trust_score(v_id);
  end loop;
end;
$$;

comment on function public.recalculate_trust_score(uuid) is
  'Recalcule trust_score 0-100 d''un user (vérifications + ancienneté - sanctions actives).';
comment on function public.apply_sanction(uuid, smallint, text, uuid) is
  'Applique une sanction niveau 1-5, recalcule trust_score automatiquement.';
comment on function public.is_user_under_active_sanction(uuid) is
  'True si user a une sanction readonly/suspended/banned active.';
