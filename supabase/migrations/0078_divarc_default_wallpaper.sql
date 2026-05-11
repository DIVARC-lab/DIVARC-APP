-- Chantier 3.5 : Wallpaper signature DIVARC + nouveau default
--
-- Ajoute 'divarc' à l'enum wallpaper_id et change le default de 'none'
-- vers 'divarc' (motif crème avec arcs DIVARC + emojis dispersés).
-- Les rows existantes avec 'none' sont migrées vers 'divarc' pour
-- une expérience visuelle cohérente out-of-the-box.

-- =====================================================
-- 1. Drop l'ancien check + recrée avec 'divarc' ajouté
-- =====================================================
alter table public.conversation_members
  drop constraint if exists conversation_members_wallpaper_id_check;

alter table public.conversation_members
  add constraint conversation_members_wallpaper_id_check
  check (wallpaper_id in (
    'divarc',    -- nouveau : motif signature DIVARC (crème + arcs + emojis)
    'none',      -- bg uni
    'arcs',      -- ArcDeco DIVARC en watermark (legacy)
    'dots',
    'waves',
    'gradient',
    'stars'
  ));

-- =====================================================
-- 2. Change le default
-- =====================================================
alter table public.conversation_members
  alter column wallpaper_id set default 'divarc';

-- =====================================================
-- 3. Migre les rows existantes : 'none' → 'divarc'
--    (les rows déjà personnalisées avec autre chose gardent leur valeur)
-- =====================================================
update public.conversation_members
   set wallpaper_id = 'divarc'
 where wallpaper_id = 'none';
