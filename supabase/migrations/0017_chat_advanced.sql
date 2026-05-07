-- =====================================================
-- DIVARC — Migration 0017 : Chat WhatsApp-grade
--   - Réactions emoji
--   - Réponse à un message
-- =====================================================

-- 1. Colonne reply_to_message_id sur messages
alter table public.messages
  add column if not exists reply_to_message_id uuid
    references public.messages(id) on delete set null;

create index if not exists messages_reply_to_idx
  on public.messages (reply_to_message_id)
  where reply_to_message_id is not null;

-- 2. message_reactions table (conversation_id dénormalisé pour realtime filter)
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index if not exists message_reactions_message_id_idx
  on public.message_reactions (message_id);

create index if not exists message_reactions_conversation_id_idx
  on public.message_reactions (conversation_id);

-- 3. Trigger : remplir conversation_id automatiquement depuis le message
create or replace function public.set_message_reaction_conversation_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.conversation_id is null then
    select conversation_id into new.conversation_id
      from public.messages where id = new.message_id;
  end if;
  return new;
end;
$$;

drop trigger if exists message_reactions_set_conv on public.message_reactions;
create trigger message_reactions_set_conv
  before insert on public.message_reactions
  for each row execute function public.set_message_reaction_conversation_id();

-- 4. RLS — message_reactions
alter table public.message_reactions enable row level security;

drop policy if exists "members can read reactions" on public.message_reactions;
create policy "members can read reactions"
  on public.message_reactions for select
  using (public.is_conversation_member(conversation_id));

drop policy if exists "members can react" on public.message_reactions;
create policy "members can react"
  on public.message_reactions for insert
  with check (
    user_id = auth.uid()
    and public.is_conversation_member(conversation_id)
  );

drop policy if exists "users delete own reactions" on public.message_reactions;
create policy "users delete own reactions"
  on public.message_reactions for delete
  using (user_id = auth.uid());

-- 5. Realtime (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'message_reactions'
  ) then
    alter publication supabase_realtime add table public.message_reactions;
  end if;
end $$;
