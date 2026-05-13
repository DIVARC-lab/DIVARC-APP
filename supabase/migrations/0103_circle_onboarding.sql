-- Chantier 5.1 — Onboarding nouveau membre.
--
-- Une colonne sur circle_members qui track quand le membre a complété
-- (ou dismissé) le welcome modal. NULL = à montrer au prochain visit.
-- Backfill : les rows existantes sont marquées comme "déjà vues" pour
-- ne pas spammer les anciens membres.
--
-- IDEMPOTENT.

alter table public.circle_members
  add column if not exists onboarding_completed_at timestamptz;

/* Backfill : tous les membres existants à l'application de la migration
 * sont considérés comme onboardés (sinon on leur affiche le modal à
 * leur prochaine visite, ce qui est intrusif). */
update public.circle_members
   set onboarding_completed_at = coalesce(joined_at, now())
 where onboarding_completed_at is null
   and joined_at < now() - interval '1 hour';

create index if not exists circle_members_onboarding_idx
  on public.circle_members (user_id)
  where onboarding_completed_at is null;

comment on column public.circle_members.onboarding_completed_at is
  'Date à laquelle le membre a vu/dismissé le welcome modal (Chantier 5.1).';
