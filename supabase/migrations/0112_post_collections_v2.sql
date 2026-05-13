-- Chantier Feed 1.3 — Collections v2 (Pinterest-style boards).
--
-- L'infra `post_collections` + `post_bookmarks` existe depuis 0025 (système
-- Instagram-like). Cette migration la fait passer en V2 :
--
--   - cover_url       : visuel de la collection (uploadable ou auto)
--   - description     : pourquoi cette collection existe
--   - is_archived     : collection rangée sans la supprimer
--   - share_slug      : partage public via /c/<slug>
--   - color_theme     : couleur d'accent (warm / cool / mono / earth / berry)
--   - last_post_at    : timestamp dernier bookmark — sert au tri "récemment alimentée"
--
-- Sur post_bookmarks :
--   - reading_state   : to_read / reading / done — pour articles & longform
--   - note            : note personnelle de l'user (markdown court)
--   - last_seen_at    : dernier "reprendre où j'étais"
--
-- Toutes additions nullable ou DEFAULT — aucune breaking change.
-- IDEMPOTENT.

-- =====================================================
-- 1. post_collections : champs V2
-- =====================================================

alter table public.post_collections
  add column if not exists cover_url text;

alter table public.post_collections
  add column if not exists description text;
alter table public.post_collections
  drop constraint if exists post_collections_description_len;
alter table public.post_collections
  add constraint post_collections_description_len
  check (description is null or char_length(description) <= 280);

alter table public.post_collections
  add column if not exists is_archived boolean not null default false;

alter table public.post_collections
  add column if not exists share_slug text unique;
alter table public.post_collections
  drop constraint if exists post_collections_share_slug_fmt;
alter table public.post_collections
  add constraint post_collections_share_slug_fmt
  check (
    share_slug is null
    or share_slug ~ '^[a-z0-9][a-z0-9\-]{2,40}[a-z0-9]$'
  );

alter table public.post_collections
  add column if not exists color_theme text not null default 'warm';
alter table public.post_collections
  drop constraint if exists post_collections_color_theme_check;
alter table public.post_collections
  add constraint post_collections_color_theme_check
  check (color_theme in ('warm', 'cool', 'mono', 'earth', 'berry'));

alter table public.post_collections
  add column if not exists last_post_at timestamptz;

create index if not exists post_collections_user_active_idx
  on public.post_collections (user_id, last_post_at desc nulls last)
  where is_archived = false;

create index if not exists post_collections_public_idx
  on public.post_collections (share_slug)
  where share_slug is not null and is_private = false;

-- =====================================================
-- 2. post_bookmarks : champs V2
-- =====================================================

alter table public.post_bookmarks
  add column if not exists reading_state text not null default 'to_read';
alter table public.post_bookmarks
  drop constraint if exists post_bookmarks_reading_state_check;
alter table public.post_bookmarks
  add constraint post_bookmarks_reading_state_check
  check (reading_state in ('to_read', 'reading', 'done'));

alter table public.post_bookmarks
  add column if not exists note text;
alter table public.post_bookmarks
  drop constraint if exists post_bookmarks_note_len;
alter table public.post_bookmarks
  add constraint post_bookmarks_note_len
  check (note is null or char_length(note) <= 500);

alter table public.post_bookmarks
  add column if not exists last_seen_at timestamptz;

create index if not exists post_bookmarks_reading_idx
  on public.post_bookmarks (user_id, reading_state, created_at desc)
  where reading_state in ('to_read', 'reading');

-- =====================================================
-- 3. Trigger : maintenir last_post_at sur collection
-- =====================================================

create or replace function public.bump_collection_last_post_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.collection_id is not null then
    update public.post_collections
       set last_post_at = now()
     where id = new.collection_id;
  elsif tg_op = 'UPDATE'
        and new.collection_id is distinct from old.collection_id
        and new.collection_id is not null then
    update public.post_collections
       set last_post_at = now()
     where id = new.collection_id;
  end if;
  return null;
end;
$$;

drop trigger if exists post_bookmarks_bump_last_post on public.post_bookmarks;
create trigger post_bookmarks_bump_last_post
  after insert or update on public.post_bookmarks
  for each row execute function public.bump_collection_last_post_at();

-- =====================================================
-- 4. RPC : générer un share_slug pour une collection
-- =====================================================
--
-- Si la collection est privée, on la passe is_private=false implicitement
-- (sinon le partage public n'aurait aucun sens). L'user reste owner.

create or replace function public.share_collection(
  p_collection_id uuid,
  p_desired_slug text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_slug text;
  v_base text;
  v_existing text;
begin
  if v_user is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  /* Vérifie ownership. */
  select share_slug into v_existing
    from public.post_collections
   where id = p_collection_id and user_id = v_user;

  if not found then
    raise exception 'collection not found' using errcode = 'P0002';
  end if;

  if v_existing is not null then
    return v_existing;
  end if;

  /* Génère un slug base depuis le nom si pas demandé. */
  if p_desired_slug is not null and char_length(p_desired_slug) >= 4 then
    v_base := lower(regexp_replace(p_desired_slug, '[^a-z0-9]+', '-', 'g'));
  else
    select lower(regexp_replace(name, '[^a-z0-9]+', '-', 'g'))
      into v_base
      from public.post_collections
     where id = p_collection_id;
  end if;

  v_base := trim(both '-' from v_base);
  if char_length(v_base) < 4 then
    v_base := 'col-' || substr(replace(p_collection_id::text, '-', ''), 1, 6);
  end if;

  /* Trouve un slug libre — suffixe numérique au besoin. */
  v_slug := v_base;
  for i in 0..50 loop
    exit when not exists (
      select 1 from public.post_collections where share_slug = v_slug
    );
    v_slug := v_base || '-' || i;
  end loop;

  update public.post_collections
     set share_slug = v_slug,
         is_private = false
   where id = p_collection_id;

  return v_slug;
end;
$$;

grant execute on function public.share_collection(uuid, text) to authenticated;

-- =====================================================
-- 5. RPC : organiser un bookmark (collection + état lecture + note)
-- =====================================================

create or replace function public.organize_bookmark(
  p_post_id uuid,
  p_collection_id uuid default null,
  p_reading_state text default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.post_bookmarks
     where user_id = v_user and post_id = p_post_id
  ) then
    raise exception 'bookmark not found' using errcode = 'P0002';
  end if;

  update public.post_bookmarks
     set collection_id = coalesce(p_collection_id, collection_id),
         reading_state = coalesce(p_reading_state, reading_state),
         note = case when p_note is null then note else p_note end
   where user_id = v_user
     and post_id = p_post_id;
end;
$$;

grant execute on function public.organize_bookmark(uuid, uuid, text, text)
  to authenticated;

-- =====================================================
-- 6. RPC : marquer "vu" un bookmark (reprendre où j'étais)
-- =====================================================

create or replace function public.touch_bookmark(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return;
  end if;

  update public.post_bookmarks
     set last_seen_at = now(),
         reading_state = case
           when reading_state = 'to_read' then 'reading'
           else reading_state
         end
   where user_id = v_user
     and post_id = p_post_id;
end;
$$;

grant execute on function public.touch_bookmark(uuid) to authenticated;

-- =====================================================
-- 7. Commentaires
-- =====================================================

comment on column public.post_collections.cover_url is
  'URL du visuel de la collection (Pinterest-style board cover).';
comment on column public.post_collections.share_slug is
  'Slug public pour partager la collection via /c/<slug>. NULL = privé.';
comment on column public.post_collections.color_theme is
  'Thème couleur de la collection : warm/cool/mono/earth/berry.';
comment on column public.post_collections.last_post_at is
  'Timestamp du dernier bookmark ajouté — tri "récemment alimentée".';
comment on column public.post_bookmarks.reading_state is
  'État de lecture : to_read (default) / reading / done.';
comment on column public.post_bookmarks.note is
  'Note personnelle de l''user attachée au bookmark (markdown court, ≤500).';
comment on function public.share_collection(uuid, text) is
  'Génère ou retourne le share_slug d''une collection. Passe is_private=false.';
comment on function public.organize_bookmark(uuid, uuid, text, text) is
  'Met à jour collection_id, reading_state et/ou note d''un bookmark.';
comment on function public.touch_bookmark(uuid) is
  'Marque un bookmark comme vu (last_seen_at + passe to_read → reading).';
