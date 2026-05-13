-- Chantier Feed 2.1 — Polls v2 (enrichit le schéma existant 0052).
--
-- L'infra `post_polls` / `post_poll_options` / `post_poll_votes` existe depuis
-- la migration 0052. Cette migration V2 :
--
--   1. Ajoute `is_closed` sur post_polls (l'auteur peut fermer manuellement
--      même avant `ends_at`).
--   2. Ajoute `emoji` sur post_poll_options (label visuel optionnel).
--   3. RPC `vote_poll(poll_id, option_ids)` upsert atomique côté DB —
--      remplace l'insert/delete manuel actuel dans feed/actions.ts.
--   4. RPC `close_poll(poll_id)` pour fermeture manuelle.
--   5. RPC `recompute_poll_counts(poll_id)` filet de sécurité.
--
-- IDEMPOTENT. Aucune breaking change.

-- =====================================================
-- 1. post_polls : is_closed
-- =====================================================

alter table public.post_polls
  add column if not exists is_closed boolean not null default false;

-- =====================================================
-- 2. post_poll_options : emoji
-- =====================================================

alter table public.post_poll_options
  add column if not exists emoji text;
alter table public.post_poll_options
  drop constraint if exists post_poll_options_emoji_len;
alter table public.post_poll_options
  add constraint post_poll_options_emoji_len
  check (emoji is null or char_length(emoji) between 1 and 8);

-- =====================================================
-- 3. RPC vote_poll : upsert atomique
-- =====================================================
--
-- Comportement :
--   - Vérifie le poll ouvert (is_closed = false, ends_at futur ou null).
--   - Si multi_choice = false : remplace tout vote précédent.
--   - Si multi_choice = true : remplace l'ensemble des votes par la nouvelle liste.
--   - Tous les compteurs sont maintenus par le trigger existant.

create or replace function public.vote_poll(
  p_poll_id uuid,
  p_option_ids uuid[]
)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_poll record;
  v_n_provided int;
begin
  if v_user is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select id, multi_choice, is_closed, ends_at
    into v_poll
    from public.post_polls
   where id = p_poll_id;

  if not found then
    raise exception 'poll not found' using errcode = 'P0002';
  end if;

  if v_poll.is_closed
     or (v_poll.ends_at is not null and v_poll.ends_at < now()) then
    raise exception 'poll closed' using errcode = '22023';
  end if;

  v_n_provided := coalesce(array_length(p_option_ids, 1), 0);
  if v_n_provided < 1 then
    raise exception 'no option selected' using errcode = '22023';
  end if;

  if not v_poll.multi_choice and v_n_provided > 1 then
    raise exception 'single choice poll' using errcode = '22023';
  end if;

  /* Vérifie que toutes les options appartiennent au poll. */
  if exists (
    select 1 from unnest(p_option_ids) opt
    where not exists (
      select 1 from public.post_poll_options o
       where o.id = opt and o.poll_id = p_poll_id
    )
  ) then
    raise exception 'invalid option id' using errcode = '22023';
  end if;

  /* Reset des votes précédents de l'user pour ce poll. */
  delete from public.post_poll_votes
   where poll_id = p_poll_id and user_id = v_user;

  /* Insert les nouveaux votes. */
  insert into public.post_poll_votes (poll_id, option_id, user_id)
    select p_poll_id, opt, v_user
      from unnest(p_option_ids) opt;

  return p_option_ids;
end;
$$;

grant execute on function public.vote_poll(uuid, uuid[]) to authenticated;

-- =====================================================
-- 4. RPC close_poll : fermeture manuelle par l'auteur
-- =====================================================

create or replace function public.close_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_author uuid;
begin
  select p.author_id
    into v_author
    from public.post_polls pp
    join public.posts p on p.id = pp.post_id
   where pp.id = p_poll_id;

  if v_author is null then
    raise exception 'poll not found' using errcode = 'P0002';
  end if;

  if v_user is not null and v_user <> v_author then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.post_polls
     set is_closed = true
   where id = p_poll_id;
end;
$$;

grant execute on function public.close_poll(uuid) to authenticated;

-- =====================================================
-- 5. RPC recompute_poll_counts : filet de sécurité (recalc)
-- =====================================================
--
-- Si jamais les compteurs dérivent (trigger raté, import manuel), on peut
-- forcer le recalcul. Idempotent.

create or replace function public.recompute_poll_counts(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.post_poll_options o
     set votes_count = (
       select count(*)
         from public.post_poll_votes v
        where v.option_id = o.id
     )
   where o.poll_id = p_poll_id;

  update public.post_polls pp
     set total_votes = (
       select count(distinct user_id)
         from public.post_poll_votes v
        where v.poll_id = pp.id
     )
   where pp.id = p_poll_id;
end;
$$;

grant execute on function public.recompute_poll_counts(uuid) to service_role;

-- =====================================================
-- 6. Index pour query "polls ouverts" (cron auto-close)
-- =====================================================

create index if not exists post_polls_auto_close_idx
  on public.post_polls (ends_at)
  where is_closed = false and ends_at is not null;

comment on column public.post_polls.is_closed is
  'Si true, le sondage est fermé (par auteur ou ends_at dépassé via cron).';
comment on column public.post_poll_options.emoji is
  'Emoji optionnel affiché devant le label (≤8 char).';
comment on function public.vote_poll(uuid, uuid[]) is
  'Upsert atomique d''un vote. Reset les votes précédents de l''user, insert les nouveaux. Valide multi_choice + ouverture.';
comment on function public.close_poll(uuid) is
  'Ferme manuellement un sondage. Author-only.';
