-- =====================================================
-- DIVARC — Migration 0065 : Recommendations LinkedIn-style (étape 2.3)
--
-- Permet à un user A d'écrire une recommandation pour user B. B peut
-- ensuite décider de l'afficher sur son profil (is_visible toggle).
--
-- Modèle similaire à LinkedIn :
--   - from_user_id → to_user_id (asymétrique)
--   - relationship : Manager, Collègue, Client, Mentor, etc.
--   - text : max 3000 chars
--   - is_visible : false par défaut (modération côté destinataire)
--   - request : un user peut DEMANDER une reco via notif (V12)
-- =====================================================

create table if not exists public.profile_recommendations (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  /* Relation : libre côté UI mais constrained à une liste connue pour
     cohérence + traduction. Custom = libre dans relationship_custom. */
  relationship text not null
    check (relationship in (
      'manager', 'report', 'colleague', 'client', 'supplier',
      'mentor', 'mentee', 'classmate', 'professor', 'student',
      'collaborator', 'business_partner', 'friend', 'custom'
    )),
  relationship_custom text
    check (relationship_custom is null or char_length(relationship_custom) <= 60),
  body text not null check (char_length(body) between 30 and 3000),
  /* Destinataire (to_user) toggle visibility — peut cacher sans supprimer. */
  is_visible boolean not null default false,
  given_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  /* Empêche les self-recommendations + duplicats */
  constraint no_self_recommendation check (from_user_id <> to_user_id),
  unique (from_user_id, to_user_id)
);

create index if not exists profile_recommendations_to_idx
  on public.profile_recommendations (to_user_id, is_visible, given_at desc)
  where is_visible = true;

create index if not exists profile_recommendations_from_idx
  on public.profile_recommendations (from_user_id, given_at desc);

drop trigger if exists profile_recommendations_set_updated_at on public.profile_recommendations;
create trigger profile_recommendations_set_updated_at
  before update on public.profile_recommendations
  for each row execute function public.set_updated_at();

-- =====================================================
-- RLS
-- =====================================================
alter table public.profile_recommendations enable row level security;

-- SELECT : visible si is_visible OU si auth.uid() est from_user ou to_user
drop policy if exists "recos visible if public or own" on public.profile_recommendations;
create policy "recos visible if public or own"
  on public.profile_recommendations for select
  using (
    is_visible = true
    or auth.uid() = from_user_id
    or auth.uid() = to_user_id
  );

-- INSERT : from_user_id = auth.uid()
drop policy if exists "users can write recos for others" on public.profile_recommendations;
create policy "users can write recos for others"
  on public.profile_recommendations for insert
  with check (auth.uid() = from_user_id);

-- UPDATE :
--   - from_user peut éditer le texte/relationship
--   - to_user peut éditer is_visible
--   Pour simplifier, RLS autorise UPDATE par from OR to ; check côté
--   action pour le scope précis.
drop policy if exists "from or to can update recos" on public.profile_recommendations;
create policy "from or to can update recos"
  on public.profile_recommendations for update
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- DELETE : seulement le rédacteur peut supprimer (le destinataire peut
-- juste hide via is_visible=false).
drop policy if exists "only author can delete reco" on public.profile_recommendations;
create policy "only author can delete reco"
  on public.profile_recommendations for delete
  using (auth.uid() = from_user_id);

-- =====================================================
-- RPC : toggle visibility (côté destinataire)
-- =====================================================
create or replace function public.toggle_recommendation_visibility(
  p_reco_id uuid,
  p_visible boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  update public.profile_recommendations
     set is_visible = p_visible
   where id = p_reco_id
     and to_user_id = auth.uid();

  if not found then
    raise exception 'recommendation not found or not authorized';
  end if;

  /* Recalcul completion score pour le destinataire */
  perform public.compute_profile_completion_score(auth.uid());
  update public.profiles
     set profile_completion_score = public.compute_profile_completion_score(auth.uid())
   where id = auth.uid();
end;
$$;

grant execute on function public.toggle_recommendation_visibility(uuid, boolean)
  to authenticated;

-- =====================================================
-- RPC : compteurs reçues/données visibles pour un user
-- =====================================================
create or replace function public.count_user_recommendations(p_user_id uuid)
returns table (
  received_count integer,
  given_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.profile_recommendations
      where to_user_id = p_user_id and is_visible = true) as received_count,
    (select count(*)::int from public.profile_recommendations
      where from_user_id = p_user_id and is_visible = true) as given_count;
$$;

grant execute on function public.count_user_recommendations(uuid)
  to authenticated;
