-- Chantier 2 polish V1.1 : message système inséré automatiquement après
-- chaque appel terminé (ended/missed/rejected/failed) pour qu'il
-- apparaisse dans le thread MessageBubble (type='system').
--
-- Trigger sur UPDATE call_sessions quand status passe à un état terminal.

create or replace function public.insert_call_system_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  msg_body text;
  caller_name text;
  duration_label text;
begin
  -- Ne déclenche que si le status passe à un état terminal et ne l'était
  -- pas déjà (évite re-tirage si on update plusieurs fois)
  if new.status not in ('ended', 'missed', 'rejected', 'failed') then
    return new;
  end if;
  if old.status = new.status then
    return new;
  end if;
  if old.status in ('ended', 'missed', 'rejected', 'failed') then
    return new; -- déjà terminé une fois, pas de duplication
  end if;

  -- Récupère le nom du caller pour le label
  select coalesce(p.full_name, p.username, 'Quelqu''un') into caller_name
    from public.profiles p
   where p.id = new.caller_id;

  -- Compose le body selon le statut
  if new.status = 'ended' then
    if new.duration_ms is not null and new.duration_ms > 0 then
      duration_label := format(
        '%s:%s',
        floor(new.duration_ms / 60000)::text,
        lpad(floor((new.duration_ms / 1000) % 60)::text, 2, '0')
      );
      msg_body := format('📞 Appel · %s', duration_label);
    else
      msg_body := '📞 Appel terminé';
    end if;
  elsif new.status = 'missed' then
    msg_body := '📞 Appel manqué';
  elsif new.status = 'rejected' then
    msg_body := '📞 Appel refusé';
  else -- failed
    msg_body := '⚠️ Appel échoué';
  end if;

  -- Insert le message système. Le trigger XP (Chantier 4) skip type='system'
  -- donc pas de XP gagné pour ça.
  insert into public.messages (
    conversation_id, sender_id, type, body
  ) values (
    new.conversation_id, new.caller_id, 'system', msg_body
  );

  return new;
end;
$$;

drop trigger if exists call_sessions_system_message on public.call_sessions;
create trigger call_sessions_system_message
  after update on public.call_sessions
  for each row execute function public.insert_call_system_message();
