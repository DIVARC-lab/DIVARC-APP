-- =====================================================
-- DIVARC — Migration 0055 : Likes sur les commentaires de Reels (V3)
-- =====================================================
-- Phase 3 V3 quick win — permet aux users de liker les commentaires
-- des reels (TikTok-style : compteur visible, bouton cœur).

create table if not exists public.reel_comment_likes (
  comment_id uuid not null references public.reel_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index if not exists reel_comment_likes_user_id_idx
  on public.reel_comment_likes (user_id, created_at desc);

/* Trigger : maj likes_count sur reel_comments. */
create or replace function public.bump_reel_comment_likes_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.reel_comments
       set likes_count = likes_count + 1
     where id = new.comment_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.reel_comments
       set likes_count = greatest(0, likes_count - 1)
     where id = old.comment_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_reel_comment_likes on public.reel_comment_likes;
create trigger trg_reel_comment_likes
  after insert or delete on public.reel_comment_likes
  for each row execute function public.bump_reel_comment_likes_counter();

-- RLS
alter table public.reel_comment_likes enable row level security;

drop policy if exists reel_comment_likes_select on public.reel_comment_likes;
create policy reel_comment_likes_select on public.reel_comment_likes
  for select using (true);

drop policy if exists reel_comment_likes_insert on public.reel_comment_likes;
create policy reel_comment_likes_insert on public.reel_comment_likes
  for insert with check (user_id = auth.uid());

drop policy if exists reel_comment_likes_delete on public.reel_comment_likes;
create policy reel_comment_likes_delete on public.reel_comment_likes
  for delete using (user_id = auth.uid());
