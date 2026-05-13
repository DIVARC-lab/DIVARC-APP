-- Chantier 5.6 — Digest hebdomadaire des cercles.
--
-- Étend notifications.type pour accueillir 'circle_weekly_digest'.
-- Ajoute une RPC qui retourne les stats agrégées d'un cercle sur 7j
-- (utilisée par le cron /api/cron/circles-digest pour générer une
-- notification in-app par membre dont notifications.weekly_digest=true).
--
-- IDEMPOTENT.

-- =====================================================
-- 1. Étendre notifications.type
-- =====================================================

alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'friend_request_received',
    'friend_request_accepted',
    'friend_request_rejected',
    'new_message',
    'system',
    'marketplace_offer_received',
    'marketplace_offer_accepted',
    'marketplace_offer_declined',
    'marketplace_offer_countered',
    'marketplace_offer_withdrawn',
    'circle_weekly_digest'
  ));

-- =====================================================
-- 2. RPC circle_weekly_stats — agrégat 7j pour digest
-- =====================================================

create or replace function public.circle_weekly_stats(p_circle_id uuid)
returns jsonb
language plpgsql
stable
parallel safe
as $$
declare
  v_now constant timestamptz := now();
  v_posts_count int;
  v_new_members int;
  v_listings_count int;
  v_jobs_count int;
  v_events_count int;
  v_top_posts jsonb;
begin
  select count(*) into v_posts_count
    from public.posts
   where circle_id = p_circle_id
     and deleted_at is null
     and created_at > v_now - interval '7 days';

  select count(*) into v_new_members
    from public.circle_members
   where circle_id = p_circle_id
     and joined_at > v_now - interval '7 days';

  select count(*) into v_listings_count
    from public.listings
   where circle_id = p_circle_id
     and created_at > v_now - interval '7 days'
     and status = 'active';

  select count(*) into v_jobs_count
    from public.jobs
   where circle_id = p_circle_id
     and created_at > v_now - interval '7 days'
     and status = 'active';

  select count(*) into v_events_count
    from public.circle_events
   where circle_id = p_circle_id
     and starts_at > v_now
     and starts_at < v_now + interval '14 days';

  /* Top 3 posts par upvotes + helpful_marks sur 7j. */
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'body', left(coalesce(p.body, ''), 100),
        'upvotes', p.upvotes,
        'helpful', p.helpful_marks
      )
      order by (p.upvotes + p.helpful_marks) desc
    ),
    '[]'::jsonb
  )
    into v_top_posts
    from (
      select id, body, upvotes, helpful_marks
        from public.posts
       where circle_id = p_circle_id
         and deleted_at is null
         and created_at > v_now - interval '7 days'
       order by (upvotes + helpful_marks) desc
       limit 3
    ) p;

  return jsonb_build_object(
    'posts_count', v_posts_count,
    'new_members', v_new_members,
    'listings_count', v_listings_count,
    'jobs_count', v_jobs_count,
    'events_count', v_events_count,
    'top_posts', v_top_posts
  );
end;
$$;

grant execute on function public.circle_weekly_stats(uuid)
  to authenticated, service_role;

-- =====================================================
-- 3. RPC enqueue_circle_weekly_digest — insère 1 notification
-- =====================================================
--
-- Appelée par le cron pour chaque (circle, member). Vérifie que le membre
-- a notifications.weekly_digest=true. Insert idempotent : skip si déjà
-- envoyé cette semaine.

create or replace function public.enqueue_circle_weekly_digest(
  p_circle_id uuid,
  p_user_id uuid,
  p_title text,
  p_body text,
  p_href text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
  v_already boolean;
begin
  /* Vérifie membership active + opt-in digest. */
  select notifications, status into v_member
    from public.circle_members
   where circle_id = p_circle_id and user_id = p_user_id;

  if not found or v_member.status <> 'active' then
    return false;
  end if;

  if coalesce(
    (v_member.notifications -> 'weekly_digest')::boolean, true
  ) = false then
    return false;
  end if;

  /* Idempotence : skip si déjà une notif digest pour ce cercle cette semaine. */
  select exists (
    select 1 from public.notifications
     where user_id = p_user_id
       and type = 'circle_weekly_digest'
       and href = p_href
       and created_at > now() - interval '6 days'
  ) into v_already;

  if v_already then return false; end if;

  insert into public.notifications (user_id, type, title, body, href)
       values (p_user_id, 'circle_weekly_digest', p_title, p_body, p_href);
  return true;
end;
$$;

grant execute on function public.enqueue_circle_weekly_digest(
  uuid, uuid, text, text, text
) to service_role;
