-- Chantier 1.3 — Cercles v2 : règles, flairs, méta posts (votes & curation).
--
-- Trois ajouts complémentaires :
--   1. circle_rules : règles affichées dans l'onglet "À propos"
--   2. circle_flairs : tags configurables par cercle pour catégoriser
--      les posts (Discussion / Question / Tuto / Annonce / etc.)
--   3. posts étendu : flair_id, is_locked, is_announcement,
--      requires_approval / approved_by / approved_at,
--      upvotes / downvotes / helpful_marks (counters dénormalisés)
--   4. circle_post_votes : tracking des votes par (user, post, vote_type)
--      pour empêcher les doublons et permettre toggle.
--
-- IDEMPOTENT.

-- =====================================================
-- 1. Table circle_rules
-- =====================================================

create table if not exists public.circle_rules (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  position integer not null check (position between 1 and 15),
  title text not null check (char_length(title) between 1 and 60),
  description text check (description is null or char_length(description) <= 300),
  /* Nom d'icône Lucide (ex: 'shield', 'heart', 'alert-triangle'). Résolu
   * côté UI via dynamic import. */
  icon text check (icon is null or char_length(icon) <= 40),
  /* Si true : violation = sanction immédiate (skip warning). */
  is_critical boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (circle_id, position)
);

create index if not exists circle_rules_circle_id_idx
  on public.circle_rules (circle_id, position);

alter table public.circle_rules enable row level security;

drop policy if exists "circle_rules readable" on public.circle_rules;
create policy "circle_rules readable"
  on public.circle_rules for select
  using (
    /* Visibles à tous : règles publiques (font partie de la card du cercle). */
    true
  );

drop policy if exists "circle_rules manageable by admins" on public.circle_rules;
create policy "circle_rules manageable by admins"
  on public.circle_rules for all
  using (
    exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_rules.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin')
         and m.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_rules.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin')
         and m.status = 'active'
    )
  );

drop trigger if exists circle_rules_set_updated_at on public.circle_rules;
create trigger circle_rules_set_updated_at
  before update on public.circle_rules
  for each row execute function public.set_updated_at();

-- =====================================================
-- 2. Table circle_flairs
-- =====================================================
--
-- Chaque cercle définit ses propres flairs (tags de catégorisation des posts).
-- Default proposé côté UI au création du cercle : Discussion, Question, Tuto,
-- Annonce, Recherche.

create table if not exists public.circle_flairs (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,40}$'),
  label text not null check (char_length(label) between 1 and 30),
  /* Couleur hex affichée sur le badge flair. */
  color text not null default '#0A1F44'
    check (color ~* '^#[0-9a-f]{6}$'),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (circle_id, slug)
);

create index if not exists circle_flairs_circle_id_idx
  on public.circle_flairs (circle_id, position);

alter table public.circle_flairs enable row level security;

drop policy if exists "circle_flairs readable" on public.circle_flairs;
create policy "circle_flairs readable"
  on public.circle_flairs for select using (true);

drop policy if exists "circle_flairs manageable by admins" on public.circle_flairs;
create policy "circle_flairs manageable by admins"
  on public.circle_flairs for all
  using (
    exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_flairs.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin', 'moderator', 'mod')
         and m.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_flairs.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin', 'moderator', 'mod')
         and m.status = 'active'
    )
  );

-- =====================================================
-- 3. Extension posts : méta circle (flair, lock, approval, votes)
-- =====================================================

alter table public.posts
  add column if not exists flair_id uuid references public.circle_flairs(id) on delete set null;

alter table public.posts
  add column if not exists is_locked boolean not null default false;

alter table public.posts
  add column if not exists is_announcement boolean not null default false;

alter table public.posts
  add column if not exists requires_approval boolean not null default false;

alter table public.posts
  add column if not exists approved_by uuid references auth.users(id) on delete set null;

alter table public.posts
  add column if not exists approved_at timestamptz;

/* Counters dénormalisés (maintenus par triggers sur circle_post_votes). */
alter table public.posts
  add column if not exists upvotes integer not null default 0
    check (upvotes >= 0);

alter table public.posts
  add column if not exists downvotes integer not null default 0
    check (downvotes >= 0);

alter table public.posts
  add column if not exists helpful_marks integer not null default 0
    check (helpful_marks >= 0);

create index if not exists posts_circle_flair_idx
  on public.posts (circle_id, flair_id)
  where circle_id is not null and deleted_at is null;

create index if not exists posts_circle_requires_approval_idx
  on public.posts (circle_id, requires_approval)
  where circle_id is not null and requires_approval = true and approved_at is null
    and deleted_at is null;

create index if not exists posts_circle_upvotes_idx
  on public.posts (circle_id, upvotes desc)
  where circle_id is not null and deleted_at is null;

-- =====================================================
-- 4. Table circle_post_votes (idempotence + toggle des votes)
-- =====================================================
--
-- Schéma : (user_id, post_id, vote_type). Un user ne peut voter qu'une fois
-- par type sur un post donné. Cliquer à nouveau = retirer le vote.

create table if not exists public.circle_post_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  vote_type text not null
    check (vote_type in ('upvote', 'downvote', 'helpful')),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id, vote_type)
);

create index if not exists circle_post_votes_post_idx
  on public.circle_post_votes (post_id, vote_type);

alter table public.circle_post_votes enable row level security;

drop policy if exists "circle_post_votes readable by post readers" on public.circle_post_votes;
create policy "circle_post_votes readable by post readers"
  on public.circle_post_votes for select
  using (
    /* Vote visible si le post est lisible (la RLS du post fait le filtrage). */
    exists (select 1 from public.posts p where p.id = post_id)
  );

drop policy if exists "circle_post_votes insert own" on public.circle_post_votes;
create policy "circle_post_votes insert own"
  on public.circle_post_votes for insert
  with check (auth.uid() = user_id);

drop policy if exists "circle_post_votes delete own" on public.circle_post_votes;
create policy "circle_post_votes delete own"
  on public.circle_post_votes for delete
  using (auth.uid() = user_id);

-- =====================================================
-- 5. Triggers : maintenir les counters dénormalisés
-- =====================================================

create or replace function public.circle_post_votes_increment()
returns trigger
language plpgsql
as $$
begin
  if new.vote_type = 'upvote' then
    update public.posts set upvotes = upvotes + 1 where id = new.post_id;
  elsif new.vote_type = 'downvote' then
    update public.posts set downvotes = downvotes + 1 where id = new.post_id;
  elsif new.vote_type = 'helpful' then
    update public.posts set helpful_marks = helpful_marks + 1 where id = new.post_id;
  end if;
  return new;
end;
$$;

create or replace function public.circle_post_votes_decrement()
returns trigger
language plpgsql
as $$
begin
  if old.vote_type = 'upvote' then
    update public.posts set upvotes = greatest(upvotes - 1, 0) where id = old.post_id;
  elsif old.vote_type = 'downvote' then
    update public.posts set downvotes = greatest(downvotes - 1, 0) where id = old.post_id;
  elsif old.vote_type = 'helpful' then
    update public.posts set helpful_marks = greatest(helpful_marks - 1, 0) where id = old.post_id;
  end if;
  return old;
end;
$$;

drop trigger if exists circle_post_votes_after_insert on public.circle_post_votes;
create trigger circle_post_votes_after_insert
  after insert on public.circle_post_votes
  for each row execute function public.circle_post_votes_increment();

drop trigger if exists circle_post_votes_after_delete on public.circle_post_votes;
create trigger circle_post_votes_after_delete
  after delete on public.circle_post_votes
  for each row execute function public.circle_post_votes_decrement();

-- =====================================================
-- 6. RPC : toggle_circle_post_vote (UX : 1 appel = vote ou retire)
-- =====================================================

create or replace function public.toggle_circle_post_vote(
  p_post_id uuid,
  p_vote_type text
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

  if p_vote_type not in ('upvote', 'downvote', 'helpful') then
    raise exception 'invalid vote type' using errcode = '22023';
  end if;

  select exists (
    select 1 from public.circle_post_votes
     where user_id = v_user
       and post_id = p_post_id
       and vote_type = p_vote_type
  ) into v_exists;

  if v_exists then
    delete from public.circle_post_votes
     where user_id = v_user
       and post_id = p_post_id
       and vote_type = p_vote_type;
    return false; -- vote retiré
  end if;

  /* Upvote/downvote sont exclusifs : on retire l'opposé avant d'insérer. */
  if p_vote_type in ('upvote', 'downvote') then
    delete from public.circle_post_votes
     where user_id = v_user
       and post_id = p_post_id
       and vote_type = case when p_vote_type = 'upvote' then 'downvote' else 'upvote' end;
  end if;

  insert into public.circle_post_votes (user_id, post_id, vote_type)
       values (v_user, p_post_id, p_vote_type);
  return true; -- vote ajouté
end;
$$;

grant execute on function public.toggle_circle_post_vote(uuid, text)
  to authenticated;

comment on table public.circle_rules is
  'Règles affichées dans l''onglet À propos d''un cercle. Max 15 par cercle.';
comment on table public.circle_flairs is
  'Tags configurables par cercle pour catégoriser les posts (Discussion, Question, Tuto, etc.).';
comment on table public.circle_post_votes is
  'Tracking des votes (upvote/downvote/helpful) pour empêcher les doublons. Triggers maintiennent les counters dénormalisés sur posts.';
