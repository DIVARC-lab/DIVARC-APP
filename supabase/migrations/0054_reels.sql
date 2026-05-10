-- =====================================================
-- DIVARC — Migration 0054 : Reels TikTok-grade
-- =====================================================
-- Phase 3 — section Reels DIVARC inspirée TikTok.
--
-- Architecture :
--   - sounds : bibliothèque musicale partagée (Pixabay + sons originaux)
--   - reels : posts vidéo verticaux 9:16 fullscreen
--   - reel_likes / reel_saves / reel_views / reel_comments
--   - reel_duets / reel_stitches : relations virales
--
-- Toutes les tables ont RLS strict + index pour le feed For You.

-- =====================================================
-- 1. sounds — bibliothèque musicale
-- =====================================================
create table if not exists public.sounds (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 200),
  artist text not null check (char_length(artist) <= 120),
  duration_seconds numeric(8, 3) not null check (duration_seconds > 0 and duration_seconds <= 600),
  audio_url text not null,
  /* Artwork (cover du son). */
  artwork_url text,
  /* Source / licence. */
  source text not null default 'user_original'
    check (source in (
      'pixabay', 'unsplash_audio', 'epidemic_sound',
      'user_original', 'sound_effect'
    )),
  license_info jsonb not null default '{}'::jsonb,
  /* Compteur de reels qui utilisent ce son. */
  usage_count integer not null default 0,
  is_explicit boolean not null default false,
  /* User créateur si source=user_original. */
  created_by uuid references auth.users(id) on delete set null,
  /* Si extrait d'un reel original DIVARC, lien vers le reel source. */
  source_reel_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists sounds_usage_count_idx
  on public.sounds (usage_count desc);
create index if not exists sounds_source_idx on public.sounds (source);
create index if not exists sounds_title_trgm_idx on public.sounds using gin (title gin_trgm_ops);

-- =====================================================
-- 2. reels — vidéos verticales 9:16
-- =====================================================
create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,

  /* Média principal. */
  video_url text not null, /* URL HLS .m3u8 (priorité). */
  video_mp4_fallback text, /* MP4 720p fallback. */
  duration_seconds numeric(8, 3) not null check (duration_seconds > 0 and duration_seconds <= 90),
  aspect_ratio text not null default '9:16'
    check (aspect_ratio in ('9:16', '1:1', '4:5', '16:9')),
  poster_url text,
  blurhash text,

  /* Contenu. */
  description text check (description is null or char_length(description) <= 2200),
  hashtags text[] not null default '{}'::text[],
  mentioned_users uuid[] not null default '{}'::uuid[],

  /* Localisation (réutilise structure posts). */
  location_name text,
  location_city text,
  location_country text check (location_country is null or char_length(location_country) = 2),
  location_lat numeric(9, 6) check (location_lat is null or (location_lat >= -90 and location_lat <= 90)),
  location_lng numeric(9, 6) check (location_lng is null or (location_lng >= -180 and location_lng <= 180)),

  /* Audio. */
  sound_id uuid references public.sounds(id) on delete set null,
  has_voiceover boolean not null default false,

  /* Effets utilisés (pour découverte "essayer cet effet"). */
  effects_used text[] not null default '{}'::text[],

  /* Permissions créateur. */
  allow_comments boolean not null default true,
  allow_duets boolean not null default true,
  allow_stitches boolean not null default true,
  allow_downloads boolean not null default false,

  /* Audience. */
  audience text not null default 'public'
    check (audience in ('public', 'friends', 'private')),

  /* Engagement (compteurs dénormalisés mis à jour async par triggers). */
  views_count integer not null default 0,
  plays_count integer not null default 0, /* incl. replays */
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  shares_count integer not null default 0,
  saves_count integer not null default 0,
  duets_count integer not null default 0,
  stitches_count integer not null default 0,

  /* Modération. */
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'flagged', 'hidden')),
  moderation_reason text,

  /* Programmation / soft delete. */
  status text not null default 'published'
    check (status in ('draft', 'scheduled', 'published', 'archived')),
  scheduled_for timestamptz,
  deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reels_author_id_created_at_idx
  on public.reels (author_id, created_at desc)
  where deleted_at is null;
create index if not exists reels_created_at_idx
  on public.reels (created_at desc)
  where deleted_at is null and status = 'published' and audience = 'public';
create index if not exists reels_sound_id_idx
  on public.reels (sound_id, created_at desc)
  where deleted_at is null and sound_id is not null;
create index if not exists reels_hashtags_gin_idx
  on public.reels using gin (hashtags);
create index if not exists reels_status_scheduled_idx
  on public.reels (scheduled_for)
  where status = 'scheduled' and deleted_at is null;

-- Foreign key sur sounds.source_reel_id (déclarée après pour résoudre la
-- dépendance circulaire reels ↔ sounds).
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'sounds_source_reel_id_fkey'
  ) then
    alter table public.sounds
      add constraint sounds_source_reel_id_fkey
      foreign key (source_reel_id) references public.reels(id) on delete set null;
  end if;
end $$;

-- =====================================================
-- 3. reel_likes
-- =====================================================
create table if not exists public.reel_likes (
  reel_id uuid not null references public.reels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reel_id, user_id)
);

create index if not exists reel_likes_user_id_idx
  on public.reel_likes (user_id, created_at desc);

-- =====================================================
-- 4. reel_saves
-- =====================================================
create table if not exists public.reel_saves (
  reel_id uuid not null references public.reels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reel_id, user_id)
);

-- =====================================================
-- 5. reel_views — track signals recsys (watch time + replay + skip)
-- =====================================================
create table if not exists public.reel_views (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  /* watch_ms = temps total visionné cumulé (incluant replays). */
  watch_ms integer not null default 0,
  completed_pct numeric(5, 2) not null default 0
    check (completed_pct >= 0 and completed_pct <= 100),
  replay_count integer not null default 0,
  /* Skip < 3s = signal négatif fort. */
  skipped boolean not null default false,
  /* Liked / saved / shared depuis cette vue (signaux d'intent). */
  did_like boolean not null default false,
  did_save boolean not null default false,
  did_share boolean not null default false,
  did_comment boolean not null default false,
  viewed_at timestamptz not null default now()
);

create index if not exists reel_views_user_id_viewed_at_idx
  on public.reel_views (user_id, viewed_at desc);
create index if not exists reel_views_reel_id_idx
  on public.reel_views (reel_id);

-- =====================================================
-- 6. reel_comments
-- =====================================================
create table if not exists public.reel_comments (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reels(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  /* Reply-to pour les threads de commentaires. */
  parent_id uuid references public.reel_comments(id) on delete cascade,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists reel_comments_reel_id_created_at_idx
  on public.reel_comments (reel_id, created_at desc)
  where deleted_at is null;

-- =====================================================
-- 7. reel_duets — vidéo enregistrée à côté d'une existante
-- =====================================================
create table if not exists public.reel_duets (
  id uuid primary key default gen_random_uuid(),
  source_reel_id uuid not null references public.reels(id) on delete cascade,
  duet_reel_id uuid not null unique references public.reels(id) on delete cascade,
  /* Layout : right (default), left, top, bottom. */
  layout text not null default 'right'
    check (layout in ('right', 'left', 'top', 'bottom')),
  created_at timestamptz not null default now()
);

create index if not exists reel_duets_source_idx
  on public.reel_duets (source_reel_id, created_at desc);

-- =====================================================
-- 8. reel_stitches — extrait + suite
-- =====================================================
create table if not exists public.reel_stitches (
  id uuid primary key default gen_random_uuid(),
  source_reel_id uuid not null references public.reels(id) on delete cascade,
  stitch_reel_id uuid not null unique references public.reels(id) on delete cascade,
  /* Segment extrait du source (max 5s). */
  segment_start_ms integer not null check (segment_start_ms >= 0),
  segment_end_ms integer not null check (segment_end_ms <= 5000),
  created_at timestamptz not null default now(),
  check (segment_end_ms > segment_start_ms)
);

create index if not exists reel_stitches_source_idx
  on public.reel_stitches (source_reel_id, created_at desc);

-- =====================================================
-- 9. Triggers compteurs (likes/saves/comments/duets/stitches)
-- =====================================================
create or replace function public.bump_reel_likes_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.reels set likes_count = likes_count + 1 where id = new.reel_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.reels set likes_count = greatest(0, likes_count - 1) where id = old.reel_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_reel_likes_counter on public.reel_likes;
create trigger trg_reel_likes_counter
  after insert or delete on public.reel_likes
  for each row execute function public.bump_reel_likes_counter();

create or replace function public.bump_reel_saves_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.reels set saves_count = saves_count + 1 where id = new.reel_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.reels set saves_count = greatest(0, saves_count - 1) where id = old.reel_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_reel_saves_counter on public.reel_saves;
create trigger trg_reel_saves_counter
  after insert or delete on public.reel_saves
  for each row execute function public.bump_reel_saves_counter();

create or replace function public.bump_reel_comments_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.deleted_at is null) then
    update public.reels set comments_count = comments_count + 1 where id = new.reel_id;
    return new;
  elsif (tg_op = 'UPDATE' and old.deleted_at is null and new.deleted_at is not null) then
    update public.reels set comments_count = greatest(0, comments_count - 1) where id = new.reel_id;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_reel_comments_counter on public.reel_comments;
create trigger trg_reel_comments_counter
  after insert or update of deleted_at on public.reel_comments
  for each row execute function public.bump_reel_comments_counter();

create or replace function public.bump_sound_usage()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT' and new.sound_id is not null) then
    update public.sounds set usage_count = usage_count + 1 where id = new.sound_id;
  elsif (tg_op = 'UPDATE' and old.sound_id is distinct from new.sound_id) then
    if old.sound_id is not null then
      update public.sounds set usage_count = greatest(0, usage_count - 1) where id = old.sound_id;
    end if;
    if new.sound_id is not null then
      update public.sounds set usage_count = usage_count + 1 where id = new.sound_id;
    end if;
  elsif (tg_op = 'DELETE' and old.sound_id is not null) then
    update public.sounds set usage_count = greatest(0, usage_count - 1) where id = old.sound_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_reels_sound_usage on public.reels;
create trigger trg_reels_sound_usage
  after insert or update of sound_id or delete on public.reels
  for each row execute function public.bump_sound_usage();

-- =====================================================
-- 10. RLS
-- =====================================================
alter table public.sounds enable row level security;
alter table public.reels enable row level security;
alter table public.reel_likes enable row level security;
alter table public.reel_saves enable row level security;
alter table public.reel_views enable row level security;
alter table public.reel_comments enable row level security;
alter table public.reel_duets enable row level security;
alter table public.reel_stitches enable row level security;

/* sounds : lecture publique, écriture par user authentifié (sons originaux). */
drop policy if exists sounds_select on public.sounds;
create policy sounds_select on public.sounds for select using (true);
drop policy if exists sounds_insert on public.sounds;
create policy sounds_insert on public.sounds for insert
  with check (auth.uid() is not null and (created_by = auth.uid() or source != 'user_original'));

/* reels : lecture conditionnée à audience, écriture par auteur. */
drop policy if exists reels_select on public.reels;
create policy reels_select on public.reels for select
  using (
    deleted_at is null
    and status = 'published'
    and (
      audience = 'public'
      or author_id = auth.uid()
      or (
        audience = 'friends'
        and exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and (
              (f.requester_id = auth.uid() and f.recipient_id = author_id)
              or (f.recipient_id = auth.uid() and f.requester_id = author_id)
            )
        )
      )
    )
  );

drop policy if exists reels_insert on public.reels;
create policy reels_insert on public.reels for insert
  with check (author_id = auth.uid());

drop policy if exists reels_update on public.reels;
create policy reels_update on public.reels for update
  using (author_id = auth.uid());

drop policy if exists reels_delete on public.reels;
create policy reels_delete on public.reels for delete
  using (author_id = auth.uid());

/* reel_likes / reel_saves : lecture publique, écriture par self. */
drop policy if exists reel_likes_select on public.reel_likes;
create policy reel_likes_select on public.reel_likes for select using (true);
drop policy if exists reel_likes_insert on public.reel_likes;
create policy reel_likes_insert on public.reel_likes for insert
  with check (user_id = auth.uid());
drop policy if exists reel_likes_delete on public.reel_likes;
create policy reel_likes_delete on public.reel_likes for delete
  using (user_id = auth.uid());

drop policy if exists reel_saves_select on public.reel_saves;
create policy reel_saves_select on public.reel_saves for select
  using (user_id = auth.uid());
drop policy if exists reel_saves_insert on public.reel_saves;
create policy reel_saves_insert on public.reel_saves for insert
  with check (user_id = auth.uid());
drop policy if exists reel_saves_delete on public.reel_saves;
create policy reel_saves_delete on public.reel_saves for delete
  using (user_id = auth.uid());

/* reel_views : insert par self uniquement (recsys), lecture par self. */
drop policy if exists reel_views_select on public.reel_views;
create policy reel_views_select on public.reel_views for select
  using (user_id = auth.uid());
drop policy if exists reel_views_insert on public.reel_views;
create policy reel_views_insert on public.reel_views for insert
  with check (user_id = auth.uid());

/* reel_comments : lecture publique (modulée par reel), écriture self. */
drop policy if exists reel_comments_select on public.reel_comments;
create policy reel_comments_select on public.reel_comments for select using (true);
drop policy if exists reel_comments_insert on public.reel_comments;
create policy reel_comments_insert on public.reel_comments for insert
  with check (author_id = auth.uid());
drop policy if exists reel_comments_update on public.reel_comments;
create policy reel_comments_update on public.reel_comments for update
  using (author_id = auth.uid());

/* reel_duets / reel_stitches : lecture publique, insert via server action. */
drop policy if exists reel_duets_select on public.reel_duets;
create policy reel_duets_select on public.reel_duets for select using (true);
drop policy if exists reel_duets_insert on public.reel_duets;
create policy reel_duets_insert on public.reel_duets for insert
  with check (
    exists (
      select 1 from public.reels r
      where r.id = duet_reel_id and r.author_id = auth.uid()
    )
  );

drop policy if exists reel_stitches_select on public.reel_stitches;
create policy reel_stitches_select on public.reel_stitches for select using (true);
drop policy if exists reel_stitches_insert on public.reel_stitches;
create policy reel_stitches_insert on public.reel_stitches for insert
  with check (
    exists (
      select 1 from public.reels r
      where r.id = stitch_reel_id and r.author_id = auth.uid()
    )
  );
