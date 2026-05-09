-- =====================================================
-- DIVARC — Migration 0039 : Web Push subscriptions
--   Table de stockage des PushSubscription Web Push API. Un user peut
--   avoir plusieurs subscriptions (multi-device : phone + desktop).
--   Les clés p256dh + auth permettent de chiffrer le payload côté client.
--   L'endpoint est unique (URL push service du browser).
-- =====================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  /* Endpoint URL fourni par le browser (FCM, Mozilla autopush, Apple).
     Unique : un même browser ne peut s'inscrire qu'une fois. */
  endpoint text not null unique,
  /* Clés cryptographiques de chiffrement payload (Web Push spec). */
  p256dh text not null,
  auth text not null,
  /* user-agent au moment de l'inscription, utile pour debug/UI. */
  user_agent text,
  created_at timestamptz not null default now(),
  /* Last successful push delivery — pour cleanup périodique des
     subscriptions obsolètes (browser désinstallé, perm révoquée). */
  last_success_at timestamptz
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);
create index if not exists push_subscriptions_endpoint_idx
  on public.push_subscriptions (endpoint);

alter table public.push_subscriptions enable row level security;

/* L'utilisateur ne voit que ses propres subscriptions. */
create policy "push_subscriptions_select_owner"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_subscriptions_insert_self"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push_subscriptions_delete_owner"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

comment on table public.push_subscriptions is
  'Web Push API subscriptions par user. Un user peut avoir N devices.';
comment on column public.push_subscriptions.endpoint is
  'URL du push service browser (unique). FCM/Mozilla/Apple selon UA.';
