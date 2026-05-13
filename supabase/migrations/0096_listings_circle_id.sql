-- Chantier 3.3 — Marketplace thématique par cercle.
--
-- Ajout d'une FK optionnelle `circle_id` sur listings → permet d'attacher
-- une annonce à un cercle. Les annonces non rattachées (circle_id IS NULL)
-- restent visibles globalement comme avant.
--
-- L'onglet Marketplace du cercle filtre via circle_id. Les filtres
-- /marketplace ignorent les annonces de cercles privés (RLS appliquée sur
-- la jointure côté query).
--
-- IDEMPOTENT.

alter table public.listings
  add column if not exists circle_id uuid
    references public.circles(id) on delete set null;

create index if not exists listings_circle_id_idx
  on public.listings (circle_id, created_at desc)
  where circle_id is not null and status = 'active';

comment on column public.listings.circle_id is
  'Optionnel : rattache l''annonce à un cercle thématique (visible dans /circles/[slug]/market).';
