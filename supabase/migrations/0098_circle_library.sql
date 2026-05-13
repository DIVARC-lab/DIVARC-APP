-- Chantier 3.5 — Bibliothèque collaborative par cercle.
--
-- 2 tables :
--   1. circle_library_categories : organisation hiérarchique des ressources
--      (ex: "Démarrer une startup", "Lever des fonds", "Recruter")
--   2. circle_library_items : les ressources elles-mêmes (doc/video/article
--      /link/template/wiki) avec compteurs vues + saves
--
-- Permissions (RLS) :
--   - Lecture : membres du cercle + non-membres si is_approved (publique)
--   - Insert categories : owner/admin
--   - Insert items : tous les membres ; is_approved=false par défaut sauf
--     pour contributor/moderator/admin/owner qui passent direct à true
--   - Update is_approved : owner/admin/moderator/contributor
--
-- IDEMPOTENT.

-- =====================================================
-- 1. circle_library_categories
-- =====================================================

create table if not exists public.circle_library_categories (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  description text check (description is null or char_length(description) <= 200),
  position integer not null default 0,
  /* Nom d'icône Lucide optionnel. */
  icon text check (icon is null or char_length(icon) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists circle_library_categories_circle_idx
  on public.circle_library_categories (circle_id, position);

alter table public.circle_library_categories enable row level security;

drop policy if exists "library_categories readable" on public.circle_library_categories;
create policy "library_categories readable"
  on public.circle_library_categories for select
  using (true);

drop policy if exists "library_categories manageable by admins"
  on public.circle_library_categories;
create policy "library_categories manageable by admins"
  on public.circle_library_categories for all
  using (
    exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_library_categories.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin')
         and m.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_library_categories.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin')
         and m.status = 'active'
    )
  );

drop trigger if exists circle_library_categories_set_updated_at
  on public.circle_library_categories;
create trigger circle_library_categories_set_updated_at
  before update on public.circle_library_categories
  for each row execute function public.set_updated_at();

-- =====================================================
-- 2. circle_library_items
-- =====================================================

create table if not exists public.circle_library_items (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  category_id uuid references public.circle_library_categories(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,

  /* Type de ressource. */
  type text not null check (type in (
    'document',   -- PDF, Doc, Sheet (upload Storage)
    'video',      -- upload ou lien YouTube/Vimeo
    'article',    -- markdown longue forme (body inline)
    'link',       -- URL externe avec preview
    'template',   -- Notion / Figma / Excel
    'wiki'        -- page éditable collaborativement (body markdown)
  )),

  title text not null check (char_length(title) between 1 and 160),
  description text check (description is null or char_length(description) <= 1000),
  /* URL externe pour link/template/video (YouTube/Vimeo) ou Supabase
   * Storage pour document/video upload. Null pour wiki/article (body inline). */
  content_url text check (content_url is null or content_url ~* '^https?://'),
  /* Corps markdown pour article/wiki (max 30k chars). */
  body text check (body is null or char_length(body) <= 30000),

  tags text[] not null default '{}'::text[],

  /* Modération : insert par non-contributor en is_approved=false. */
  is_approved boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,

  /* Compteurs dénormalisés (incrémentés via RPC simple en V2). */
  views_count integer not null default 0 check (views_count >= 0),
  saves_count integer not null default 0 check (saves_count >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists circle_library_items_circle_approved_idx
  on public.circle_library_items (circle_id, is_approved, created_at desc);

create index if not exists circle_library_items_category_idx
  on public.circle_library_items (category_id, is_approved, created_at desc)
  where category_id is not null;

create index if not exists circle_library_items_pending_idx
  on public.circle_library_items (circle_id, created_at desc)
  where is_approved = false;

alter table public.circle_library_items enable row level security;

/* Lecture : tout le monde voit les approuvés. Le créateur voit aussi ses
 * pending. Les modos voient toutes les pending de leur cercle. */
drop policy if exists "library_items readable" on public.circle_library_items;
create policy "library_items readable"
  on public.circle_library_items for select
  using (
    is_approved = true
    or created_by = auth.uid()
    or exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_library_items.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin', 'moderator', 'mod', 'contributor')
         and m.status = 'active'
    )
  );

drop policy if exists "library_items insert by members" on public.circle_library_items;
create policy "library_items insert by members"
  on public.circle_library_items for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_library_items.circle_id
         and m.user_id = auth.uid()
         and m.status = 'active'
    )
  );

drop policy if exists "library_items update by author or moderators"
  on public.circle_library_items;
create policy "library_items update by author or moderators"
  on public.circle_library_items for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_library_items.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin', 'moderator', 'mod', 'contributor')
         and m.status = 'active'
    )
  );

drop policy if exists "library_items delete by author or admins"
  on public.circle_library_items;
create policy "library_items delete by author or admins"
  on public.circle_library_items for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.circle_members m
       where m.circle_id = circle_library_items.circle_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin')
         and m.status = 'active'
    )
  );

drop trigger if exists circle_library_items_set_updated_at
  on public.circle_library_items;
create trigger circle_library_items_set_updated_at
  before update on public.circle_library_items
  for each row execute function public.set_updated_at();

-- =====================================================
-- 3. Trigger : auto-approve si créateur a un rôle >= contributor
-- =====================================================

create or replace function public.circle_library_auto_approve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role
    from public.circle_members
   where circle_id = new.circle_id and user_id = new.created_by;

  if v_role in ('owner', 'admin', 'moderator', 'mod', 'contributor') then
    new.is_approved := true;
    new.approved_by := new.created_by;
    new.approved_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists circle_library_items_auto_approve on public.circle_library_items;
create trigger circle_library_items_auto_approve
  before insert on public.circle_library_items
  for each row execute function public.circle_library_auto_approve();

comment on table public.circle_library_categories is
  'Catégories d''organisation des ressources Library d''un cercle (Chantier 3.5).';
comment on table public.circle_library_items is
  'Ressources Library d''un cercle. Auto-approuvées si créateur a rôle >= contributor, sinon en attente de modération.';
