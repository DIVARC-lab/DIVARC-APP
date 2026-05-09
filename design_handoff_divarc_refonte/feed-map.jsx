// Carte / géo (4 écrans) — vue carte du quartier
const _mArc = window.ArcDeco;

function StatusBarM({ dark = false }) {
  return (
    <div style={{ height: 44, padding: '0 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: dark ? '#FFF8E8' : '#0A1F44' }}>
      <div>9:41</div>
      <div style={{ display: 'flex', gap: 4 }}>
        <svg width="16" height="11" viewBox="0 0 16 11"><path d="M0 8h2v3H0zM4 6h2v5H4zM8 4h2v7H8zM12 1h2v10h-2z" fill="currentColor"/></svg>
        <svg width="24" height="11" viewBox="0 0 24 11" fill="none">
          <rect x="0.5" y="0.5" width="20" height="10" rx="2.2" stroke="currentColor" opacity="0.5"/>
          <rect x="2" y="2" width="16" height="7" rx="1" fill="currentColor"/>
        </svg>
      </div>
    </div>
  );
}

// Mini map SVG réutilisable, plus dense que celui d'onboarding
function MapBackground({ dark = false }) {
  const bg = dark
    ? 'linear-gradient(180deg, #1F2A4A 0%, #050E22 100%)'
    : 'linear-gradient(180deg, #C8D2E5 0%, #E6E9F0 100%)';
  const road = dark ? 'rgba(255,248,232,0.18)' : '#FFF';
  const park = dark ? '#2D4A2D' : '#A6C9A6';
  const water = dark ? '#1A3658' : '#9EB4D9';
  const building = dark ? 'rgba(255,248,232,0.06)' : '#8993A8';
  return (
    <div style={{ position: 'absolute', inset: 0, background: bg, overflow: 'hidden' }}>
      <svg width="100%" height="100%" viewBox="0 0 390 700" preserveAspectRatio="none">
        {/* Water */}
        <path d="M-20 540 Q 100 510 200 530 T 410 545 L 410 720 L -20 720 Z" fill={water} opacity={dark ? 1 : 0.6} />
        {/* Parks */}
        <rect x="20" y="180" width="100" height="80" fill={park} opacity="0.85" rx="4"/>
        <rect x="240" y="380" width="120" height="90" fill={park} opacity="0.85" rx="4"/>
        <rect x="280" y="80" width="60" height="50" fill={park} opacity="0.85" rx="4"/>
        {/* Major roads */}
        <path d="M-10 200 L 410 250" stroke={road} strokeWidth="14" />
        <path d="M-10 360 L 410 320" stroke={road} strokeWidth="10" />
        <path d="M120 -10 L 180 720" stroke={road} strokeWidth="11" />
        <path d="M250 -10 L 240 720" stroke={road} strokeWidth="8" />
        {/* Smaller roads */}
        <path d="M-10 100 L 410 110" stroke={road} strokeWidth="5" opacity="0.7"/>
        <path d="M-10 140 L 410 145" stroke={road} strokeWidth="5" opacity="0.7"/>
        <path d="M-10 290 L 410 295" stroke={road} strokeWidth="5" opacity="0.7"/>
        <path d="M-10 430 L 410 425" stroke={road} strokeWidth="5" opacity="0.7"/>
        <path d="M-10 470 L 410 475" stroke={road} strokeWidth="5" opacity="0.7"/>
        <path d="M50 -10 L 60 720" stroke={road} strokeWidth="4" opacity="0.7"/>
        <path d="M320 -10 L 330 720" stroke={road} strokeWidth="4" opacity="0.7"/>
        {/* Building blocks */}
        {[
          [40, 30, 14, 18], [60, 60, 12, 14], [80, 30, 16, 22], [70, 90, 10, 12],
          [200, 30, 18, 16], [220, 60, 14, 18], [200, 90, 16, 14],
          [350, 150, 12, 16], [370, 130, 14, 14],
          [40, 320, 16, 14], [70, 330, 14, 18], [50, 360, 12, 14],
          [200, 130, 18, 22], [225, 100, 14, 16],
          [200, 380, 14, 14], [220, 410, 16, 18], [200, 440, 12, 14],
          [40, 410, 14, 16], [60, 440, 16, 14], [80, 460, 12, 18],
        ].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={building} opacity={dark ? 1 : 0.5} />)}
      </svg>
    </div>
  );
}

// 01 · Carte — vue principale avec pins
function MapMainScreen() {
  // Pins répartis sur la map
  const pins = [
    { x: 28, y: 22, type: 'job', emoji: '💼', count: 3, color: '#2C4D8C' },
    { x: 72, y: 35, type: 'event', emoji: '🎉', color: '#F4B942' },
    { x: 50, y: 50, type: 'self', color: '#F4B942', isMe: true },
    { x: 22, y: 60, type: 'market', emoji: '🛍️', count: 5, color: '#D97757' },
    { x: 68, y: 64, type: 'event', emoji: '🎉', color: '#F4B942' },
    { x: 80, y: 78, type: 'job', emoji: '💼', color: '#2C4D8C' },
    { x: 38, y: 82, type: 'market', emoji: '🛍️', color: '#D97757' },
  ];
  return (
    <div style={{ background: '#0A1F44', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', overflow: 'hidden' }}>
      <StatusBarM />
      <MapBackground />

      {/* Pins */}
      {pins.map((p, i) => p.isMe ? (
        <div key={i} style={{ position: 'absolute', top: `${p.y}%`, left: `${p.x}%`, transform: 'translate(-50%, -50%)', zIndex: 5 }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(244,185,66,0.22)', position: 'absolute', top: -20, left: -20, animation: 'ping 2s infinite' }} />
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#F4B942', border: '4px solid #FFF', boxShadow: '0 6px 16px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#0A1F44', position: 'relative' }}>AM</div>
        </div>
      ) : (
        <div key={i} style={{ position: 'absolute', top: `${p.y}%`, left: `${p.x}%`, transform: 'translate(-50%, -100%)', zIndex: 4 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50% 50% 50% 0', background: p.color, transform: 'rotate(-45deg)', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', border: '3px solid #FFF' }} />
            <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 16 }}>{p.emoji}</div>
            {p.count && (
              <div style={{ position: 'absolute', top: -4, right: -6, minWidth: 18, height: 18, padding: '0 5px', background: '#0A1F44', color: '#FFF8E8', borderRadius: 9, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FFF' }}>{p.count}</div>
            )}
          </div>
        </div>
      ))}

      {/* Top search */}
      <div style={{ position: 'absolute', top: 50, left: 12, right: 12, zIndex: 6 }}>
        <div style={{ padding: '11px 14px', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 20px rgba(10,31,68,0.18)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <div style={{ flex: 1, fontSize: 13, color: '#0A1F44', fontWeight: 700 }}>Rechercher autour de toi…</div>
          <div style={{ padding: '4px 10px', borderRadius: 999, background: '#0A1F44', color: '#FFF8E8', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
            Filtres
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ position: 'absolute', top: 110, left: 12, right: 12, display: 'flex', gap: 6, zIndex: 6, overflowX: 'auto' }}>
        {[
          { l: 'Tout', sel: true },
          { l: '🎉 Événements', count: 4 },
          { l: '💼 Jobs', count: 7 },
          { l: '🛍️ Marketplace', count: 12 },
          { l: '👥 Voisins' },
        ].map(c => (
          <div key={c.l} style={{
            padding: '7px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
            background: c.sel ? '#0A1F44' : 'rgba(255,255,255,0.96)',
            color: c.sel ? '#FFF8E8' : '#0A1F44',
            backdropFilter: 'blur(12px)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {c.l}
            {c.count && <span style={{ padding: '1px 6px', borderRadius: 999, background: c.sel ? '#F4B942' : '#F8F9FB', color: '#0A1F44', fontSize: 10, fontWeight: 800 }}>{c.count}</span>}
          </div>
        ))}
      </div>

      {/* Right floating actions */}
      <div style={{ position: 'absolute', right: 12, top: 200, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 6 }}>
        {[
          (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" key="nav"><circle cx="12" cy="12" r="3"/><path d="M22 12h-4M6 12H2M12 2v4M12 22v-4"/></svg>),
          (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" key="layers"><path d="m12 2 8.5 4.5L12 11 3.5 6.5z"/><path d="m3.5 11.5 8.5 4.5 8.5-4.5M3.5 16.5l8.5 4.5 8.5-4.5"/></svg>),
          (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" key="plus"><path d="M12 5v14M5 12h14"/></svg>),
        ].map((icon, i) => (
          <div key={i} style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A1F44', boxShadow: '0 4px 12px rgba(10,31,68,0.18)' }}>{icon}</div>
        ))}
      </div>

      {/* Bottom card — événement le plus proche */}
      <div style={{ position: 'absolute', bottom: 100, left: 12, right: 12, padding: 14, background: '#FFF', borderRadius: 16, boxShadow: '0 12px 32px rgba(10,31,68,0.18)', zIndex: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 800, color: '#B88A2A', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          <span>· Plus proche · 120 m</span>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'flex-start' }}>
          <div style={{ width: 56, height: 70, borderRadius: 12, background: 'linear-gradient(135deg, #F4B942, #B88A2A)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#0A1F44', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.2 }}>{_mArc ? <_mArc size={60} opacity={1} /> : null}</div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', position: 'relative' }}>SAM</div>
            <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 28, lineHeight: 1, position: 'relative' }}>11</div>
            <div style={{ fontSize: 9, fontWeight: 700, position: 'relative' }}>mai · 18h</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 18, color: '#0A1F44', lineHeight: 1.2 }}>Marché aux livres, Square du Belvédère</div>
            <div style={{ fontSize: 11, color: '#4B5B87', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Belleville
              </span>
              <span>·</span>
              <span style={{ color: '#0A1F44', fontWeight: 700 }}>23 voisins y vont</span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex' }}>
                {['#F4B942', '#6FB89F', '#8B7AB8'].map((c, i) => (
                  <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: '2px solid #FFF', marginLeft: i === 0 ? 0 : -7 }} />
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#8993A8' }}>Sofia, Karim et 21 autres</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, padding: '10px 0', textAlign: 'center', background: '#0A1F44', color: '#FFF8E8', borderRadius: 999, fontSize: 12.5, fontWeight: 800 }}>
          Y aller →
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 78, background: '#FFF', borderTop: '1px solid #E6E9F0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 10 }}>
        {['home', 'compass', 'plus', 'briefcase', 'user'].map((k, i) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: i === 1 ? '#0A1F44' : '#8993A8' }}>
            {k === 'plus' ? (
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#F4B942', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(244,185,66,0.45)', marginTop: -8 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.6"><path d="M12 5v14M5 12h14"/></svg>
              </div>
            ) : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={i === 1 ? 2.4 : 2}>
                  {k === 'home' && <path d="M3 12 12 3l9 9M5 10v10h14V10"/>}
                  {k === 'compass' && <><circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/></>}
                  {k === 'briefcase' && <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>}
                  {k === 'user' && <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>}
                </svg>
                <div style={{ fontSize: 9.5, fontWeight: i === 1 ? 800 : 600 }}>{['Accueil','Carte','','Emploi','Profil'][i]}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 02 · Bottom sheet (résultats listés)
function MapListSheetScreen() {
  const items = [
    { type: 'event', t: 'Marché aux livres', sub: 'Square du Belvédère · 120 m', when: 'Sam 11 mai · 18h', count: 23, color: '#F4B942', emoji: '🎉' },
    { type: 'job', t: 'Boulanger·ère · CDI', sub: 'Boulangerie Lacoste · 350 m', when: 'Posté il y a 2j', count: null, color: '#2C4D8C', emoji: '💼' },
    { type: 'market', t: 'Lit en mezzanine', sub: 'Estelle · 180 m', when: '120 €', count: null, color: '#D97757', emoji: '🛍️' },
    { type: 'event', t: 'Café crochet du dimanche', sub: 'Bar du Coin · 480 m', when: 'Dim 12 mai · 10h', count: 8, color: '#F4B942', emoji: '🎉' },
    { type: 'job', t: 'Garde d\'enfants', sub: 'Famille Mounier · 220 m', when: 'Mer/Ven · 14h-18h', count: null, color: '#2C4D8C', emoji: '💼' },
  ];
  return (
    <div style={{ background: '#0A1F44', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', overflow: 'hidden' }}>
      <StatusBarM />
      <MapBackground />

      {/* Bottom sheet */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: 280, background: '#FFF', borderRadius: '20px 20px 0 0', boxShadow: '0 -16px 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
        {/* Drag handle */}
        <div style={{ padding: '10px 0 6px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: '#E6E9F0' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '4px 18px 10px' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· 23 résultats</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 24, color: '#0A1F44', lineHeight: 1.1 }}>
              Autour de <span style={{ color: '#B88A2A' }}>Belleville</span>
            </div>
            <div style={{ padding: '6px 12px', borderRadius: 999, background: '#F8F9FB', fontSize: 11, fontWeight: 700, color: '#0A1F44', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
              Trier
            </div>
          </div>
        </div>

        {/* Quick filters */}
        <div style={{ padding: '0 18px 10px', display: 'flex', gap: 5, overflowX: 'auto' }}>
          {['Tous', '🎉 Événements 4', '💼 Jobs 7', '🛍️ Marketplace 12'].map((l, i) => (
            <div key={l} style={{
              padding: '6px 11px', borderRadius: 999, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
              background: i === 0 ? '#0A1F44' : '#F8F9FB',
              color: i === 0 ? '#FFF8E8' : '#0A1F44',
            }}>{l}</div>
          ))}
        </div>

        {/* Results */}
        <div style={{ flex: 1, padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: 10, background: '#FFF', border: '1px solid #E6E9F0', borderRadius: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: it.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.18 }}>{_mArc ? <_mArc size={44} opacity={1} /> : null}</div>
                <span style={{ position: 'relative' }}>{it.emoji}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0A1F44' }}>{it.t}</div>
                <div style={{ fontSize: 11, color: '#8993A8', marginTop: 1 }}>{it.sub}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                  <div style={{ fontSize: 11.5, color: '#0A1F44', fontWeight: 700, fontFamily: it.type === 'market' ? 'Instrument Serif' : 'inherit', fontStyle: it.type === 'market' ? 'italic' : 'normal' }}>{it.when}</div>
                  {it.count && <div style={{ padding: '2px 7px', borderRadius: 999, background: 'rgba(244,185,66,0.12)', border: '1px solid rgba(244,185,66,0.3)', fontSize: 10, fontWeight: 700, color: '#B88A2A' }}>{it.count} y vont</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 03 · Détail pin (modal pas plein écran)
function MapPinDetailScreen() {
  return (
    <div style={{ background: '#0A1F44', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', overflow: 'hidden' }}>
      <StatusBarM />
      <MapBackground />

      {/* Highlight pin */}
      <div style={{ position: 'absolute', top: '34%', left: '50%', transform: 'translate(-50%, -100%)', zIndex: 4 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(244,185,66,0.25)', position: 'absolute', top: -14, left: -22, animation: 'ping 2s infinite' }} />
          <div style={{ width: 48, height: 48, borderRadius: '50% 50% 50% 0', background: '#F4B942', transform: 'rotate(-45deg)', boxShadow: '0 6px 18px rgba(0,0,0,0.35)', border: '4px solid #FFF' }} />
          <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', fontSize: 20 }}>🎉</div>
        </div>
      </div>

      {/* Card popup */}
      <div style={{ position: 'absolute', bottom: 24, left: 14, right: 14, background: '#FFF', borderRadius: 18, padding: 16, boxShadow: '0 18px 44px rgba(0,0,0,0.28)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 56, height: 70, borderRadius: 12, background: 'linear-gradient(135deg, #F4B942, #B88A2A)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#0A1F44', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.2 }}>{_mArc ? <_mArc size={60} opacity={1} /> : null}</div>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', position: 'relative' }}>SAM</div>
              <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 28, lineHeight: 1, position: 'relative' }}>11</div>
              <div style={{ fontSize: 9, fontWeight: 700, position: 'relative' }}>mai</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Événement · 120 m</div>
              <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 22, color: '#0A1F44', lineHeight: 1.15, marginTop: 4 }}>Marché aux livres</div>
              <div style={{ fontSize: 11.5, color: '#4B5B87', marginTop: 2 }}>Square du Belvédère · 18h-22h</div>
            </div>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F8F9FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </div>
        </div>

        {/* Description */}
        <div style={{ fontSize: 13, color: '#4B5B87', marginTop: 12, lineHeight: 1.5 }}>
          Vide-bibliothèque ouvert à tou·tes les voisin·es. Apporte tes livres à donner ou échanger, prends ce qui te plaît. Café offert.
        </div>

        {/* Stats */}
        <div style={{ marginTop: 14, padding: '10px 12px', background: '#F8F9FB', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex' }}>
            {['#F4B942', '#6FB89F', '#8B7AB8', '#D97757'].map((c, i) => (
              <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid #F8F9FB', marginLeft: i === 0 ? 0 : -8, color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{['SM','KL','JD','MN'][i]}</div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0A1F44' }}>23 voisins y vont</div>
            <div style={{ fontSize: 10.5, color: '#8993A8' }}>Sofia, Karim et 21 autres</div>
          </div>
        </div>

        {/* CTAs */}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, padding: '12px 0', textAlign: 'center', background: '#F4B942', color: '#0A1F44', borderRadius: 999, fontSize: 13, fontWeight: 800 }}>+ J'y vais</div>
          <div style={{ width: 48, height: 44, borderRadius: 999, background: 'transparent', border: '1.5px solid #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div style={{ width: 48, height: 44, borderRadius: 999, background: 'transparent', border: '1.5px solid #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2"><path d="m4 12 1 1 5-5 6 6m-4-2 5-5 3 3M21 7h-7"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// 04 · Filtres (sheet)
function MapFiltersScreen() {
  return (
    <div style={{ background: 'rgba(10,31,68,0.55)', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', overflow: 'hidden', backdropFilter: 'blur(4px)' }}>
      <StatusBarM dark />
      {/* Faded map behind */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.3 }}><MapBackground /></div>

      {/* Sheet */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#FFF', borderRadius: '20px 20px 0 0', padding: '12px 0 28px', maxHeight: '80%', overflow: 'auto', boxShadow: '0 -16px 40px rgba(0,0,0,0.35)' }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: '#E6E9F0' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '0 22px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Filtres</div>
            <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 26, color: '#0A1F44', lineHeight: 1.05, marginTop: 4 }}>Affine la carte</div>
          </div>
          <div style={{ fontSize: 12.5, color: '#B88A2A', fontWeight: 800 }}>Reset</div>
        </div>

        {/* Type */}
        <div style={{ padding: '0 22px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0A1F44', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Type</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { l: 'Événements', emoji: '🎉', sel: true },
              { l: 'Jobs', emoji: '💼', sel: true },
              { l: 'Marketplace', emoji: '🛍️', sel: true },
              { l: 'Voisins', emoji: '👥' },
              { l: 'Cercles', emoji: '🏘️' },
              { l: 'Stories', emoji: '✨' },
            ].map(c => (
              <div key={c.l} style={{
                padding: '8px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 700,
                background: c.sel ? '#0A1F44' : '#FFF',
                color: c.sel ? '#FFF8E8' : '#0A1F44',
                border: c.sel ? 'none' : '1px solid #E6E9F0',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ fontSize: 13 }}>{c.emoji}</span>
                {c.l}
                {c.sel && <span style={{ fontSize: 10, color: '#F4B942' }}>✓</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Distance */}
        <div style={{ padding: '0 22px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0A1F44', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Distance</div>
            <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 18, color: '#B88A2A' }}>1,5 km</div>
          </div>
          <div style={{ position: 'relative', height: 6, borderRadius: 3, background: '#E6E9F0' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: 6, width: '40%', borderRadius: 3, background: '#F4B942' }} />
            <div style={{ position: 'absolute', left: 'calc(40% - 10px)', top: -7, width: 20, height: 20, borderRadius: '50%', background: '#0A1F44', border: '3px solid #F4B942' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8993A8', marginTop: 6 }}>
            <span>500 m</span><span>2 km</span><span>5 km</span>
          </div>
        </div>

        {/* Quand */}
        <div style={{ padding: '0 22px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0A1F44', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Quand</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Maintenant', 'Aujourd\'hui', 'Cette semaine', 'Ce mois-ci', 'Tout'].map((l, i) => (
              <div key={l} style={{
                padding: '8px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 700,
                background: i === 1 ? '#0A1F44' : '#F8F9FB',
                color: i === 1 ? '#FFF8E8' : '#0A1F44',
              }}>{l}</div>
            ))}
          </div>
        </div>

        {/* Cercles only */}
        <div style={{ padding: '0 22px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F0F2F7', paddingTop: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1F44' }}>Cercles uniquement</div>
            <div style={{ fontSize: 11, color: '#8993A8' }}>N'afficher que ce qui vient de tes cercles</div>
          </div>
          <div style={{ width: 44, height: 26, borderRadius: 13, background: '#E6E9F0', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: '50%', background: '#FFF', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }} />
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '6px 18px 0' }}>
          <div style={{ padding: '14px 0', textAlign: 'center', background: '#0A1F44', color: '#FFF8E8', borderRadius: 999, fontSize: 14, fontWeight: 800 }}>
            Voir les <span style={{ color: '#F4B942' }}>23 résultats</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  MapMainScreen,
  MapListSheetScreen,
  MapPinDetailScreen,
  MapFiltersScreen,
});
