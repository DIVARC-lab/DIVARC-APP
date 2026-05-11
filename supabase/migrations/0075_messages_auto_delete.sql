-- Chantier 1.6 : Éclats (view-once + auto-delete)
--
-- Cette migration ajoute :
--   1. Trigger BEFORE INSERT sur messages qui peuple expires_at quand la
--      conversation a auto_delete_after_days configuré (et que l'insert
--      ne fournit pas déjà un expires_at explicite — view-once flow).
--   2. RPC purge_expired_messages() : soft-delete les messages dont
--      expires_at < now() (à appeler via cron Supabase ou edge function).
--   3. RPC set_conversation_auto_delete(conv_id, days) : helper pour
--      configurer auto_delete_after_days (1/7/30 ou null pour disable).

-- =====================================================
-- 1. Trigger : populate expires_at from conv.auto_delete_after_days
-- =====================================================
create or replace function public.set_message_expires_at()
returns trigger
language plpgsql
as $$
declare
  conv_auto_delete integer;
begin
  -- Si l'insert spécifie déjà expires_at (ex: view-once 24h), on respecte.
  if new.expires_at is not null then
    return new;
  end if;

  select c.auto_delete_after_days into conv_auto_delete
    from public.conversations c
   where c.id = new.conversation_id;

  if conv_auto_delete is not null then
    new.expires_at := now() + (conv_auto_delete || ' days')::interval;
  end if;

  return new;
end;
$$;

drop trigger if exists messages_set_expires_at on public.messages;
create trigger messages_set_expires_at
  before insert on public.messages
  for each row
  execute function public.set_message_expires_at();

-- =====================================================
-- 2. RPC : purge_expired_messages — soft-delete les messages expirés
-- =====================================================
create or replace function public.purge_expired_messages()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  update public.messages
     set deleted_at = now()
   where expires_at is not null
     and expires_at < now()
     and deleted_at is null;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Service role uniquement (cron), pas exposé aux clients.
revoke execute on function public.purge_expired_messages() from public, authenticated;

-- =====================================================
-- 3. RPC : set_conversation_auto_delete
-- =====================================================
create or replace function public.set_conversation_auto_delete(
  p_conv_id uuid,
  p_days integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  -- Vérifie que l'user est membre (sinon RLS, mais on garde belt-and-braces).
  if not exists (
    select 1 from public.conversation_members
     where conversation_id = p_conv_id
       and user_id = auth.uid()
  ) then
    raise exception 'not a member of this conversation';
  end if;

  if p_days is not null and p_days not in (1, 7, 30) then
    raise exception 'auto_delete_after_days must be 1, 7, 30 or null';
  end if;

  update public.conversations
     set auto_delete_after_days = p_days
   where id = p_conv_id;
end;
$$;

grant execute on function public.set_conversation_auto_delete(uuid, integer)
  to authenticated;
