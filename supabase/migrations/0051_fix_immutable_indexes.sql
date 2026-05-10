-- =====================================================
-- DIVARC — Migration 0051 : Fix indexes with now() in predicate
--
-- La migration 0050 utilisait `WHERE expires_at > now()` dans des
-- index predicates, ce que Postgres refuse car `now()` n'est pas
-- IMMUTABLE :
--   ERROR 42P17: functions in index predicate must be marked IMMUTABLE
--
-- Fix : on retire la condition d'expiration du predicate. La query
-- applicative continue de filtrer par expires_at > now(). L'unicité
-- est garantie côté code (analyzeWebsite re-utilise une analyse
-- completed existante avant d'en créer une nouvelle).
-- =====================================================

-- 1. ads_website_analyses : drop l'index unique avec now() puis recrée
--    une version filtrée seulement sur status='completed'.
drop index if exists public.ads_website_analyses_url_uniq;

/* Note : on ne peut PAS faire un index UNIQUE sur (url_normalized)
   filtré par status='completed' car ça empêcherait d'avoir 2 analyses
   completed (une expirée + une fresh) pour la même URL — situation
   normale dans le temps. À la place : index NON unique pour lookup
   rapide. La déduplication "use cache si fresh" est faite côté code. */
create index if not exists ads_website_analyses_url_lookup_idx
  on public.ads_website_analyses (url_normalized, status, expires_at desc)
  where status = 'completed';

-- 2. ads_keyword_research : même problème, même fix.
drop index if exists public.ads_keyword_research_uniq;

create index if not exists ads_keyword_research_lookup_idx
  on public.ads_keyword_research (keyword, country, language, expires_at desc);
