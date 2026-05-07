-- =====================================================
-- DIVARC — Migration 0003 : Messagerie temps réel
-- =====================================================

-- 1. conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct', 'group')),
  name text,
  avatar_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists conversations_last_message_at_idx
  on public.conversations (last_message_at desc);

-- 2. conversation_members table
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  role text not null default 'member' check (role in ('owner', 'member')),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_members_user_id_idx
  on public.conversation_members (user_id);

-- 3. messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  type text not null default 'text' check (type in ('text', 'system')),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at desc);

-- 4. helper: check if current user is a member of a conversation
create or replace function public.is_conversation_member(conv_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.conversation_members
     where conversation_id = conv_id
       and user_id = auth.uid()
  );
$$;

grant execute on function public.is_conversation_member(uuid) to authenticated;

-- 5. RLS: conversations
alter table public.conversations enable row level security;

drop policy if exists "members can view conversations" on public.conversations;
create policy "members can view conversations"
  on public.conversations for select
  using (public.is_conversation_member(id));

drop policy if exists "authenticated can create conversations" on public.conversations;
create policy "authenticated can create conversations"
  on public.conversations for insert
  with check (auth.uid() = created_by);

drop policy if exists "creator can update conversations" on public.conversations;
create policy "creator can update conversations"
  on public.conversations for update
  using (auth.uid() = created_by);

-- 6. RLS: conversation_members
alter table public.conversation_members enable row level security;

drop policy if exists "members can see fellow members" on public.conversation_members;
create policy "members can see fellow members"
  on public.conversation_members for select
  using (public.is_conversation_member(conversation_id));

drop policy if exists "users can update own membership" on public.conversation_members;
create policy "users can update own membership"
  on public.conversation_members for update
  using (auth.uid() = user_id);

drop policy if exists "users can leave conversation" on public.conversation_members;
create policy "users can leave conversation"
  on public.conversation_members for delete
  using (auth.uid() = user_id);

-- (insert pour conversation_members géré uniquement via la RPC ci-dessous)

-- 7. RLS: messages
alter table public.messages enable row level security;

drop policy if exists "members can read messages" on public.messages;
create policy "members can read messages"
  on public.messages for select
  using (public.is_conversation_member(conversation_id));

drop policy if exists "members can send messages" on public.messages;
create policy "members can send messages"
  on public.messages for insert
  with check (
    public.is_conversation_member(conversation_id)
    and auth.uid() = sender_id
  );

drop policy if exists "senders can edit own messages" on public.messages;
create policy "senders can edit own messages"
  on public.messages for update
  using (auth.uid() = sender_id);

-- 8. Trigger: bump conversations.last_message_at on new message
create or replace function public.bump_conversation_last_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
     set last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_bump_last_message on public.messages;
create trigger messages_bump_last_message
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message();

-- 9. RPC: get or create a direct conversation between current user and other_user_id
create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid;
  conv_id uuid;
begin
  current_uid := auth.uid();

  if current_uid is null then
    raise exception 'not authenticated';
  end if;

  if current_uid = other_user_id then
    raise exception 'cannot create a direct conversation with yourself';
  end if;

  -- Look for existing direct conversation between the two users
  select c.id
    into conv_id
    from public.conversations c
   where c.type = 'direct'
     and exists (
       select 1
         from public.conversation_members cm
        where cm.conversation_id = c.id
          and cm.user_id = current_uid
     )
     and exists (
       select 1
         from public.conversation_members cm
        where cm.conversation_id = c.id
          and cm.user_id = other_user_id
     )
   limit 1;

  if conv_id is not null then
    return conv_id;
  end if;

  -- Create a new conversation
  insert into public.conversations (type, created_by)
       values ('direct', current_uid)
    returning id into conv_id;

  insert into public.conversation_members (conversation_id, user_id, role)
       values
         (conv_id, current_uid, 'owner'),
         (conv_id, other_user_id, 'member');

  return conv_id;
end;
$$;

grant execute
  on function public.get_or_create_direct_conversation(uuid)
  to authenticated;

-- 10. RPC: mark a conversation as read (updates last_read_at)
create or replace function public.mark_conversation_read(conv_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.conversation_members
     set last_read_at = now()
   where conversation_id = conv_id
     and user_id = auth.uid();
end;
$$;

grant execute
  on function public.mark_conversation_read(uuid)
  to authenticated;

-- 11. Enable realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_members;
