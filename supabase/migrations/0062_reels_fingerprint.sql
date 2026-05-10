-- =====================================================
-- DIVARC — Migration 0062 : Audio fingerprinting reels (V3.13)
--
-- Ajoute les colonnes nécessaires au pipeline AcoustID/Chromaprint :
--
--   fingerprint_status : enum [pending/processing/ok/copyrighted/error]
--   fingerprint_hash   : SHA-256 client-side (V3.13 stub) — sera remplacé
--                        par un fingerprint Chromaprint en V4 quand le
--                        binaire ffmpeg+chromaprint sera dispo côté server
--   copyright_match_id : ID AcoustID si une violation est détectée (V4)
--   copyright_match_details : jsonb avec metadata du match (titre, artiste,
--                        labels, score)
--   fingerprinted_at   : timestamp du check
--
-- V3.13 ship : schema + client-side hash + endpoint stub. Pipeline réel
-- Chromaprint + AcoustID arrive V4 (nécessite credentials AcoustID +
-- ffmpeg server-side).
-- =====================================================

alter table public.reels
  add column if not exists fingerprint_status text
    check (fingerprint_status is null or fingerprint_status in (
      'pending', 'processing', 'ok', 'copyrighted', 'error'
    )),
  add column if not exists fingerprint_hash text,
  add column if not exists copyright_match_id text,
  add column if not exists copyright_match_details jsonb,
  add column if not exists fingerprinted_at timestamptz;

create index if not exists reels_fingerprint_hash_idx
  on public.reels (fingerprint_hash)
  where fingerprint_hash is not null;

create index if not exists reels_fingerprint_status_idx
  on public.reels (fingerprint_status)
  where fingerprint_status in ('pending', 'processing');

-- =====================================================
-- RPC : enqueue un reel pour fingerprint async (idempotent).
-- Appelé après l'insert client-side. Le worker AcoustID (V4) ramasse
-- les rows fingerprint_status='pending' et appelle l'API.
-- =====================================================
create or replace function public.enqueue_reel_fingerprint(
  p_reel_id uuid,
  p_hash text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.reels
     set fingerprint_status = 'pending',
         fingerprint_hash = p_hash,
         fingerprinted_at = now()
   where id = p_reel_id
     and author_id = auth.uid()
     and fingerprint_status is null; -- éviter ré-enqueue
end;
$$;

grant execute on function public.enqueue_reel_fingerprint(uuid, text)
  to authenticated;
