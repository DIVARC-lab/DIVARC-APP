-- =====================================================
-- DIVARC — Migration 0073 : Messagerie étendue (Chantier 1 étape 1.1)
--
-- Étend les tables messages/conversations/conversation_members existantes
-- (0003, 0012, 0014, 0017) avec les colonnes nécessaires pour la
-- messagerie WhatsApp-grade :
--   - Types message étendus (14 types vs text/system)
--   - Types conversation étendus (5 types vs direct/group)
--   - Settings membre (pin/archive/mute/mute_until/nickname/color)
--   - Disparition auto (view_once, expires_at, screenshot_detected)
--   - Forwarding (forwarded_from + forward_count)
--   - Threading 3 niveaux (thread_root_id)
--   - Delivery status par destinataire (jsonb map)
--   - Pin in conv + starred + flags signal pour Conversations secrètes
--
-- Préparation Chantier 4 (Liens) : link_level, link_xp, link_streak_days
-- sur conversations (juste schema, pas encore alimenté).
--
-- E2E opt-in : colonnes encrypted_content + encryption_metadata
-- nullable. Si is_secret=true, body est NULL et encrypted_content est
-- rempli (déchiffré côté client uniquement).
--
-- BACKWARD COMPAT : toutes les colonnes nouvelles sont nullable ou ont
-- un default safe. Les 25 fichiers UI existants continuent de fonctionner
-- sans modification, juste avec les nouvelles colonnes ignorées.
-- =====================================================

-- =====================================================
-- 1. CONVERSATIONS : étendre type enum + nouvelles colonnes
-- =====================================================

-- Drop & re-add type check pour ajouter self/broadcast/channel
alter table public.conversations
  drop constraint if exists conversations_type_check;

alter table public.conversations
  add constraint conversations_type_check
  check (type in ('direct', 'group', 'self', 'broadcast', 'channel'));

alter table public.conversations
  add column if not exists description text
    check (description is null or char_length(description) <= 500),
  add column if not exists cover_url text
    check (cover_url is null or cover_url ~* '^https?://'),
  add column if not exists last_message_id uuid,
  /* Liens DIVARC (Chantier 4 — schema prêt, alimenté plus tard). */
  add column if not exists link_level integer not null default 1
    check (link_level between 1 and 7),
  add column if not exists link_xp integer not null default 0
    check (link_xp >= 0),
  add column if not exists link_streak_days integer not null default 0
    check (link_streak_days >= 0),
  add column if not exists last_meaningful_exchange_at timestamptz,
  /* Disparition auto au niveau de la conv (Éclats généralisés). */
  add column if not exists auto_delete_after_days integer
    check (auto_delete_after_days is null or auto_delete_after_days in (1, 7, 30));

-- FK last_message_id vers messages (deferred pour éviter circular dep
-- au seed initial)
alter table public.conversations
  drop constraint if exists conversations_last_message_fkey;

alter table public.conversations
  add constraint conversations_last_message_fkey
  foreign key (last_message_id)
  references public.messages(id)
  on delete set null
  deferrable initially deferred;

-- =====================================================
-- 2. CONVERSATION_MEMBERS : settings par membre
-- =====================================================
alter table public.conversation_members
  add column if not exists is_pinned boolean not null default false,
  add column if not exists is_archived boolean not null default false,
  add column if not exists is_muted boolean not null default false,
  add column if not exists mute_until timestamptz,
  add column if not exists nickname text
    check (nickname is null or char_length(nickname) <= 60),
  add column if not exists custom_color text
    check (custom_color is null or custom_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column if not exists can_send_media boolean not null default true,
  /* Indique si ce membre a activé "Conversation secrète" pour cette conv.
     Si ANY member active = la conv passe en mode E2E pour tous. */
  add column if not exists wants_secret boolean not null default false;

create index if not exists conversation_members_pinned_idx
  on public.conversation_members (user_id, is_pinned)
  where is_pinned = true;

create index if not exists conversation_members_archived_idx
  on public.conversation_members (user_id, is_archived)
  where is_archived = true;

-- =====================================================
-- 3. MESSAGES : types étendus + chiffrement + view_once + forward
-- =====================================================

-- Drop & re-add type check pour les 16 types
alter table public.messages
  drop constraint if exists messages_type_check;

alter table public.messages
  add constraint messages_type_check
  check (type in (
    'text', 'image', 'video', 'voice', 'audio', 'document',
    'location', 'location_live', 'contact', 'poll',
    'sticker', 'gif', 'link', 'payment',
    'system', 'call_record'
  ));

alter table public.messages
  /* Body devient nullable car si is_secret=true, body=null et
     encrypted_content est rempli. Pour les types non-text (image, voice,
     etc.), body peut aussi être null si l'attachement seul suffit. */
  alter column body drop not null;

alter table public.messages
  /* Chiffrement E2E opt-in (Conversations secrètes). */
  add column if not exists is_secret boolean not null default false,
  add column if not exists encrypted_content bytea,
  add column if not exists encryption_metadata jsonb,
  /* Disparition auto / view_once. */
  add column if not exists view_once boolean not null default false,
  add column if not exists view_once_viewed_at timestamptz,
  add column if not exists view_once_viewer_id uuid
    references auth.users(id) on delete set null,
  add column if not exists expires_at timestamptz,
  add column if not exists screenshot_detected boolean not null default false,
  /* Forwarding. */
  add column if not exists forwarded_from_message_id uuid
    references public.messages(id) on delete set null,
  add column if not exists forwarded_from_user_id uuid
    references auth.users(id) on delete set null,
  add column if not exists forward_count integer not null default 0
    check (forward_count >= 0),
  /* Threading 3 niveaux (root du thread auquel ce message appartient). */
  add column if not exists thread_root_id uuid
    references public.messages(id) on delete set null,
  /* Delivery status map { user_id: 'pending'|'sent'|'delivered'|'read'|'failed' }. */
  add column if not exists delivery_status jsonb not null default '{}'::jsonb,
  /* Pin/star. */
  add column if not exists is_pinned_in_conv boolean not null default false,
  add column if not exists starred_by_user_ids uuid[] not null default '{}'::uuid[];

-- Index pour view_once expiration cron
create index if not exists messages_expires_at_idx
  on public.messages (expires_at)
  where expires_at is not null and deleted_at is null;

-- Index pour thread queries
create index if not exists messages_thread_root_idx
  on public.messages (thread_root_id, created_at asc)
  where thread_root_id is not null;

-- Index pour conv secrètes (filtrage rapide)
create index if not exists messages_is_secret_idx
  on public.messages (conversation_id, is_secret);

-- Index pour pinned in conv
create index if not exists messages_pinned_in_conv_idx
  on public.messages (conversation_id)
  where is_pinned_in_conv = true;

-- =====================================================
-- 4. Trigger : mettre à jour conversations.last_message_id (en plus de
-- last_message_at déjà fait par bump_conversation_last_message).
-- =====================================================
create or replace function public.bump_conversation_last_message_id()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
     set last_message_id = new.id,
         last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_bump_last_message on public.messages;
create trigger messages_bump_last_message
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message_id();

-- =====================================================
-- 5. RPC : marquer un view_once message comme vu
-- =====================================================
create or replace function public.mark_view_once_viewed(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  msg_row record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  /* Vérifie que l'user est membre de la conv et que le message est
     view_once non encore vu. */
  select m.id, m.view_once, m.view_once_viewed_at, m.conversation_id,
         m.sender_id
    into msg_row
    from public.messages m
   where m.id = p_message_id
     and public.is_conversation_member(m.conversation_id);

  if msg_row.id is null then
    raise exception 'message not found or not a member';
  end if;

  if not msg_row.view_once then
    return; -- pas un view_once, no-op
  end if;

  if msg_row.view_once_viewed_at is not null then
    raise exception 'already viewed';
  end if;

  if msg_row.sender_id = auth.uid() then
    return; -- propre message, on ne le marque pas
  end if;

  update public.messages
     set view_once_viewed_at = now(),
         view_once_viewer_id = auth.uid()
   where id = p_message_id;
end;
$$;

grant execute on function public.mark_view_once_viewed(uuid) to authenticated;

-- =====================================================
-- 6. RPC : signaler une capture d'écran (mobile/desktop best-effort)
-- =====================================================
create or replace function public.flag_screenshot_detected(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  update public.messages
     set screenshot_detected = true
   where id = p_message_id
     and public.is_conversation_member(conversation_id);
end;
$$;

grant execute on function public.flag_screenshot_detected(uuid) to authenticated;

-- =====================================================
-- 7. RPC : toggle pin/archive/mute pour le membre courant
-- =====================================================
create or replace function public.toggle_conversation_pin(p_conv_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  new_state boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  update public.conversation_members
     set is_pinned = not is_pinned
   where conversation_id = p_conv_id
     and user_id = auth.uid()
  returning is_pinned into new_state;

  return coalesce(new_state, false);
end;
$$;

grant execute on function public.toggle_conversation_pin(uuid) to authenticated;

create or replace function public.toggle_conversation_archive(p_conv_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  new_state boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  update public.conversation_members
     set is_archived = not is_archived
   where conversation_id = p_conv_id
     and user_id = auth.uid()
  returning is_archived into new_state;

  return coalesce(new_state, false);
end;
$$;

grant execute on function public.toggle_conversation_archive(uuid) to authenticated;

create or replace function public.set_conversation_mute(
  p_conv_id uuid,
  p_muted boolean,
  p_until timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  update public.conversation_members
     set is_muted = p_muted,
         mute_until = case when p_muted then p_until else null end
   where conversation_id = p_conv_id
     and user_id = auth.uid();
end;
$$;

grant execute on function public.set_conversation_mute(uuid, boolean, timestamptz)
  to authenticated;

-- =====================================================
-- 8. RPC : create self conversation ("Saved Messages" style)
-- =====================================================
create or replace function public.get_or_create_self_conversation()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  conv_id uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select c.id into conv_id
    from public.conversations c
   where c.type = 'self'
     and c.created_by = uid
   limit 1;

  if conv_id is not null then return conv_id; end if;

  insert into public.conversations (type, name, created_by)
       values ('self', 'Mes notes', uid)
    returning id into conv_id;

  insert into public.conversation_members (conversation_id, user_id, role)
       values (conv_id, uid, 'owner');

  return conv_id;
end;
$$;

grant execute on function public.get_or_create_self_conversation() to authenticated;
