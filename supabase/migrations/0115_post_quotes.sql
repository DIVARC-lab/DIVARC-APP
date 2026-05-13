-- Chantier Feed 4.4 — Quote-post (citation d'un post dans un autre).
--
-- Un post peut citer un autre post (Twitter-style « Retweet with comment »).
-- Stocké en colonne `quoted_post_id` self-référente sur posts.
--
-- Comportement :
--   - Si le post cité est supprimé : ON DELETE SET NULL — la citation
--     reste mais affiche « Post indisponible ».
--   - Le post citant doit être visible par l'auteur du post cité (RLS posts
--     gère déjà la visibility, on n'ajoute pas de contrainte).
--   - Un compteur dénormalisé `quotes_count` sur posts maintient le nombre
--     de fois qu'un post a été cité (utile pour trending).
--
-- IDEMPOTENT.

-- =====================================================
-- 1. posts.quoted_post_id + quotes_count
-- =====================================================

alter table public.posts
  add column if not exists quoted_post_id uuid
    references public.posts(id) on delete set null;

alter table public.posts
  add column if not exists quotes_count integer not null default 0;

create index if not exists posts_quoted_post_id_idx
  on public.posts (quoted_post_id)
  where quoted_post_id is not null and deleted_at is null;

-- =====================================================
-- 2. Trigger : maintenir quotes_count sur le post cité
-- =====================================================

create or replace function public.bump_post_quotes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.quoted_post_id is not null then
    update public.posts
       set quotes_count = quotes_count + 1
     where id = new.quoted_post_id;
  elsif tg_op = 'DELETE' and old.quoted_post_id is not null then
    update public.posts
       set quotes_count = greatest(quotes_count - 1, 0)
     where id = old.quoted_post_id;
  elsif tg_op = 'UPDATE'
        and new.quoted_post_id is distinct from old.quoted_post_id then
    if old.quoted_post_id is not null then
      update public.posts
         set quotes_count = greatest(quotes_count - 1, 0)
       where id = old.quoted_post_id;
    end if;
    if new.quoted_post_id is not null then
      update public.posts
         set quotes_count = quotes_count + 1
       where id = new.quoted_post_id;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists posts_quotes_count_ins on public.posts;
drop trigger if exists posts_quotes_count_del on public.posts;
drop trigger if exists posts_quotes_count_upd on public.posts;
create trigger posts_quotes_count_ins
  after insert on public.posts
  for each row execute function public.bump_post_quotes_count();
create trigger posts_quotes_count_del
  after delete on public.posts
  for each row execute function public.bump_post_quotes_count();
create trigger posts_quotes_count_upd
  after update of quoted_post_id on public.posts
  for each row execute function public.bump_post_quotes_count();

comment on column public.posts.quoted_post_id is
  'Post cité dans ce post (quote-post Twitter-style). NULL = pas de citation.';
comment on column public.posts.quotes_count is
  'Nombre de fois que ce post a été cité par d''autres posts (dénormalisé).';
