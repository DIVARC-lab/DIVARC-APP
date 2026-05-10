-- =====================================================
-- DIVARC — Migration 0044 : Embeddings de contenu (posts)
--
-- Table dédiée content_embeddings (séparée de posts pour ne pas alourdir
-- les queries qui n'ont pas besoin du vecteur). Une ligne par post,
-- mise à jour quand le post est édité.
--
-- Stack : pgvector déjà activé en migration 0042. Modèle initial :
-- OpenAI text-embedding-3-small (1536 dims, $0.02/M tokens). On stocke
-- le nom du modèle pour permettre une migration future vers un autre
-- modèle sans casser les données existantes.
--
-- Index HNSW pour cosine similarity rapide à très grande échelle.
-- =====================================================

create table if not exists public.content_embeddings (
  post_id uuid primary key references public.posts(id) on delete cascade,
  /* Embedding 1536d (text-embedding-3-small). NULL temporairement pendant
     le backfill, puis NOT NULL effectif. */
  embedding vector(1536) not null,
  /* Nom du modèle pour permettre des migrations futures. */
  model text not null default 'text-embedding-3-small',
  /* Texte source utilisé pour l'embedding (concat title + body, max
     8000 chars selon limite OpenAI). Sert au debug + re-embedding. */
  source_text text,
  /* Timestamp de la dernière génération — pour ré-embedder si le post
     est édité. */
  generated_at timestamptz not null default now()
);

/* HNSW index pour cosine similarity. Recommandé par pgvector pour les
   workloads >10K vecteurs. m=16 (défaut), ef_construction=64. */
create index if not exists content_embeddings_hnsw_idx
  on public.content_embeddings
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

alter table public.content_embeddings enable row level security;

/* Lecture libre pour tous les users authentifiés (les embeddings sont
   dérivés de contenus publics ou amis-only — la visibilité du post
   contrôle la visibilité de l'embedding indirectement via JOIN). */
create policy "content_embeddings_select_all"
  on public.content_embeddings for select
  using (auth.uid() is not null);

/* Pas de policy insert/update/delete grand public : seuls les workers
   service_role écrivent (action createPost + cron de backfill). */

comment on table public.content_embeddings is
  'Embeddings vectoriels des posts pour cosine similarity. Modèle text-embedding-3-small.';
comment on column public.content_embeddings.model is
  'Nom du modèle (permet migration future sans perdre les données).';

-- =====================================================
-- RPC : find_similar_posts_to_user
--   Retourne les top N posts dont l'embedding est le plus proche du
--   interest_vector de l'user courant (cosine similarity).
--
--   Filtre :
--    - Posts du dernier mois (freshness)
--    - Pas les posts de l'user lui-même
--    - Posts non-deleted
--
--   Retourne post_id + score (1 - cosine_distance, donc 0..1 où 1 =
--   identique).
-- =====================================================
create or replace function public.find_similar_posts_to_user(
  target_user_id uuid,
  result_limit int default 50
)
returns table (
  post_id uuid,
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
  /* Récupère l'interest_vector de l'user. NULL si pas encore généré. */
  select interest_vector into v_user_vector
    from public.user_interest_profiles
    where user_id = target_user_id;

  if v_user_vector is null then
    return;
  end if;

  return query
  select
    ce.post_id,
    (1 - (ce.embedding <=> v_user_vector))::float as similarity_score
  from public.content_embeddings ce
  inner join public.posts p on p.id = ce.post_id
  where p.deleted_at is null
    and p.created_at >= (now() - interval '30 days')
    and p.author_id <> target_user_id
  order by ce.embedding <=> v_user_vector
  limit result_limit;
end;
$$;

revoke all on function public.find_similar_posts_to_user(uuid, int) from public;
grant execute on function public.find_similar_posts_to_user(uuid, int) to authenticated;
