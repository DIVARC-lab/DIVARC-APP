-- Chantier post-livraison — Messagerie marketplace séparée.
--
-- Objectif : les conversations marketplace (entre acheteur et vendeur sur
-- une annonce) ne doivent PAS apparaître dans la messagerie personnelle
-- /messages. On ajoute un type 'listing_chat' aux conversations + une
-- colonne listing_id pour lier la conv à l'annonce.
--
-- L'UI /marketplace/messages filtrera sur type='listing_chat' et l'UI
-- /messages filtrera OUT ce type.
--
-- IDEMPOTENT.

-- =====================================================
-- 1. Étendre le type enum conversations + ajouter listing_id
-- =====================================================

alter table public.conversations
  drop constraint if exists conversations_type_check;

alter table public.conversations
  add constraint conversations_type_check
  check (type in ('direct', 'group', 'self', 'broadcast', 'channel', 'listing_chat'));

alter table public.conversations
  add column if not exists listing_id uuid references public.listings(id) on delete set null;

create index if not exists conversations_listing_id_idx
  on public.conversations (listing_id)
  where listing_id is not null;

-- =====================================================
-- 2. RPC get_or_create_listing_conversation
-- =====================================================
--
-- Idempotent : si une conv listing_chat existe déjà entre (buyer, seller, listing),
-- elle est retournée. Sinon créée avec les 2 membres et le listing_id.
-- L'acheteur appelle cette RPC ; le vendeur est l'auteur de l'annonce.

create or replace function public.get_or_create_listing_conversation(
  p_listing_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_seller uuid;
  v_conv uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select seller_id into v_seller
    from public.listings
   where id = p_listing_id;

  if not found then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;

  if v_seller = v_user then
    raise exception 'cannot chat with yourself on your own listing' using errcode = '42501';
  end if;

  /* Cherche conv existante pour ce (buyer, seller, listing). */
  select c.id into v_conv
    from public.conversations c
   where c.type = 'listing_chat'
     and c.listing_id = p_listing_id
     and exists (
       select 1 from public.conversation_members cm
        where cm.conversation_id = c.id and cm.user_id = v_user
     )
     and exists (
       select 1 from public.conversation_members cm
        where cm.conversation_id = c.id and cm.user_id = v_seller
     )
   limit 1;

  if v_conv is not null then
    return v_conv;
  end if;

  /* Crée une nouvelle conv listing_chat. */
  insert into public.conversations (type, listing_id, created_by)
       values ('listing_chat', p_listing_id, v_user)
    returning id into v_conv;

  insert into public.conversation_members (conversation_id, user_id, role)
       values
         (v_conv, v_user, 'owner'),
         (v_conv, v_seller, 'member');

  return v_conv;
end;
$$;

grant execute
  on function public.get_or_create_listing_conversation(uuid)
  to authenticated;
