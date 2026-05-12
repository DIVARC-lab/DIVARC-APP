-- Notifications in-app pour réponses aux offres marketplace.
--
-- Quand le vendeur clique Accepter / Refuser / Contre-offrir sur une offre,
-- on insère une row dans public.notifications côté acheteur. La RLS de
-- notifications (cf. 0005) interdit l'INSERT direct par auth ; on crée donc
-- une RPC SECURITY DEFINER qui valide :
--   - L'auteur est partie de l'offre (from_user OU to_user)
--   - Le destinataire est l'autre partie
--   - Le type est dans la whitelist marketplace

-- =====================================================
-- 1. Étendre les types autorisés
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
    'marketplace_offer_withdrawn'
  ));

-- =====================================================
-- 2. RPC notify_marketplace_offer_event
-- =====================================================
--
-- Crée une notification in-app pour le user destinataire de l'event.
-- Sécurité :
--   - Vérifie auth.uid() est partie de l'offre
--   - Le destinataire est forcément l'autre partie (calculé serveur)
--   - Type whitelisté côté code (check constraint en sécurité supplémentaire)

create or replace function public.notify_marketplace_offer_event(
  p_offer_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_href text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_from uuid;
  v_to uuid;
  v_listing uuid;
  v_recipient uuid;
  v_notif_id uuid;
begin
  if v_actor is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select from_user, to_user, listing_id
    into v_from, v_to, v_listing
    from public.listing_offers
   where id = p_offer_id;
  if not found then
    raise exception 'offer not found' using errcode = 'P0002';
  end if;

  if v_actor <> v_from and v_actor <> v_to then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  /* Recipient = l'autre partie. */
  v_recipient := case when v_actor = v_from then v_to else v_from end;

  if p_type not in (
    'marketplace_offer_received',
    'marketplace_offer_accepted',
    'marketplace_offer_declined',
    'marketplace_offer_countered',
    'marketplace_offer_withdrawn'
  ) then
    raise exception 'invalid notification type' using errcode = '22023';
  end if;

  insert into public.notifications (
    user_id, type, title, body, href, related_user_id
  ) values (
    v_recipient, p_type, p_title, p_body,
    coalesce(p_href, '/marketplace/offers'),
    v_actor
  )
  returning id into v_notif_id;

  return v_notif_id;
end;
$$;

grant execute on function public.notify_marketplace_offer_event(
  uuid, text, text, text, text
) to authenticated;
