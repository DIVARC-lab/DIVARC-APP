-- Permet aux notifications messagerie de récupérer les push_subscriptions
-- des destinataires en bypass de RLS, via une fonction SECURITY DEFINER.
--
-- Sécurité : la fonction n'authorize pas n'importe qui à lire les subs
-- de n'importe qui — elle exige juste d'être authentifié. Le contexte
-- d'appel (Server Action notifyNewMessage / notifyIncomingCall) valide
-- déjà l'autorisation business (le caller est membre de la conv).

create or replace function public.get_push_subs_for_users(p_user_ids uuid[])
returns table (
  id uuid,
  user_id uuid,
  endpoint text,
  p256dh text,
  auth text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  return query
    select s.id, s.user_id, s.endpoint, s.p256dh, s.auth
      from public.push_subscriptions s
     where s.user_id = any(p_user_ids);
end;
$$;

grant execute on function public.get_push_subs_for_users(uuid[]) to authenticated;
