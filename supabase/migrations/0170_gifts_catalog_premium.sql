-- ============================================================================
-- 0170_gifts_catalog_premium.sql — Catalogue cadeaux TikTok-like
--
-- Refonte du catalogue virtual_gifts :
--   - Emoji 3D unicode (rendu natif iOS/Android/Desktop)
--   - tier 1-7 (Mignonnerie → Cosmic)
--   - gradient_from / gradient_to pour le background card
--   - glow_color pour l'effet aura
--   - 20 cadeaux variés couvrant 0.49€ → 499.99€
-- ============================================================================

ALTER TABLE public.virtual_gifts
  ADD COLUMN IF NOT EXISTS emoji text,
  ADD COLUMN IF NOT EXISTS tier integer CHECK (tier IS NULL OR tier BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS gradient_from text,
  ADD COLUMN IF NOT EXISTS gradient_to text,
  ADD COLUMN IF NOT EXISTS glow_color text,
  ADD COLUMN IF NOT EXISTS tagline text;

-- Augmente le plafond à 500€ (déjà géré côté schema initial, mais ré-affirme).
ALTER TABLE public.virtual_gifts
  DROP CONSTRAINT IF EXISTS virtual_gifts_amount_cents_check;
ALTER TABLE public.virtual_gifts
  ADD CONSTRAINT virtual_gifts_amount_cents_check
  CHECK (amount_cents BETWEEN 49 AND 50000);

-- Désactive l'ancien catalogue (on garde les rows pour ne pas casser les
-- live_gift_sends historiques qui FK vers virtual_gifts.id).
UPDATE public.virtual_gifts SET is_active = false WHERE id IN (
  'rose', 'heart', 'star', 'flame', 'crown', 'rocket', 'castle'
);

-- ============================================================================
-- Nouveau catalogue premium (20 cadeaux, 7 tiers)
-- Gradients style verre/gemme TikTok-style.
-- ============================================================================
INSERT INTO public.virtual_gifts (
  id, label, description, tagline, emoji, icon_name, color,
  amount_cents, tier, gradient_from, gradient_to, glow_color, rank, is_active
) VALUES
  -- Tier 1 — Mignonnerie (0.49 → 2.99€) : violet/rose pastel
  ('rose_premium',     'Rose',          'La classique romantique.',           'Un signe doux et délicat.',      '🌹', 'Flower',  '#f43f5e',  49, 1, '#fda4af', '#f43f5e', '#fb7185',  10, true),
  ('coffee',           'Café',          'Pour bien démarrer la journée.',     'Un latte chaleureux.',           '☕',  'Coffee',  '#a16207',  99, 1, '#fde68a', '#d97706', '#facc15',  11, true),
  ('cute_heart',       'Cœur mignon',   'Petit cœur tout doux.',              'Plein d''amour rose.',           '💗', 'Heart',   '#ec4899', 149, 1, '#fbcfe8', '#ec4899', '#f472b6',  12, true),
  ('kiss',             'Bisou',         'Smooch !',                           'Un bisou volant.',               '💋', 'Heart',   '#db2777', 199, 1, '#fbcfe8', '#db2777', '#ec4899',  13, true),
  ('cute_star',        'Étoile filante','Fais un vœu !',                      'Brille de mille feux.',          '⭐', 'Star',    '#facc15', 299, 1, '#fef3c7', '#eab308', '#facc15',  14, true),

  -- Tier 2 — Encouragement (4.99 → 9.99€) : bleu/cyan
  ('ice_cream',        'Glace italienne','Trop bon !',                        'Régale-toi.',                    '🍦', 'Flower',  '#06b6d4', 499, 2, '#bae6fd', '#0891b2', '#22d3ee',  20, true),
  ('pizza',            'Pizza',         'Une bonne part fumante.',            'Régale ta team.',                '🍕', 'Flower',  '#f97316', 599, 2, '#fdba74', '#ea580c', '#fb923c',  21, true),
  ('medal',            'Médaille',      'Pour ta performance.',               'Tu es un·e champion·ne.',        '🏅', 'Star',    '#facc15', 799, 2, '#fde68a', '#ca8a04', '#eab308',  22, true),
  ('trophy_gold',      'Trophée d''or', 'La victoire est tienne.',            'Première place.',                '🏆', 'Crown',   '#eab308', 999, 2, '#fef08a', '#a16207', '#facc15',  23, true),

  -- Tier 3 — Bravo (14.99 → 24.99€) : violet/magenta
  ('fire_premium',     'Flamme ardente','Le live est en feu !',               'Tu enflammes la scène.',         '🔥', 'Flame',   '#ef4444', 1499, 3, '#fecaca', '#dc2626', '#f87171',  30, true),
  ('microphone_gold',  'Micro doré',    'Pour les voix d''or.',               'Le talent récompensé.',          '🎤', 'Star',    '#a855f7', 1999, 3, '#e9d5ff', '#7e22ce', '#c084fc',  31, true),
  ('crown_premium',    'Couronne',      'Pour le roi/la reine.',              'Règne sur la scène.',            '👑', 'Crown',   '#facc15', 2499, 3, '#fef3c7', '#a16207', '#eab308',  32, true),

  -- Tier 4 — Premium (29.99 → 49.99€) : émeraude/jade
  ('diamond',          'Diamant',       'Brillance pure.',                    'L''excellence absolue.',         '💎', 'Star',    '#06b6d4', 2999, 4, '#cffafe', '#0e7490', '#22d3ee',  40, true),
  ('sports_car',       'Voiture sport', 'Vroum vroum.',                       'Adrénaline pure.',               '🏎️', 'Rocket',  '#dc2626', 3999, 4, '#fecaca', '#b91c1c', '#ef4444',  41, true),
  ('rocket_premium',   'Fusée stellaire','Décollage immédiat !',              'Vers les étoiles.',              '🚀', 'Rocket',  '#3b82f6', 4999, 4, '#bfdbfe', '#1d4ed8', '#60a5fa',  42, true),

  -- Tier 5 — Légende (59.99 → 99.99€) : or massif
  ('helicopter',       'Hélicoptère',   'Pour les VIP.',                      'Sommet du luxe.',                '🚁', 'Rocket',  '#facc15', 5999, 5, '#fef3c7', '#854d0e', '#eab308',  50, true),
  ('yacht',            'Yacht',         'Direction la Méditerranée.',         'L''art de vivre.',               '🛥️', 'Rocket',  '#0ea5e9', 7999, 5, '#bae6fd', '#0369a1', '#38bdf8',  51, true),
  ('jet_private',      'Jet privé',     'Première classe partout.',           'Voyage en altitude.',            '✈️', 'Rocket',  '#1e40af', 9999, 5, '#dbeafe', '#1e3a8a', '#3b82f6',  52, true),

  -- Tier 6 — Mythique (149.99 → 299.99€) : rubis/grenat
  ('castle_premium',   'Château',       'Construis ta légende.',              'Royauté éternelle.',             '🏰', 'Castle',  '#a855f7', 14999, 6, '#e9d5ff', '#6b21a8', '#a855f7',  60, true),
  ('island_premium',   'Île privée',    'Paradis sur terre.',                 'Ton royaume tropical.',          '🏝️', 'Castle',  '#10b981', 19999, 6, '#a7f3d0', '#047857', '#10b981',  61, true),
  ('lion_king',        'Lion royal',    'Le roi de la jungle.',               'Puissance absolue.',             '🦁', 'Crown',   '#ea580c', 29999, 6, '#fed7aa', '#9a3412', '#f97316',  62, true),

  -- Tier 7 — Cosmic (399.99 → 499.99€) : nébuleuse iridescente
  ('galaxy',           'Galaxie',       'L''infini à tes pieds.',             'Au-delà des étoiles.',           '🌌', 'Castle',  '#7c3aed', 39999, 7, '#c4b5fd', '#5b21b6', '#a78bfa',  70, true),
  ('cosmic_dragon',    'Dragon cosmique','Légende ultime.',                   'Force interstellaire.',          '🐉', 'Castle',  '#db2777', 49999, 7, '#f5d0fe', '#86198f', '#e879f9',  71, true)

ON CONFLICT (id) DO UPDATE SET
  label            = EXCLUDED.label,
  description      = EXCLUDED.description,
  tagline          = EXCLUDED.tagline,
  emoji            = EXCLUDED.emoji,
  icon_name        = EXCLUDED.icon_name,
  color            = EXCLUDED.color,
  amount_cents     = EXCLUDED.amount_cents,
  tier             = EXCLUDED.tier,
  gradient_from    = EXCLUDED.gradient_from,
  gradient_to      = EXCLUDED.gradient_to,
  glow_color       = EXCLUDED.glow_color,
  rank             = EXCLUDED.rank,
  is_active        = EXCLUDED.is_active;

COMMENT ON COLUMN public.virtual_gifts.tier IS
  'Tier 1-7 : 1=Mignonnerie (rose/pastel), 7=Cosmic (nébuleuse).';
COMMENT ON COLUMN public.virtual_gifts.emoji IS
  'Emoji unicode 3D affiché sur la card (fallback si pas d''image).';
