// DIVARC Tweaks: density, dark mode, gold intensity, cards style, italic display, layout.
// Approach: wrap the canvas content in a [data-divarc] node; emit attribute-keyed
// CSS rules (with !important) that override the inline styles already shipped in
// the components, no refactor needed.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "regular",
  "theme": "light",
  "gold": "standard",
  "cards": "elevated",
  "italic": true,
  "layout": "1col"
}/*EDITMODE-END*/;

function DivarcTweaksPanel() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    const root = document.getElementById('divarc-canvas') || document.body;
    root.dataset.density = t.density;
    root.dataset.theme = t.theme;
    root.dataset.gold = t.gold;
    root.dataset.cards = t.cards;
    root.dataset.italic = t.italic ? 'on' : 'off';
    root.dataset.layout = t.layout;
  }, [t]);

  return (
    <window.TweaksPanel title="Tweaks DIVARC">
      <window.TweakSection label="Mode" />
      <window.TweakRadio label="Thème" value={t.theme}
        options={['light', 'dark', 'auto']}
        onChange={(v) => setTweak('theme', v)} />

      <window.TweakSection label="Densité" />
      <window.TweakRadio label="Espacement" value={t.density}
        options={['compact', 'regular', 'comfy']}
        onChange={(v) => setTweak('density', v)} />

      <window.TweakSection label="Couleur" />
      <window.TweakRadio label="Gold" value={t.gold}
        options={['discret', 'standard', 'poussé']}
        onChange={(v) => setTweak('gold', v)} />

      <window.TweakSection label="Cards" />
      <window.TweakRadio label="Style" value={t.cards}
        options={['flat', 'bordered', 'elevated']}
        onChange={(v) => setTweak('cards', v)} />

      <window.TweakSection label="Typographie" />
      <window.TweakToggle label="Display italique" value={t.italic}
        onChange={(v) => setTweak('italic', v)} />

      <window.TweakSection label="Layout" />
      <window.TweakRadio label="Feed" value={t.layout}
        options={['1col', '2col']}
        onChange={(v) => setTweak('layout', v)} />
    </window.TweaksPanel>
  );
}

window.DivarcTweaksPanel = DivarcTweaksPanel;
