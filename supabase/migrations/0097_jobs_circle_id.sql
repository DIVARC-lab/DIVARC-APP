-- Chantier 3.4 — Job board thématique par cercle.
--
-- Ajout d'une FK optionnelle `circle_id` sur jobs (même approche que
-- listings.circle_id, migration 0096). Les jobs non rattachés restent
-- visibles globalement.
--
-- IDEMPOTENT.

alter table public.jobs
  add column if not exists circle_id uuid
    references public.circles(id) on delete set null;

create index if not exists jobs_circle_id_idx
  on public.jobs (circle_id, created_at desc)
  where circle_id is not null and status = 'active';

comment on column public.jobs.circle_id is
  'Optionnel : rattache l''offre à un cercle thématique (/circles/[slug]/jobs).';
