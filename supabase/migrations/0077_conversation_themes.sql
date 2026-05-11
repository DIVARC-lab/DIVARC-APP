-- Chantier 3 : Themes per-conversation
--
-- Chaque membre d'une conversation peut personnaliser SON propre
-- affichage : palette de couleurs (accent + bulles), wallpaper de fond.
-- Le settings est par-USER × per-CONV (chacun voit son thème), pas
-- partagé entre les participants.

-- =====================================================
-- 1. Ajout colonnes sur conversation_members
-- =====================================================
alter table public.conversation_members
  add column if not exists theme_preset text default 'default'
    check (theme_preset in (
      'default',   -- gold + cream (theme global DIVARC)
      'gold',      -- gold intense
      'sunset',    -- rose / coral
      'ocean',     -- bleu profond
      'forest',    -- vert sombre
      'midnight',  -- noir profond
      'rose',      -- rose pastel
      'lavender'   -- lavande
    ));

alter table public.conversation_members
  add column if not exists wallpaper_id text default 'none'
    check (wallpaper_id in (
      'none',      -- bg uni (couleur du theme)
      'arcs',      -- ArcDeco DIVARC en watermark
      'dots',      -- pointillés discrets
      'waves',     -- vagues subtiles
      'gradient',  -- dégradé doux
      'stars'      -- étoiles éparses
    ));

-- =====================================================
-- 2. RPC : set_conversation_theme — update les 2 colonnes en une fois
-- =====================================================
create or replace function public.set_conversation_theme(
  p_conv_id uuid,
  p_theme_preset text,
  p_wallpaper_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  update public.conversation_members
     set theme_preset = coalesce(p_theme_preset, theme_preset),
         wallpaper_id = coalesce(p_wallpaper_id, wallpaper_id)
   where conversation_id = p_conv_id
     and user_id = auth.uid();
end;
$$;

grant execute on function public.set_conversation_theme(uuid, text, text)
  to authenticated;
