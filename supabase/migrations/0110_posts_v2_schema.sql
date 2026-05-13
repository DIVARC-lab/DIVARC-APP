-- Chantier 1.1 Feed v2 — Schema posts étendu.
--
-- Ajoute les champs nécessaires pour :
--   - Types de posts (post_kind) : standard / article / thread / longform
--   - Threads de posts (Twitter-style) : thread_root_id + thread_reply_to_id
--   - Estimation lecture (reading_time_minutes) — utile pour articles longs
--   - Snapshot audience au moment du post (audit + cohérence)
--
-- Toutes additions sont nullable ou DEFAULT — aucune breaking change.
-- IDEMPOTENT.

-- =====================================================
-- 1. post_kind — type de post
-- =====================================================

alter table public.posts
  add column if not exists post_kind text not null default 'standard';

alter table public.posts
  drop constraint if exists posts_kind_check;
alter table public.posts
  add constraint posts_kind_check
  check (post_kind in (
    'standard',  -- post court classique (default)
    'article',   -- post long-form avec titre + body markdown
    'thread',    -- série liée de posts (Twitter-like)
    'longform'   -- très long format (essai, analyse)
  ));

-- =====================================================
-- 2. Threads — chaînage hiérarchique optionnel
-- =====================================================
--
-- thread_root_id : id du post racine du thread. NULL pour les posts standard.
--   Si défini, ce post fait partie d'un thread. Le root a thread_root_id=own_id.
-- thread_reply_to_id : post précédent dans le thread (pour ordering granulaire).
--   NULL pour le root du thread.
--
-- ON DELETE SET NULL : si un post du milieu est supprimé, on garde le thread
-- en cohérence (les suivants seront orphelins mais visibles).

alter table public.posts
  add column if not exists thread_root_id uuid
    references public.posts(id) on delete set null;

alter table public.posts
  add column if not exists thread_reply_to_id uuid
    references public.posts(id) on delete set null;

alter table public.posts
  add column if not exists thread_position integer
    check (thread_position is null or thread_position >= 0);

-- =====================================================
-- 3. Reading time estimate (pour articles/longform)
-- =====================================================
--
-- En minutes, calculé à l'insert ou update. 200 mots/minute pour FR.
-- Trigger : recalcule auto si body change.

alter table public.posts
  add column if not exists reading_time_minutes integer
    check (reading_time_minutes is null or reading_time_minutes >= 0);

create or replace function public.compute_reading_time()
returns trigger
language plpgsql
as $$
declare
  v_words int;
begin
  if new.body is null or char_length(new.body) = 0 then
    new.reading_time_minutes := null;
  else
    /* Compte mots approximatif : split sur whitespace. */
    v_words := array_length(
      regexp_split_to_array(new.body, E'\\s+'),
      1
    );
    /* 200 mots/min, minimum 1 min si du texte est présent. */
    new.reading_time_minutes := greatest(1, ceil(v_words::numeric / 200));
  end if;
  return new;
end;
$$;

drop trigger if exists posts_compute_reading_time on public.posts;
create trigger posts_compute_reading_time
  before insert or update of body on public.posts
  for each row execute function public.compute_reading_time();

-- =====================================================
-- 4. Audience snapshot (audit & cohérence)
-- =====================================================
--
-- Capture l'audience au moment où le post a été créé. Si l'user change
-- son visibility par défaut plus tard, les posts existants gardent
-- leur audience originale documentée ici.
--
-- Schéma : { "visibility": "public", "circle_id": null, "audience_excluded": [] }

alter table public.posts
  add column if not exists audience_snapshot jsonb;

-- =====================================================
-- 5. Indexes pour le feed v2
-- =====================================================

create index if not exists posts_thread_root_idx
  on public.posts (thread_root_id, thread_position)
  where thread_root_id is not null and deleted_at is null;

create index if not exists posts_kind_recent_idx
  on public.posts (post_kind, created_at desc)
  where deleted_at is null and status = 'published';

/* Articles longform : surfacing dédié dans le feed (cf. Chantier 5). */
create index if not exists posts_longform_recent_idx
  on public.posts (created_at desc)
  where deleted_at is null
    and status = 'published'
    and post_kind in ('article', 'longform');

comment on column public.posts.post_kind is
  'Type de post : standard (default) / article / thread / longform (Chantier Feed v2).';
comment on column public.posts.thread_root_id is
  'Si défini, ce post appartient à un thread. Le root a thread_root_id=own_id.';
comment on column public.posts.audience_snapshot is
  'Snapshot de l''audience au moment du post (visibility + circle_id + exclusions). Audit & cohérence.';
