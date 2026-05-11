-- =====================================================
-- DIVARC — Migration 0074 : Signal Protocol clés publiques (Chantier 1.2a)
--
-- Tables pour stocker les clés PUBLIQUES du protocole Signal côté
-- serveur. Les clés PRIVÉES sont stockées dans IndexedDB chiffré côté
-- client UNIQUEMENT — le serveur ne les voit jamais.
--
-- Architecture Signal Protocol (X3DH + Double Ratchet) :
--   1. À l'inscription, le client génère :
--      - 1 IdentityKey (long-lived, jamais rotated)
--      - 1 SignedPreKey (rotated périodiquement, signed par identity)
--      - 100 OneTimePreKeys (chacune consommée 1× pour une session)
--   2. Pour démarrer une session avec Alice, Bob fetch son "PreKeyBundle"
--      = { identity_key, signed_prekey + signature, one_time_prekey }
--   3. Bob "consomme" la one_time_prekey (delete server-side) → forward
--      secrecy.
--   4. Une fois la session établie, les messages sont chiffrés via
--      Double Ratchet (clés évoluent à chaque message).
--
-- Référence : https://signal.org/docs/specifications/x3dh/
-- =====================================================

-- =====================================================
-- 1. signal_identity_keys : 1 row par user, clé identité publique
-- =====================================================
create table if not exists public.signal_identity_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  /* Curve25519 public key, encoded en base64. ~32 bytes raw → ~44 chars. */
  public_key text not null check (char_length(public_key) between 32 and 256),
  /* Registration ID Signal Protocol (entier 14-bit). */
  registration_id integer not null check (registration_id between 1 and 16383),
  /* Device ID si l'user a plusieurs devices. V1 : single device par user
     (always 1). V2 : multi-device. */
  device_id integer not null default 1 check (device_id between 1 and 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists signal_identity_keys_set_updated_at
  on public.signal_identity_keys;
create trigger signal_identity_keys_set_updated_at
  before update on public.signal_identity_keys
  for each row execute function public.set_updated_at();

-- =====================================================
-- 2. signal_signed_prekeys : 1 active par user, rotated périodiquement
-- =====================================================
create table if not exists public.signal_signed_prekeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  /* Key ID local pour ce prekey (entier 24-bit). */
  prekey_id integer not null check (prekey_id between 1 and 16777215),
  public_key text not null check (char_length(public_key) between 32 and 256),
  /* Signature de public_key par la identity key (proof). */
  signature text not null check (char_length(signature) between 32 and 256),
  /* État : 'active' = utilisable, 'rotated' = remplacé mais conservé. */
  status text not null default 'active'
    check (status in ('active', 'rotated', 'compromised')),
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  unique (user_id, prekey_id)
);

create index if not exists signal_signed_prekeys_user_active_idx
  on public.signal_signed_prekeys (user_id)
  where status = 'active';

-- =====================================================
-- 3. signal_one_time_prekeys : pool de 100 OTPK par user
-- =====================================================
create table if not exists public.signal_one_time_prekeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prekey_id integer not null check (prekey_id between 1 and 16777215),
  public_key text not null check (char_length(public_key) between 32 and 256),
  /* État : 'available' = peut être consommée, 'consumed' = utilisée. */
  consumed_at timestamptz,
  /* Optionnel : par qui (pour audit / cleanup). */
  consumed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, prekey_id)
);

create index if not exists signal_otpk_user_available_idx
  on public.signal_one_time_prekeys (user_id, prekey_id)
  where consumed_at is null;

-- =====================================================
-- 4. signal_sessions : tracking meta sessions actives (pas le contenu)
-- =====================================================
create table if not exists public.signal_sessions (
  id uuid primary key default gen_random_uuid(),
  /* Conversation associée (1 session par couple {user, autre_user} dans
     le contexte d'une conv direct ; pour les groupes, sender keys
     séparées V2). */
  conversation_id uuid not null references public.conversations(id)
    on delete cascade,
  /* Les 2 users de la session direct. user_a < user_b lexicographique
     pour unicité. */
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  /* État de la session. */
  established_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_ratchet_at timestamptz,
  /* Métadonnées Double Ratchet (compteurs, pas les clés). */
  message_count integer not null default 0,
  /* Si compromis détecté (key reset, etc.) */
  is_compromised boolean not null default false,
  compromised_at timestamptz,
  unique (conversation_id, user_a, user_b),
  constraint signal_session_users_ordered check (user_a < user_b)
);

create index if not exists signal_sessions_conv_idx
  on public.signal_sessions (conversation_id);

create index if not exists signal_sessions_user_idx
  on public.signal_sessions (user_a, user_b)
  where is_compromised = false;

-- =====================================================
-- 5. signal_safety_numbers : verify keys (QR + 60 digits)
-- =====================================================
-- Pour vérifier qu'on parle bien à la bonne personne (anti-MITM), Signal
-- fournit un "safety number" : 60 chiffres dérivés des 2 identity keys.
-- Les users comparent (en personne / QR / vocal) et mark la conv comme
-- vérifiée. Ce row stocke le hash + status.
create table if not exists public.signal_safety_numbers (
  id uuid primary key default gen_random_uuid(),
  /* Les 2 users (ordonnés). */
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  /* Le safety number 60-digit (lisible). */
  safety_number text not null check (char_length(safety_number) = 60),
  /* Hash SHA-256 pour comparaison rapide (au cas où on en change). */
  safety_number_hash text not null check (char_length(safety_number_hash) = 64),
  /* État de vérification : si vérifié par les 2 users. */
  verified_by_a boolean not null default false,
  verified_by_b boolean not null default false,
  verified_a_at timestamptz,
  verified_b_at timestamptz,
  /* Marquer si le safety number a changé (re-installation device, reset
     keys, etc.). Le user doit re-vérifier. */
  changed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  constraint safety_users_ordered check (user_a < user_b)
);

create index if not exists signal_safety_numbers_users_idx
  on public.signal_safety_numbers (user_a, user_b);

-- =====================================================
-- RLS
-- =====================================================
alter table public.signal_identity_keys enable row level security;
alter table public.signal_signed_prekeys enable row level security;
alter table public.signal_one_time_prekeys enable row level security;
alter table public.signal_sessions enable row level security;
alter table public.signal_safety_numbers enable row level security;

-- identity_keys : SELECT public (tous les users authentifiés peuvent
-- récupérer l'identity_key d'un autre user pour démarrer une session).
-- INSERT/UPDATE owner only.
drop policy if exists "identity keys public read" on public.signal_identity_keys;
create policy "identity keys public read"
  on public.signal_identity_keys for select
  using (auth.uid() is not null);

drop policy if exists "owner manages own identity key" on public.signal_identity_keys;
create policy "owner manages own identity key"
  on public.signal_identity_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- signed_prekeys : SELECT pour les keys actives uniquement (pas les
-- rotated). RW owner only.
drop policy if exists "signed prekeys active read" on public.signal_signed_prekeys;
create policy "signed prekeys active read"
  on public.signal_signed_prekeys for select
  using (auth.uid() is not null and status = 'active');

drop policy if exists "owner manages own signed prekeys" on public.signal_signed_prekeys;
create policy "owner manages own signed prekeys"
  on public.signal_signed_prekeys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- one_time_prekeys : SELECT pour les available, UPDATE par
-- consume_one_time_prekey RPC, RW owner only pour le reste.
drop policy if exists "otpk available read" on public.signal_one_time_prekeys;
create policy "otpk available read"
  on public.signal_one_time_prekeys for select
  using (auth.uid() is not null);

drop policy if exists "owner manages own otpk" on public.signal_one_time_prekeys;
create policy "owner manages own otpk"
  on public.signal_one_time_prekeys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- signal_sessions : SELECT par les 2 users de la session, RW owner only.
drop policy if exists "session participants read" on public.signal_sessions;
create policy "session participants read"
  on public.signal_sessions for select
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "session participants update" on public.signal_sessions;
create policy "session participants update"
  on public.signal_sessions for update
  using (auth.uid() = user_a or auth.uid() = user_b);

-- safety_numbers : SELECT/UPDATE par les 2 users uniquement.
drop policy if exists "safety participants read" on public.signal_safety_numbers;
create policy "safety participants read"
  on public.signal_safety_numbers for select
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "safety participants update" on public.signal_safety_numbers;
create policy "safety participants update"
  on public.signal_safety_numbers for update
  using (auth.uid() = user_a or auth.uid() = user_b);

-- =====================================================
-- RPC : consume_one_time_prekey (atomique, retourne la clé consommée)
-- =====================================================
-- Pour démarrer une session avec Alice, Bob appelle ce RPC. Le serveur
-- mark la clé comme consommée + retourne sa publique. Une fois consommée,
-- elle n'est plus dispo pour personne (forward secrecy).
create or replace function public.consume_one_time_prekey(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  selected_id uuid;
  selected_prekey_id integer;
  selected_public_key text;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  /* Lock + take 1 available OTPK */
  select id, prekey_id, public_key
    into selected_id, selected_prekey_id, selected_public_key
    from public.signal_one_time_prekeys
   where user_id = p_target_user_id
     and consumed_at is null
   order by created_at asc
   limit 1
   for update skip locked;

  if selected_id is null then
    /* Pas d'OTPK dispo. La session peut quand même démarrer en utilisant
       seulement identity + signed_prekey (mode X3DH dégradé, légèrement
       moins sécurisé). Le client gère ça. */
    return null;
  end if;

  update public.signal_one_time_prekeys
     set consumed_at = now(),
         consumed_by_user_id = uid
   where id = selected_id;

  return jsonb_build_object(
    'prekey_id', selected_prekey_id,
    'public_key', selected_public_key
  );
end;
$$;

grant execute on function public.consume_one_time_prekey(uuid) to authenticated;

-- =====================================================
-- RPC : get_prekey_bundle (récupère tout ce qu'il faut pour démarrer
-- une session X3DH avec un user)
-- =====================================================
create or replace function public.get_prekey_bundle(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  identity_row record;
  signed_row record;
  otpk_row jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  /* 1. Identity key */
  select public_key, registration_id, device_id
    into identity_row
    from public.signal_identity_keys
   where user_id = p_target_user_id;

  if identity_row.public_key is null then
    raise exception 'target user has no Signal identity yet';
  end if;

  /* 2. Active signed prekey */
  select prekey_id, public_key, signature
    into signed_row
    from public.signal_signed_prekeys
   where user_id = p_target_user_id
     and status = 'active'
   order by created_at desc
   limit 1;

  if signed_row.prekey_id is null then
    raise exception 'target user has no active signed prekey';
  end if;

  /* 3. Consume one one-time prekey (peut être null si pool vide). */
  select public.consume_one_time_prekey(p_target_user_id) into otpk_row;

  result := jsonb_build_object(
    'identity_key', identity_row.public_key,
    'registration_id', identity_row.registration_id,
    'device_id', identity_row.device_id,
    'signed_prekey', jsonb_build_object(
      'key_id', signed_row.prekey_id,
      'public_key', signed_row.public_key,
      'signature', signed_row.signature
    ),
    'one_time_prekey', otpk_row
  );

  return result;
end;
$$;

grant execute on function public.get_prekey_bundle(uuid) to authenticated;

-- =====================================================
-- RPC : count_my_available_one_time_prekeys (pour décider si top-up)
-- =====================================================
create or replace function public.count_my_available_otpk()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
    from public.signal_one_time_prekeys
   where user_id = auth.uid()
     and consumed_at is null;
$$;

grant execute on function public.count_my_available_otpk() to authenticated;

-- =====================================================
-- RPC : mark_safety_verified (l'user a vérifié le safety number)
-- =====================================================
create or replace function public.mark_safety_verified(p_other_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ua uuid;
  ub uuid;
  is_a boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  /* Ordonne user_a < user_b */
  if uid < p_other_user_id then
    ua := uid; ub := p_other_user_id; is_a := true;
  else
    ua := p_other_user_id; ub := uid; is_a := false;
  end if;

  if is_a then
    update public.signal_safety_numbers
       set verified_by_a = true, verified_a_at = now()
     where user_a = ua and user_b = ub;
  else
    update public.signal_safety_numbers
       set verified_by_b = true, verified_b_at = now()
     where user_a = ua and user_b = ub;
  end if;
end;
$$;

grant execute on function public.mark_safety_verified(uuid) to authenticated;
