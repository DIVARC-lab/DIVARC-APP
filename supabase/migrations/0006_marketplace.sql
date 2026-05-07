-- =====================================================
-- DIVARC — Migration 0006 : Marketplace
-- =====================================================

-- 1. listings table
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text check (description is null or char_length(description) <= 4000),
  price_amount numeric(12, 2) not null check (price_amount >= 0),
  price_currency text not null
    check (price_currency in ('EUR', 'XAF', 'XOF', 'MAD', 'TND', 'DZD', 'CAD', 'CHF')),
  category text not null,
  condition text not null default 'used'
    check (condition in ('new', 'like_new', 'used', 'fair')),
  location text,
  status text not null default 'active'
    check (status in ('draft', 'active', 'sold', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sold_at timestamptz
);

create index if not exists listings_status_created_at_idx
  on public.listings (status, created_at desc);

create index if not exists listings_seller_id_idx
  on public.listings (seller_id);

create index if not exists listings_category_status_idx
  on public.listings (category, status);

-- 2. listing_photos table
create table if not exists public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_photos_listing_id_position_idx
  on public.listing_photos (listing_id, position);

-- 3. favorites table
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists favorites_listing_id_idx
  on public.favorites (listing_id);

-- 4. updated_at trigger (réutilise public.set_updated_at créé en migration 0001)
drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- 5. RLS — listings
alter table public.listings enable row level security;

drop policy if exists "active listings are public" on public.listings;
create policy "active listings are public"
  on public.listings for select
  using (status = 'active' or seller_id = auth.uid());

drop policy if exists "owners can insert listings" on public.listings;
create policy "owners can insert listings"
  on public.listings for insert
  with check (seller_id = auth.uid());

drop policy if exists "owners can update own listings" on public.listings;
create policy "owners can update own listings"
  on public.listings for update
  using (seller_id = auth.uid());

drop policy if exists "owners can delete own listings" on public.listings;
create policy "owners can delete own listings"
  on public.listings for delete
  using (seller_id = auth.uid());

-- 6. RLS — listing_photos
alter table public.listing_photos enable row level security;

drop policy if exists "photos follow listing visibility" on public.listing_photos;
create policy "photos follow listing visibility"
  on public.listing_photos for select
  using (
    exists (
      select 1 from public.listings
      where id = listing_id
        and (status = 'active' or seller_id = auth.uid())
    )
  );

drop policy if exists "owners insert listing photos" on public.listing_photos;
create policy "owners insert listing photos"
  on public.listing_photos for insert
  with check (
    exists (
      select 1 from public.listings
      where id = listing_id and seller_id = auth.uid()
    )
  );

drop policy if exists "owners update listing photos" on public.listing_photos;
create policy "owners update listing photos"
  on public.listing_photos for update
  using (
    exists (
      select 1 from public.listings
      where id = listing_id and seller_id = auth.uid()
    )
  );

drop policy if exists "owners delete listing photos" on public.listing_photos;
create policy "owners delete listing photos"
  on public.listing_photos for delete
  using (
    exists (
      select 1 from public.listings
      where id = listing_id and seller_id = auth.uid()
    )
  );

-- 7. RLS — favorites
alter table public.favorites enable row level security;

drop policy if exists "users see own favorites" on public.favorites;
create policy "users see own favorites"
  on public.favorites for select
  using (user_id = auth.uid());

drop policy if exists "users insert own favorites" on public.favorites;
create policy "users insert own favorites"
  on public.favorites for insert
  with check (user_id = auth.uid());

drop policy if exists "users delete own favorites" on public.favorites;
create policy "users delete own favorites"
  on public.favorites for delete
  using (user_id = auth.uid());

-- 8. Storage bucket pour les photos d'annonces
insert into storage.buckets (id, name, public)
values ('listings', 'listings', true)
on conflict (id) do nothing;

drop policy if exists "listing photos publicly readable" on storage.objects;
create policy "listing photos publicly readable"
  on storage.objects for select
  using (bucket_id = 'listings');

drop policy if exists "users upload own listing photos" on storage.objects;
create policy "users upload own listing photos"
  on storage.objects for insert
  with check (
    bucket_id = 'listings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users update own listing photos" on storage.objects;
create policy "users update own listing photos"
  on storage.objects for update
  using (
    bucket_id = 'listings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users delete own listing photos" on storage.objects;
create policy "users delete own listing photos"
  on storage.objects for delete
  using (
    bucket_id = 'listings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 9. Realtime (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'listings'
  ) then
    alter publication supabase_realtime add table public.listings;
  end if;
end $$;
