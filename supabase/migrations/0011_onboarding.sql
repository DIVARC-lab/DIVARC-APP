-- =====================================================
-- DIVARC — Migration 0011 : Onboarding tracking
-- =====================================================

-- 1. Add onboarded_at column
alter table public.profiles
  add column if not exists onboarded_at timestamptz;

-- 2. Backfill : tous les profils existants sont considérés onboardés
--    (évite de rediriger les beta-testeurs vers /welcome).
update public.profiles
   set onboarded_at = coalesce(onboarded_at, created_at)
 where onboarded_at is null;

-- 3. Index pour repérer rapidement les profils non-onboardés
create index if not exists profiles_onboarded_at_idx
  on public.profiles (onboarded_at)
  where onboarded_at is null;
