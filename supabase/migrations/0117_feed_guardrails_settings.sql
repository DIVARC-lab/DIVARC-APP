-- Chantier Feed 6.4 — Toggles des 4 garde-fous documentés.
--
-- La table user_algorithm_settings existe depuis 0042 avec chronological_mode.
-- On y ajoute les 3 toggles Feed v2 documentés sur /about/feed-algorithm :
--
--   - anti_doomscroll_enabled : insère une "pause cosy" toutes les 20 posts
--   - author_diversity_enabled : max 3 posts consécutifs du même auteur
--   - signal_filter_enabled    : rétrograde les posts à signaux purement négatifs
--
-- TRUE par défaut (les garde-fous protègent l'utilisateur). L'user peut les
-- désactiver mais ne peut pas être ciblé automatiquement par leur absence.
--
-- IDEMPOTENT.

alter table public.user_algorithm_settings
  add column if not exists anti_doomscroll_enabled boolean not null default true;

alter table public.user_algorithm_settings
  add column if not exists author_diversity_enabled boolean not null default true;

alter table public.user_algorithm_settings
  add column if not exists signal_filter_enabled boolean not null default true;

/* Mode de tri préféré pour /feed?tab=transparent (default 'fresh'). */
alter table public.user_algorithm_settings
  add column if not exists default_feed_mode text not null default 'fresh';

alter table public.user_algorithm_settings
  drop constraint if exists user_algo_default_mode_check;
alter table public.user_algorithm_settings
  add constraint user_algo_default_mode_check
  check (default_feed_mode in (
    'fresh', 'conversations', 'rising_voices', 'inner_circle', 'raw'
  ));

comment on column public.user_algorithm_settings.anti_doomscroll_enabled is
  'Si true, le feed insère une pause cosy toutes les 20 posts (Chantier Feed v2).';
comment on column public.user_algorithm_settings.author_diversity_enabled is
  'Si true, max 3 posts consécutifs du même auteur (Chantier Feed v2).';
comment on column public.user_algorithm_settings.signal_filter_enabled is
  'Si true, les posts à signaux purement négatifs sont rétrogradés (Chantier Feed v2).';
comment on column public.user_algorithm_settings.default_feed_mode is
  'Mode de tri par défaut pour /feed?tab=transparent (fresh/conversations/rising_voices/inner_circle/raw).';
