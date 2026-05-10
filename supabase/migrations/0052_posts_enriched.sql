-- =====================================================
-- DIVARC — Migration 0052 : Posts enrichis (Facebook-grade)
-- =====================================================
-- Phase 1 du chantier "Création de publications Facebook-grade".
--
-- Ajoute :
--   - Mode "pensée rapide" (background_color)
--   - Sentiment / Activité (Facebook-style)
--   - Localisation (Mapbox places)
--   - Link preview Open Graph
--   - Audience avancée (cercle + exclusions)
--   - Carrousel multi-slides indépendantes
--   - Programmation + brouillons côté serveur
--   - Tags utilisateurs (post_tagged_users)
--   - Sondages (post_polls + options + votes)
--
-- Dépendances : 0007_posts, 0029_circle_posts, 0023_hashtags_mentions.
-- Tolérance : tous les ALTER + CREATE en IF NOT EXISTS pour idempotence.

-- =====================================================
-- 1. Enrichissement de la table posts
-- =====================================================

alter table public.posts
  /* Mode "pensée rapide" — gradient de fond pour textes courts. */
  add column if not exists background_color text
    check (
      background_color is null
      or background_color in (
        'navy', 'gold', 'cream', 'gradient_dawn', 'gradient_dusk',
        'gradient_ocean', 'gradient_forest', 'gradient_rose'
      )
    ),

  /* Sentiment / Activité (Facebook : "se sent..." / "regarde..."). */
  add column if not exists sentiment_emoji text,
  add column if not exists sentiment_label text
    check (sentiment_label is null or char_length(sentiment_label) <= 50),
  add column if not exists activity_type text
    check (
      activity_type is null
      or activity_type in (
        'watching', 'listening', 'playing', 'reading',
        'eating', 'traveling', 'celebrating', 'feeling'
      )
    ),
  add column if not exists activity_detail text
    check (activity_detail is null or char_length(activity_detail) <= 120),

  /* Localisation (résolue via Mapbox côté client). */
  add column if not exists location_name text
    check (location_name is null or char_length(location_name) <= 200),
  add column if not exists location_city text
    check (location_city is null or char_length(location_city) <= 120),
  add column if not exists location_country text
    check (location_country is null or char_length(location_country) = 2),
  add column if not exists location_lat numeric(9, 6)
    check (location_lat is null or (location_lat >= -90 and location_lat <= 90)),
  add column if not exists location_lng numeric(9, 6)
    check (location_lng is null or (location_lng >= -180 and location_lng <= 180)),

  /* Link preview Open Graph détecté à la publication. */
  add column if not exists link_preview jsonb,

  /* Audience avancée — exclure des users spécifiques. */
  add column if not exists audience_excluded_user_ids uuid[]
    not null default '{}'::uuid[],

  /* Carrousel multi-slides (chaque slide indépendante : caption, lien, CTA). */
  add column if not exists is_carousel boolean not null default false,
  add column if not exists carousel_slides jsonb,

  /* Programmation publication différée (cron `posts-publish-scheduled`). */
  add column if not exists scheduled_for timestamptz,
  add column if not exists published_at timestamptz default now(),

  /* Brouillon serveur (statut). Permet de revenir éditer plus tard
     depuis n'importe quel device, en plus du draft localStorage. */
  add column if not exists status text not null default 'published'
    check (status in ('draft', 'scheduled', 'published', 'archived'));

/* Index pour le scheduler cron. */
create index if not exists posts_scheduled_idx
  on public.posts (scheduled_for)
  where status = 'scheduled' and deleted_at is null;

/* Index pour les drafts par auteur. */
create index if not exists posts_author_drafts_idx
  on public.posts (author_id, updated_at desc)
  where status = 'draft' and deleted_at is null;

-- =====================================================
-- 2. post_tagged_users — tags personnes dans un post
-- =====================================================
create table if not exists public.post_tagged_users (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  /* Pour les tags sur photos : index de la photo + position % (0-1). */
  photo_id uuid references public.post_photos(id) on delete cascade,
  position_x numeric(5, 4)
    check (position_x is null or (position_x >= 0 and position_x <= 1)),
  position_y numeric(5, 4)
    check (position_y is null or (position_y >= 0 and position_y <= 1)),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, coalesce(photo_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

create index if not exists post_tagged_users_user_id_idx
  on public.post_tagged_users (user_id, created_at desc);

create index if not exists post_tagged_users_post_id_idx
  on public.post_tagged_users (post_id);

-- =====================================================
-- 3. post_polls + options + votes
-- =====================================================
create table if not exists public.post_polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 200),
  /* Permet de choisir plusieurs options simultanément. */
  multi_choice boolean not null default false,
  /* Vote anonyme (Premium DIVARC V1.5). */
  is_anonymous boolean not null default false,
  /* Date de fin de vote — null = illimité. */
  ends_at timestamptz,
  /* Compteur dénormalisé total votes (dispatché par trigger ci-dessous). */
  total_votes integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists post_polls_ends_at_idx
  on public.post_polls (ends_at)
  where ends_at is not null;

create table if not exists public.post_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.post_polls(id) on delete cascade,
  position integer not null check (position between 0 and 5),
  label text not null check (char_length(label) between 1 and 80),
  votes_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (poll_id, position)
);

create index if not exists post_poll_options_poll_id_idx
  on public.post_poll_options (poll_id, position);

create table if not exists public.post_poll_votes (
  poll_id uuid not null references public.post_polls(id) on delete cascade,
  option_id uuid not null references public.post_poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, option_id, user_id)
);

create index if not exists post_poll_votes_user_id_idx
  on public.post_poll_votes (user_id);

/* Trigger : maj compteurs option + total au vote. */
create or replace function public.bump_poll_vote_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.post_poll_options
       set votes_count = votes_count + 1
     where id = new.option_id;
    update public.post_polls
       set total_votes = total_votes + 1
     where id = new.poll_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.post_poll_options
       set votes_count = greatest(0, votes_count - 1)
     where id = old.option_id;
    update public.post_polls
       set total_votes = greatest(0, total_votes - 1)
     where id = old.poll_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_post_poll_votes_counter on public.post_poll_votes;
create trigger trg_post_poll_votes_counter
  after insert or delete on public.post_poll_votes
  for each row
  execute function public.bump_poll_vote_counters();

-- =====================================================
-- 4. RLS policies
-- =====================================================
alter table public.post_tagged_users enable row level security;
alter table public.post_polls enable row level security;
alter table public.post_poll_options enable row level security;
alter table public.post_poll_votes enable row level security;

/* post_tagged_users : lecture publique (le tag est l'info publique du post),
   écriture par l'auteur du post seulement. */
drop policy if exists post_tagged_users_select on public.post_tagged_users;
create policy post_tagged_users_select on public.post_tagged_users
  for select using (true);

drop policy if exists post_tagged_users_insert on public.post_tagged_users;
create policy post_tagged_users_insert on public.post_tagged_users
  for insert
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

drop policy if exists post_tagged_users_delete on public.post_tagged_users;
create policy post_tagged_users_delete on public.post_tagged_users
  for delete
  using (
    /* L'auteur peut retirer ; le tagué peut se détaguer. */
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
    or user_id = auth.uid()
  );

/* post_polls : lecture publique (visibilité pilotée par le post parent),
   écriture par l'auteur du post. */
drop policy if exists post_polls_select on public.post_polls;
create policy post_polls_select on public.post_polls
  for select using (true);

drop policy if exists post_polls_insert on public.post_polls;
create policy post_polls_insert on public.post_polls
  for insert
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

drop policy if exists post_polls_update on public.post_polls;
create policy post_polls_update on public.post_polls
  for update
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

drop policy if exists post_polls_delete on public.post_polls;
create policy post_polls_delete on public.post_polls
  for delete
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

/* post_poll_options : lecture publique, écriture par l'auteur. */
drop policy if exists post_poll_options_select on public.post_poll_options;
create policy post_poll_options_select on public.post_poll_options
  for select using (true);

drop policy if exists post_poll_options_insert on public.post_poll_options;
create policy post_poll_options_insert on public.post_poll_options
  for insert
  with check (
    exists (
      select 1
      from public.post_polls pp
      join public.posts p on p.id = pp.post_id
      where pp.id = poll_id and p.author_id = auth.uid()
    )
  );

drop policy if exists post_poll_options_delete on public.post_poll_options;
create policy post_poll_options_delete on public.post_poll_options
  for delete
  using (
    exists (
      select 1
      from public.post_polls pp
      join public.posts p on p.id = pp.post_id
      where pp.id = poll_id and p.author_id = auth.uid()
    )
  );

/* post_poll_votes : lecture publique pour le total, écriture par tout
   user authentifié (1 vote par user / option). Suppression par le user. */
drop policy if exists post_poll_votes_select on public.post_poll_votes;
create policy post_poll_votes_select on public.post_poll_votes
  for select using (true);

drop policy if exists post_poll_votes_insert on public.post_poll_votes;
create policy post_poll_votes_insert on public.post_poll_votes
  for insert
  with check (user_id = auth.uid());

drop policy if exists post_poll_votes_delete on public.post_poll_votes;
create policy post_poll_votes_delete on public.post_poll_votes
  for delete
  using (user_id = auth.uid());

-- =====================================================
-- 5. RPC : has_user_voted_in_poll(poll_id) — pour UI
-- =====================================================
create or replace function public.poll_user_votes(p_poll_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select option_id
  from public.post_poll_votes
  where poll_id = p_poll_id and user_id = auth.uid();
$$;

grant execute on function public.poll_user_votes(uuid) to authenticated;
