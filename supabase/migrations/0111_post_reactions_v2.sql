-- Chantier 1.2 Feed v2 — Reactions étendues 6 types.
--
-- Remplace progressivement post_likes (binaire) par post_reactions (6 types).
-- Backfill : chaque post_like existant devient une reaction 'heart'.
--
-- 6 types (cohérents LinkedIn / Facebook 2026) :
--   heart      : J'aime / Soutien (équiv. like)
--   applause   : Bravo / Félicitations
--   insightful : Instructif / Réflexion
--   surprised  : Wow / Surprenant
--   sad        : Triste / Compassion
--   laugh      : Drôle
--
-- Counters dénormalisés sur posts :
--   reactions_counts jsonb : { "heart": 12, "applause": 3, ... }
--   total_reactions int : somme agrégée (pour tri "engageants" transparent)
--
-- IDEMPOTENT.

-- =====================================================
-- 1. Table post_reactions
-- =====================================================

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in (
    'heart',
    'applause',
    'insightful',
    'surprised',
    'sad',
    'laugh'
  )),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction_type)
);

create index if not exists post_reactions_post_idx
  on public.post_reactions (post_id, reaction_type);

create index if not exists post_reactions_user_idx
  on public.post_reactions (user_id, created_at desc);

alter table public.post_reactions enable row level security;

/* Lecture : si le post est lisible, la reaction l'est aussi.
 * On délègue le filtrage à la RLS de posts (lecture héritée). */
drop policy if exists "post_reactions readable to post readers"
  on public.post_reactions;
create policy "post_reactions readable to post readers"
  on public.post_reactions for select
  using (
    exists (select 1 from public.posts p where p.id = post_id)
  );

drop policy if exists "post_reactions insert own" on public.post_reactions;
create policy "post_reactions insert own"
  on public.post_reactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "post_reactions delete own" on public.post_reactions;
create policy "post_reactions delete own"
  on public.post_reactions for delete
  using (auth.uid() = user_id);

-- =====================================================
-- 2. Counters dénormalisés sur posts
-- =====================================================

alter table public.posts
  add column if not exists reactions_counts jsonb not null default '{}'::jsonb;

alter table public.posts
  add column if not exists total_reactions integer not null default 0
    check (total_reactions >= 0);

-- =====================================================
-- 3. Triggers : maintenir counters auto
-- =====================================================

create or replace function public.post_reactions_increment()
returns trigger
language plpgsql
as $$
declare
  v_current_count int;
begin
  /* Lit le count actuel du type dans le jsonb. */
  select coalesce(
    (reactions_counts ->> new.reaction_type)::int,
    0
  ) into v_current_count
    from public.posts where id = new.post_id;

  update public.posts
     set reactions_counts = reactions_counts
       || jsonb_build_object(new.reaction_type, v_current_count + 1),
         total_reactions = total_reactions + 1
   where id = new.post_id;
  return new;
end;
$$;

create or replace function public.post_reactions_decrement()
returns trigger
language plpgsql
as $$
declare
  v_current_count int;
begin
  select coalesce(
    (reactions_counts ->> old.reaction_type)::int,
    1
  ) into v_current_count
    from public.posts where id = old.post_id;

  update public.posts
     set reactions_counts = reactions_counts
       || jsonb_build_object(
         old.reaction_type,
         greatest(v_current_count - 1, 0)
       ),
         total_reactions = greatest(total_reactions - 1, 0)
   where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists post_reactions_after_insert on public.post_reactions;
create trigger post_reactions_after_insert
  after insert on public.post_reactions
  for each row execute function public.post_reactions_increment();

drop trigger if exists post_reactions_after_delete on public.post_reactions;
create trigger post_reactions_after_delete
  after delete on public.post_reactions
  for each row execute function public.post_reactions_decrement();

-- =====================================================
-- 4. RPC toggle_post_reaction
-- =====================================================
--
-- Toggle d'une reaction par type. Cliquer le même type → retire. Cliquer
-- un autre type → ajoute (l'user peut avoir plusieurs types sur un même post,
-- comme LinkedIn).

create or replace function public.toggle_post_reaction(
  p_post_id uuid,
  p_reaction_type text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_exists boolean;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_reaction_type not in (
    'heart', 'applause', 'insightful', 'surprised', 'sad', 'laugh'
  ) then
    raise exception 'invalid reaction type' using errcode = '22023';
  end if;

  select exists (
    select 1 from public.post_reactions
     where user_id = v_user
       and post_id = p_post_id
       and reaction_type = p_reaction_type
  ) into v_exists;

  if v_exists then
    delete from public.post_reactions
     where user_id = v_user
       and post_id = p_post_id
       and reaction_type = p_reaction_type;
    return false;
  end if;

  insert into public.post_reactions (user_id, post_id, reaction_type)
       values (v_user, p_post_id, p_reaction_type);
  return true;
end;
$$;

grant execute on function public.toggle_post_reaction(uuid, text)
  to authenticated;

-- =====================================================
-- 5. Backfill : post_likes existants → post_reactions type='heart'
-- =====================================================
--
-- Les triggers ci-dessus vont auto-incrémenter les counters via le INSERT.
-- L'ordre matter : on backfill APRÈS la création des triggers.

insert into public.post_reactions (user_id, post_id, reaction_type, created_at)
select pl.user_id, pl.post_id, 'heart', pl.created_at
  from public.post_likes pl
  /* Skip si déjà migré (idempotent). */
  where not exists (
    select 1 from public.post_reactions r
     where r.user_id = pl.user_id
       and r.post_id = pl.post_id
       and r.reaction_type = 'heart'
  );

comment on table public.post_reactions is
  'Reactions 6 types (heart/applause/insightful/surprised/sad/laugh). Counters dénormalisés sur posts.reactions_counts (jsonb).';
comment on column public.posts.reactions_counts is
  'Jsonb { "heart": 5, "applause": 2, ... } maintenu par triggers sur post_reactions.';
comment on column public.posts.total_reactions is
  'Somme agrégée pour tri "engageants" transparent (Chantier 3.2 Feed).';
