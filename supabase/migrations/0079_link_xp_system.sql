-- Chantier 4 : Système de Liens (XP / Level / Streak par-conversation)
--
-- Les colonnes link_level, link_xp, link_streak_days, last_meaningful_exchange_at
-- existent déjà sur conversations (migration 0073). Cette migration ajoute
-- les RPC et triggers pour les alimenter automatiquement.

-- =====================================================
-- 1. Étend la borne max du check sur link_level (1..7 → 1..11)
-- =====================================================
alter table public.conversations
  drop constraint if exists conversations_link_level_check;

alter table public.conversations
  add constraint conversations_link_level_check
  check (link_level between 1 and 11);

-- =====================================================
-- 2. Calcule le niveau depuis le XP (courbe doublante, max 11)
-- =====================================================
create or replace function public.compute_link_level(p_xp integer)
returns integer
language plpgsql
immutable
as $$
declare
  thresholds integer[] := array[
    0, 50, 150, 350, 750, 1500, 3000, 6000, 12000, 25000, 50000
  ];
  i integer;
begin
  if p_xp is null or p_xp < 0 then return 1; end if;
  for i in reverse array_length(thresholds, 1)..1 loop
    if p_xp >= thresholds[i] then return i; end if;
  end loop;
  return 1;
end;
$$;

grant execute on function public.compute_link_level(integer) to authenticated;

-- =====================================================
-- 3. award_link_xp — ajoute du XP + update level + streak
-- =====================================================
-- Logique streak (link_streak_days) :
--   - Pas de last_meaningful_exchange ou >24h → streak = 1
--   - Dernier exchange = aujourd'hui → streak inchangé (déjà compté)
--   - Dernier exchange = hier → streak +1
--   - Sinon (≥2 jours d'écart) → reset à 1
create or replace function public.award_link_xp(
  p_conv_id uuid,
  p_xp integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_xp integer;
  current_last timestamptz;
  current_streak integer;
  new_xp integer;
  new_level integer;
  new_streak integer;
  now_ts timestamptz := now();
  now_date date := (now_ts at time zone 'utc')::date;
  last_date date;
begin
  select link_xp, last_meaningful_exchange_at, link_streak_days
    into current_xp, current_last, current_streak
    from public.conversations
   where id = p_conv_id;

  if not found then
    return;
  end if;

  new_xp := greatest(0, coalesce(current_xp, 0) + p_xp);
  new_level := public.compute_link_level(new_xp);

  if current_last is null then
    last_date := null;
  else
    last_date := (current_last at time zone 'utc')::date;
  end if;

  if last_date is null then
    new_streak := 1;
  elsif last_date = now_date then
    new_streak := coalesce(current_streak, 1);
  elsif last_date = (now_date - 1) then
    new_streak := coalesce(current_streak, 0) + 1;
  else
    new_streak := 1;
  end if;

  update public.conversations
     set link_xp = new_xp,
         link_level = new_level,
         link_streak_days = new_streak,
         last_meaningful_exchange_at = now_ts
   where id = p_conv_id;
end;
$$;

grant execute on function public.award_link_xp(uuid, integer) to authenticated;

-- =====================================================
-- 4. Trigger : award 2 XP à chaque message inséré (sauf system)
-- =====================================================
create or replace function public.award_xp_on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = 'system' then return new; end if;
  if new.deleted_at is not null then return new; end if;

  perform public.award_link_xp(new.conversation_id, 2);
  return new;
end;
$$;

drop trigger if exists messages_award_xp on public.messages;
create trigger messages_award_xp
  after insert on public.messages
  for each row execute function public.award_xp_on_message_insert();

-- =====================================================
-- 5. Bootstrap : initialise link_xp/level pour les convs existantes
--    basé sur le nombre de messages non-system non-deleted (2 XP/msg)
-- =====================================================
do $$
begin
  update public.conversations c
     set link_xp = sub.computed_xp,
         link_level = public.compute_link_level(sub.computed_xp)
    from (
      select conversation_id,
             count(*) * 2 as computed_xp
        from public.messages
       where type != 'system'
         and deleted_at is null
       group by conversation_id
    ) sub
   where c.id = sub.conversation_id
     and (c.link_xp is null or c.link_xp = 0);
end $$;
