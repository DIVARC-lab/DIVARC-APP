-- Chantier Reels Recsys étape 4 — Embeddings vectoriels des reels.
--
-- Réplique exacte de content_embeddings (migration 0044) mais pour les reels.
-- Schéma identique : 1 ligne par reel, vector(1536), HNSW cosine index,
-- modèle text-embedding-3-small.
--
-- Pourquoi une table séparée vs polymorphe (content_type + content_id) :
--   - Les FK / cascades sont strictes (référence reels.id, pas posts.id).
--   - Le ranker reels n'interroge QUE cette table (pas de UNION coûteux).
--   - Migration ultérieure vers une table polymorphe possible sans casser
--     les queries existantes.
--
-- IDEMPOTENT.

create table if not exists public.reel_embeddings (
  reel_id uuid primary key references public.reels(id) on delete cascade,
  embedding vector(1536) not null,
  model text not null default 'text-embedding-3-small',
  /* Texte source : caption + hashtags + transcript user si fourni. */
  source_text text,
  generated_at timestamptz not null default now()
);

create index if not exists reel_embeddings_hnsw_idx
  on public.reel_embeddings
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

alter table public.reel_embeddings enable row level security;

drop policy if exists "reel_embeddings_select_all" on public.reel_embeddings;
create policy "reel_embeddings_select_all"
  on public.reel_embeddings for select
  using (auth.uid() is not null);

/* Pas de policy insert/update/delete : seul service_role écrit
 * (server action indexReel + cron de backfill). */

-- =====================================================
-- RPC : find_similar_reels_to_user
--   Top N reels dont l'embedding est le plus proche du interest_vector
--   de l'user courant. Filtres : non-deleted, < 30j, pas auteur=user.
-- =====================================================

create or replace function public.find_similar_reels_to_user(
  target_user_id uuid,
  result_limit int default 50
)
returns table (
  reel_id uuid,
  similarity_score float
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_vector vector(1536);
begin
  select interest_vector into v_user_vector
    from public.user_interest_profiles
    where user_id = target_user_id;

  if v_user_vector is null then
    return;
  end if;

  return query
  select
    re.reel_id,
    (1 - (re.embedding <=> v_user_vector))::float as similarity_score
  from public.reel_embeddings re
  inner join public.reels r on r.id = re.reel_id
  where r.deleted_at is null
    and r.created_at >= (now() - interval '30 days')
    and r.author_id <> target_user_id
  order by re.embedding <=> v_user_vector
  limit result_limit;
end;
$$;

revoke all on function public.find_similar_reels_to_user(uuid, int) from public;
grant execute on function public.find_similar_reels_to_user(uuid, int) to authenticated;

comment on table public.reel_embeddings is
  'Embeddings vectoriels des reels (text-embedding-3-small 1536d). Pour cosine similarity dans le ranker For You Page.';
comment on function public.find_similar_reels_to_user(uuid, int) is
  'Top N reels proches du interest_vector de l''user. Chantier Reels Recsys étape 4.';
