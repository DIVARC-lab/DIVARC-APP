-- =====================================================
-- DIVARC — Migration 0060 : Mode Duo reels (V3.8)
--
-- Ajoute aux reels :
--   - duet_source_reel_id : FK vers le reel source (set null si supprimé)
--   - duet_layout : disposition côte-à-côte (right/left/top/bottom)
--
-- Quand un user crée un duet, le client enregistre uniquement sa propre
-- caméra. À la lecture, ReelView render les 2 vidéos côte-à-côte selon
-- duet_layout. Pas de pré-merge ffmpeg en V3.8 (différé V4).
--
-- Trigger : à l'insert d'un reel avec duet_source_reel_id, insère aussi
-- dans reel_duets (ancienne table 0054) pour conserver le compteur
-- duets_count cohérent.
-- =====================================================

alter table public.reels
  add column if not exists duet_source_reel_id uuid
    references public.reels(id) on delete set null,
  add column if not exists duet_layout text
    check (duet_layout is null or duet_layout in ('right', 'left', 'top', 'bottom'));

create index if not exists reels_duet_source_idx
  on public.reels (duet_source_reel_id)
  where duet_source_reel_id is not null;

-- =====================================================
-- Trigger : à l'insert d'un reel duet, populate reel_duets + bump
-- duets_count sur le source. Skip si allow_duets=false côté source.
-- =====================================================
create or replace function public.sync_reel_duets_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_allows boolean;
begin
  if new.duet_source_reel_id is null then
    return new;
  end if;

  /* Vérifie que le source autorise les duets. */
  select allow_duets into source_allows
    from public.reels
   where id = new.duet_source_reel_id
     and deleted_at is null;

  if source_allows is distinct from true then
    return new;
  end if;

  /* Insère dans la table reel_duets (unique sur duet_reel_id). */
  insert into public.reel_duets (
    source_reel_id, duet_reel_id, layout
  ) values (
    new.duet_source_reel_id,
    new.id,
    coalesce(new.duet_layout, 'right')
  )
  on conflict (duet_reel_id) do nothing;

  /* Bump duets_count sur le source. */
  update public.reels
     set duets_count = duets_count + 1
   where id = new.duet_source_reel_id;

  return new;
end;
$$;

drop trigger if exists sync_reel_duets_trg on public.reels;
create trigger sync_reel_duets_trg
  after insert on public.reels
  for each row execute function public.sync_reel_duets_on_insert();
