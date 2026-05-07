-- =====================================================
-- DIVARC — Migration 0013 : Conversations de groupe
-- =====================================================

-- 1. RPC : créer un groupe avec une liste de membres
create or replace function public.create_group_conversation(
  group_name text,
  member_ids uuid[],
  group_avatar_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid;
  conv_id uuid;
  member_id uuid;
  trimmed_name text;
  creator_name text;
begin
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'not authenticated';
  end if;

  trimmed_name := trim(group_name);
  if trimmed_name is null or char_length(trimmed_name) < 2 or char_length(trimmed_name) > 80 then
    raise exception 'group name must be between 2 and 80 characters';
  end if;

  if member_ids is null or array_length(member_ids, 1) < 1 then
    raise exception 'at least one other member is required';
  end if;

  if array_length(member_ids, 1) > 50 then
    raise exception 'group cannot exceed 51 members';
  end if;

  -- Vérifier que tous les membres sont amis avec le créateur
  foreach member_id in array member_ids loop
    if member_id = current_uid then
      raise exception 'creator is added automatically';
    end if;
    if not public.are_friends(current_uid, member_id) then
      raise exception 'all members must be friends with the creator';
    end if;
  end loop;

  -- Créer la conversation
  insert into public.conversations (type, name, avatar_url, created_by)
    values ('group', trimmed_name, group_avatar_url, current_uid)
    returning id into conv_id;

  -- Ajouter le créateur en owner
  insert into public.conversation_members (conversation_id, user_id, role)
    values (conv_id, current_uid, 'owner');

  -- Ajouter les autres membres
  foreach member_id in array member_ids loop
    insert into public.conversation_members (conversation_id, user_id, role)
      values (conv_id, member_id, 'member')
      on conflict do nothing;
  end loop;

  -- Message système d'ouverture
  select coalesce(full_name, username, 'Quelqu''un') into creator_name
    from public.profiles where id = current_uid;

  insert into public.messages (conversation_id, sender_id, body, type)
    values (
      conv_id,
      current_uid,
      coalesce(creator_name, 'Quelqu''un') || ' a créé le groupe « ' || trimmed_name || ' » ✨',
      'system'
    );

  return conv_id;
end;
$$;

grant execute on function public.create_group_conversation(text, uuid[], text)
  to authenticated;

-- 2. RPC : ajouter un membre à un groupe (owner uniquement, ami du créateur)
create or replace function public.add_group_member(
  conv_id uuid,
  new_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid;
  conv_record record;
  is_owner boolean;
  new_member_name text;
  current_user_name text;
begin
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'not authenticated';
  end if;

  select id, type, created_by into conv_record
    from public.conversations where id = conv_id;
  if conv_record.id is null then
    raise exception 'conversation not found';
  end if;
  if conv_record.type <> 'group' then
    raise exception 'cannot add members to a direct conversation';
  end if;

  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv_id
      and user_id = current_uid
      and role = 'owner'
  ) into is_owner;

  if not is_owner then
    raise exception 'only the owner can add members';
  end if;

  if new_member_id = current_uid then
    raise exception 'you are already in the group';
  end if;

  if not public.are_friends(current_uid, new_member_id) then
    raise exception 'new member must be a friend';
  end if;

  insert into public.conversation_members (conversation_id, user_id, role)
    values (conv_id, new_member_id, 'member')
    on conflict do nothing;

  select coalesce(full_name, username, 'Quelqu''un') into new_member_name
    from public.profiles where id = new_member_id;
  select coalesce(full_name, username, 'Quelqu''un') into current_user_name
    from public.profiles where id = current_uid;

  insert into public.messages (conversation_id, sender_id, body, type)
    values (
      conv_id,
      current_uid,
      coalesce(current_user_name, 'Quelqu''un') || ' a ajouté ' || coalesce(new_member_name, 'un nouveau membre'),
      'system'
    );
end;
$$;

grant execute on function public.add_group_member(uuid, uuid) to authenticated;

-- 3. RPC : retirer un membre (owner peut tout, member peut se retirer)
create or replace function public.remove_group_member(
  conv_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid;
  conv_record record;
  is_owner boolean;
  target_name text;
  current_name text;
  remaining_count integer;
begin
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'not authenticated';
  end if;

  select id, type, created_by into conv_record
    from public.conversations where id = conv_id;
  if conv_record.id is null or conv_record.type <> 'group' then
    raise exception 'group not found';
  end if;

  if target_user_id = current_uid then
    -- Self-leave : autorisé
    null;
  else
    -- Owner peut retirer
    select exists (
      select 1 from public.conversation_members
      where conversation_id = conv_id
        and user_id = current_uid
        and role = 'owner'
    ) into is_owner;
    if not is_owner then
      raise exception 'only the owner can remove other members';
    end if;
    if target_user_id = conv_record.created_by then
      raise exception 'creator cannot be removed';
    end if;
  end if;

  delete from public.conversation_members
    where conversation_id = conv_id and user_id = target_user_id;

  select coalesce(full_name, username, 'Quelqu''un') into target_name
    from public.profiles where id = target_user_id;
  select coalesce(full_name, username, 'Quelqu''un') into current_name
    from public.profiles where id = current_uid;

  insert into public.messages (conversation_id, sender_id, body, type)
    values (
      conv_id,
      current_uid,
      case
        when target_user_id = current_uid then
          coalesce(current_name, 'Quelqu''un') || ' a quitté le groupe'
        else
          coalesce(current_name, 'Quelqu''un') || ' a retiré ' || coalesce(target_name, 'un membre')
      end,
      'system'
    );

  -- Si le groupe est vide, on le supprime
  select count(*) into remaining_count
    from public.conversation_members where conversation_id = conv_id;
  if remaining_count = 0 then
    delete from public.conversations where id = conv_id;
  end if;
end;
$$;

grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

-- 4. RPC : mettre à jour le nom / avatar d'un groupe (owner uniquement)
create or replace function public.update_group_info(
  conv_id uuid,
  new_name text default null,
  new_avatar_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid;
  conv_record record;
  is_owner boolean;
  trimmed_name text;
  current_name text;
  old_name text;
begin
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'not authenticated';
  end if;

  select id, type, name into conv_record
    from public.conversations where id = conv_id;
  if conv_record.id is null or conv_record.type <> 'group' then
    raise exception 'group not found';
  end if;

  select exists (
    select 1 from public.conversation_members
    where conversation_id = conv_id
      and user_id = current_uid
      and role = 'owner'
  ) into is_owner;

  if not is_owner then
    raise exception 'only the owner can update the group';
  end if;

  if new_name is not null then
    trimmed_name := trim(new_name);
    if char_length(trimmed_name) < 2 or char_length(trimmed_name) > 80 then
      raise exception 'group name must be between 2 and 80 characters';
    end if;
    old_name := conv_record.name;
    update public.conversations
      set name = trimmed_name where id = conv_id;

    if old_name is distinct from trimmed_name then
      select coalesce(full_name, username, 'Quelqu''un') into current_name
        from public.profiles where id = current_uid;
      insert into public.messages (conversation_id, sender_id, body, type)
        values (
          conv_id, current_uid,
          coalesce(current_name, 'Quelqu''un') || ' a renommé le groupe en « ' || trimmed_name || ' »',
          'system'
        );
    end if;
  end if;

  if new_avatar_url is not null then
    update public.conversations
      set avatar_url = nullif(new_avatar_url, '')
     where id = conv_id;
  end if;
end;
$$;

grant execute on function public.update_group_info(uuid, text, text)
  to authenticated;
