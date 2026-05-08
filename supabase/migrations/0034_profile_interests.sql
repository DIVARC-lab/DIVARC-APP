-- =====================================================
-- 0034 — Onboarding · centres d'intérêt
-- Ajoute un tableau de tags d'intérêt sur le profil pour
-- piloter les suggestions de cercles, posts, et personnes
-- (vélo, photo, parents, devs, etc.).
-- =====================================================

alter table public.profiles
  add column if not exists interests text[]
    not null default '{}'::text[];

comment on column public.profiles.interests is
  'Tags d''intérêt (slugs courts) choisis pendant l''onboarding. Pilote les suggestions cercles/posts/personnes.';

-- Index GIN pour les requêtes "qui partage cet intérêt"
-- (overlap, contains). Le vide-by-default évite tout coût pour
-- les profils qui sautent le step.
create index if not exists profiles_interests_gin_idx
  on public.profiles using gin (interests);
