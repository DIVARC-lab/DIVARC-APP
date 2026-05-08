-- =====================================================
-- DIVARC — Migration 0031 : Posts épinglés dans les cercles (V4)
--   - Un admin / mod peut épingler un post du cercle.
--   - Plusieurs posts peuvent être épinglés en même temps.
--   - L'ordre d'affichage suit pinned_at DESC.
--   - Seuls les posts qui ont un circle_id peuvent être épinglés.
-- =====================================================

-- 1. Colonne pinned_at + pinned_by
alter table public.posts
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references auth.users(id) on delete set null;

create index if not exists posts_pinned_circle_idx
  on public.posts (circle_id, pinned_at desc)
  where pinned_at is not null and deleted_at is null;

-- 2. Helper : utilisateur courant peut-il épingler dans ce cercle ?
create or replace function public.can_moderate_circle(
  p_circle_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.circle_members
     where circle_id = p_circle_id
       and user_id = p_user_id
       and role in ('admin', 'mod')
  ) or exists (
    select 1 from public.circles
     where id = p_circle_id and owner_id = p_user_id
  );
$$;

grant execute on function public.can_moderate_circle(uuid, uuid) to authenticated;

-- 3. Mise à jour de la policy UPDATE de posts
--    Avant : seul l'auteur peut update.
--    Maintenant : auteur ou admin/mod du cercle (uniquement pour pin).
--    On garde la logique simple : si circle_id, le mod peut update.
drop policy if exists "owner can update post" on public.posts;
create policy "owner can update post"
  on public.posts for update
  using (
    author_id = auth.uid()
    or (
      circle_id is not null
      and public.can_moderate_circle(circle_id, auth.uid())
    )
  )
  with check (
    author_id = auth.uid()
    or (
      circle_id is not null
      and public.can_moderate_circle(circle_id, auth.uid())
    )
  );
