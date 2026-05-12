-- Chantier 2.4 — Postgres Full-Text Search sur listings.
--
-- Objectif : remplacer la recherche ilike%% (slow, sans ranking) par un index
-- GIN sur tsvector pondéré (title=A, brand/model=B, description=C). On expose
-- une RPC `search_listings_fts` qui retourne les IDs rankés par ts_rank,
-- l'app charge ensuite les détails via attachDetails (queries/listings.ts).
--
-- Configuration FTS : 'french' — stemming + stopwords FR. Pour rester
-- accent-tolérant, on applique `unaccent` côté query et côté stockage via
-- l'extension unaccent (création conditionnelle ci-dessous).
--
-- IDEMPOTENT : safe à rejouer.

-- =====================================================
-- 1. Extension unaccent pour normaliser les accents (é → e, ç → c, …)
-- =====================================================

create extension if not exists unaccent;

-- Wrapper IMMUTABLE sur unaccent — la fonction native est STABLE, ce qui
-- empêche son usage dans une generated column ou un index. Le wrapper
-- déclare IMMUTABLE après vérification que la config 'unaccent' est figée.
create or replace function public.f_unaccent(text)
  returns text
  language sql
  immutable
  parallel safe
  strict
  as $$ select public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- =====================================================
-- 2. Colonne tsvector générée (pondérée A/B/C) + index GIN
-- =====================================================

alter table public.listings
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(
      to_tsvector('french', public.f_unaccent(coalesce(title, ''))),
      'A'
    ) ||
    setweight(
      to_tsvector(
        'french',
        public.f_unaccent(coalesce(attributes ->> 'brand', ''))
      ),
      'A'
    ) ||
    setweight(
      to_tsvector(
        'french',
        public.f_unaccent(coalesce(attributes ->> 'model', ''))
      ),
      'B'
    ) ||
    setweight(
      to_tsvector('french', public.f_unaccent(coalesce(description, ''))),
      'C'
    )
  ) stored;

create index if not exists listings_search_tsv_idx
  on public.listings using gin (search_tsv);

-- =====================================================
-- 3. RPC search_listings_fts — retourne les listings rankés
-- =====================================================
--
-- Paramètres :
--   p_query        : terme de recherche (multi-mots OK, AND implicite)
--   p_categories   : filtre catégorie (legacy `category` text), [] = pas de filtre
--   p_conditions   : filtre état (text[])
--   p_price_min    : prix minimum (numeric, NULL = pas de filtre)
--   p_price_max    : prix maximum
--   p_status       : statut (default 'active')
--   p_limit / p_offset : pagination
--
-- Retourne les IDs uniquement — la couche app récupère les détails via
-- attachDetails. RLS s'applique normalement (SECURITY INVOKER par défaut),
-- donc on hérite de la policy "active listings are public".

create or replace function public.search_listings_fts(
  p_query        text,
  p_categories   text[]   default null,
  p_conditions   text[]   default null,
  p_price_min    numeric  default null,
  p_price_max    numeric  default null,
  p_status       text     default 'active',
  p_limit        int      default 60,
  p_offset       int      default 0
)
returns table (id uuid, rank real)
language sql
stable
parallel safe
as $$
  with q as (
    select
      websearch_to_tsquery(
        'french',
        public.f_unaccent(coalesce(nullif(trim(p_query), ''), ''))
      ) as tsq
  )
  select
    l.id,
    ts_rank(l.search_tsv, q.tsq) +
      case when l.is_boosted then 0.5 else 0 end as rank
  from public.listings l
  cross join q
  where
    l.status = p_status
    and (
      -- Si query vide → on retourne tous les listings filtrés (sans rank).
      q.tsq = ''::tsquery
      or l.search_tsv @@ q.tsq
    )
    and (
      p_categories is null
      or array_length(p_categories, 1) is null
      or l.category = any (p_categories)
    )
    and (
      p_conditions is null
      or array_length(p_conditions, 1) is null
      or l.condition = any (p_conditions)
    )
    and (p_price_min is null or l.price_amount >= p_price_min)
    and (p_price_max is null or l.price_amount <= p_price_max)
  order by
    rank desc,
    l.created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0)
$$;

grant execute on function public.search_listings_fts(
  text, text[], text[], numeric, numeric, text, int, int
) to authenticated, anon;

-- =====================================================
-- 4. Index complémentaire pour cas sans query (filtre + tri par récence).
--    Le GIN ci-dessus ne sert que pour le matching tsquery — pour les
--    filtres seuls on garde les btree existants (0006).
-- =====================================================

-- (rien à ajouter — listings_status_created_at_idx et listings_category_status_idx
--  existent déjà depuis 0006)
