-- Chantier 2.1 : Appels audio 1:1 P2P (WebRTC + Supabase Realtime signaling)
--
-- Table call_sessions :
--   Trace les appels (ringing → connecting → in_progress → ended/missed/rejected)
--   + durée calculée à la fermeture.
--   Pas de stockage des SDP/ICE (échangés via Realtime channel, éphémères).

-- =====================================================
-- 1. Enum call_status
-- =====================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'call_status') then
    create type public.call_status as enum (
      'ringing',       -- offer envoyé, en attente de réponse
      'connecting',    -- accept, ICE en cours
      'in_progress',   -- connecté, media flowing
      'ended',         -- raccroché normalement
      'missed',        -- callee n'a pas répondu (timeout)
      'rejected',      -- callee a refusé
      'failed'         -- erreur technique (ICE failed, network, etc.)
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'call_kind') then
    create type public.call_kind as enum ('audio', 'video');
  end if;
end $$;

-- =====================================================
-- 2. Table call_sessions
-- =====================================================
create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  caller_id uuid not null references auth.users(id) on delete cascade,
  callee_id uuid not null references auth.users(id) on delete cascade,
  kind public.call_kind not null default 'audio',
  status public.call_status not null default 'ringing',
  started_at timestamptz not null default now(),
  connected_at timestamptz,
  ended_at timestamptz,
  duration_ms integer,
  end_reason text,
  constraint different_parties check (caller_id <> callee_id)
);

create index if not exists call_sessions_conversation_idx
  on public.call_sessions (conversation_id, started_at desc);
create index if not exists call_sessions_caller_idx
  on public.call_sessions (caller_id, started_at desc);
create index if not exists call_sessions_callee_idx
  on public.call_sessions (callee_id, started_at desc);
create index if not exists call_sessions_status_idx
  on public.call_sessions (status)
  where status in ('ringing', 'connecting', 'in_progress');

-- =====================================================
-- 3. RLS : caller/callee peuvent lire, caller peut créer
-- =====================================================
alter table public.call_sessions enable row level security;

drop policy if exists "call_sessions_select_participants" on public.call_sessions;
create policy "call_sessions_select_participants"
  on public.call_sessions for select
  to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id);

drop policy if exists "call_sessions_insert_caller" on public.call_sessions;
create policy "call_sessions_insert_caller"
  on public.call_sessions for insert
  to authenticated
  with check (auth.uid() = caller_id);

drop policy if exists "call_sessions_update_participants" on public.call_sessions;
create policy "call_sessions_update_participants"
  on public.call_sessions for update
  to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id)
  with check (auth.uid() = caller_id or auth.uid() = callee_id);

-- =====================================================
-- 4. RPC : create_call_session — auto-détecte callee depuis la conv
-- =====================================================
create or replace function public.create_call_session(
  p_conversation_id uuid,
  p_kind public.call_kind default 'audio'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  callee_id uuid;
  conv_type text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  -- Vérifie que c'est une conv directe (V1 limit)
  select c.type::text into conv_type
    from public.conversations c
   where c.id = p_conversation_id;
  if conv_type is null then
    raise exception 'conversation not found';
  end if;
  if conv_type <> 'direct' then
    raise exception 'calls only supported on direct conversations in V1';
  end if;

  -- Trouve le callee : l'autre membre de la conv direct
  select user_id into callee_id
    from public.conversation_members
   where conversation_id = p_conversation_id
     and user_id <> auth.uid()
   limit 1;
  if callee_id is null then
    raise exception 'no peer found in conversation';
  end if;

  insert into public.call_sessions (
    conversation_id, caller_id, callee_id, kind, status
  ) values (
    p_conversation_id, auth.uid(), callee_id, p_kind, 'ringing'
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.create_call_session(uuid, public.call_kind)
  to authenticated;

-- =====================================================
-- 5. RPC : end_call_session — termine et calcule la durée
-- =====================================================
create or replace function public.end_call_session(
  p_call_id uuid,
  p_status public.call_status,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  row_record record;
  now_ts timestamptz := now();
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into row_record
    from public.call_sessions
   where id = p_call_id
     and (caller_id = auth.uid() or callee_id = auth.uid());

  if row_record is null then
    raise exception 'call not found or not authorized';
  end if;

  -- Statuts terminaux uniquement
  if p_status not in ('ended', 'missed', 'rejected', 'failed') then
    raise exception 'invalid terminal status';
  end if;

  update public.call_sessions
     set status = p_status,
         ended_at = now_ts,
         duration_ms = case
           when connected_at is not null
             then extract(epoch from (now_ts - connected_at))::integer * 1000
           else 0
         end,
         end_reason = p_reason
   where id = p_call_id;
end;
$$;

grant execute on function public.end_call_session(uuid, public.call_status, text)
  to authenticated;

-- =====================================================
-- 6. RPC : mark_call_connected — bascule en in_progress quand ICE est OK
-- =====================================================
create or replace function public.mark_call_connected(p_call_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  update public.call_sessions
     set status = 'in_progress',
         connected_at = now()
   where id = p_call_id
     and (caller_id = auth.uid() or callee_id = auth.uid())
     and connected_at is null;
end;
$$;

grant execute on function public.mark_call_connected(uuid) to authenticated;

-- =====================================================
-- 7. Realtime : activer broadcast sur la table pour réactivité UI
-- =====================================================
-- Note : pour le signaling SDP/ICE on utilise des channels Realtime
-- éphémères côté client, pas la table. La table sert juste à l'historique.
alter publication supabase_realtime add table public.call_sessions;
