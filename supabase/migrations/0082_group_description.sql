-- Polish groupe : permet à l'owner d'éditer la description du groupe.
-- La colonne description existe déjà sur conversations (migration 0073).
-- On ajoute juste une RPC SECURITY DEFINER scopée à l'owner.

create or replace function public.set_group_description(
  p_conv_id uuid,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid;
  is_owner boolean;
  conv_type text;
  trimmed text;
begin
  current_uid := auth.uid();
  if current_uid is null then
    raise exception 'not authenticated';
  end if;

  select type::text into conv_type
    from public.conversations where id = p_conv_id;
  if conv_type is null or conv_type <> 'group' then
    raise exception 'group not found';
  end if;

  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conv_id
      and user_id = current_uid
      and role = 'owner'
  ) into is_owner;
  if not is_owner then
    raise exception 'only the owner can update the description';
  end if;

  trimmed := trim(coalesce(p_description, ''));
  if char_length(trimmed) > 500 then
    raise exception 'description must be max 500 characters';
  end if;

  update public.conversations
     set description = nullif(trimmed, '')
   where id = p_conv_id;
end;
$$;

grant execute on function public.set_group_description(uuid, text) to authenticated;
