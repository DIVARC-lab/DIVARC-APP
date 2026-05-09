// Onboarding multi-step (5 écrans)
const _oArc = window.ArcDeco;

function StatusBarO({ dark = false }) {
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

function ProgressDots({ step, total = 5 }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === step ? 22 : 6, height: 6, borderRadius: 3,
          background: i <= step ? '#F4B942' : 'rgba(255,248,232,0.25)',
          transition: 'all 200ms',
        }} />
      ))}
    </div>
  );
}

function ProgressDotsLight({ step, total = 5 }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === step ? 22 : 6, height: 6, borderRadius: 3,
          background: i <= step ? '#0A1F44' : '#E6E9F0',
          transition: 'all 200ms',
        }} />
      ))}
    </div>
  );
}

// 01 · Welcome (dark)
function OnboardWelcomeScreen() {
  return (
    <div style={{ background: '#0A1F44', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', color: '#FFF8E8', overflow: 'hidden' }}>
      <StatusBarO dark />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 20%, #2C4D8C 0%, #0A1F44 60%, #050E22 100%)' }} />
      <div style={{ position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', opacity: 0.5 }}>
        {_oArc ? <_oArc size={680} opacity={0.7} /> : null}
      </div>

      {/* Skip */}
      <div style={{ position: 'absolute', top: 50, right: 18, fontSize: 12.5, color: 'rgba(255,248,232,0.55)', fontWeight: 700, zIndex: 2 }}>Passer</div>

      {/* Logo */}
      <div style={{ position: 'absolute', top: 130, left: 0, right: 0, textAlign: 'center', zIndex: 2 }}>
        <div style={{ width: 76, height: 76, margin: '0 auto', background: '#F4B942', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 12px 28px rgba(244,185,66,0.4)' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.25 }}>{_oArc ? <_oArc size={76} opacity={1} /> : null}</div>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 44, color: '#0A1F44', position: 'relative', lineHeight: 1 }}>D</div>
        </div>
      </div>

      {/* Hero copy */}
      <div style={{ position: 'absolute', top: 290, left: 28, right: 28, textAlign: 'center', zIndex: 2 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#F4B942', fontWeight: 800 }}>· Bienvenue</div>
        <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 44, lineHeight: 1.05, marginTop: 12, letterSpacing: '-0.02em' }}>
          Le réseau de ton <span style={{ color: '#F4B942' }}>quartier</span>.
        </div>
        <div style={{ fontSize: 14.5, color: 'rgba(255,248,232,0.7)', marginTop: 18, lineHeight: 1.5, padding: '0 8px' }}>
          Voisins, jobs locaux, bons plans, entraide. Pas de pub, pas d'algo opaque.
        </div>
      </div>

      {/* Pills */}
      <div style={{ position: 'absolute', bottom: 220, left: 28, right: 28, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', zIndex: 2 }}>
        {['Cercles', 'Jobs', 'Marketplace', 'Stories', 'Wallet'].map((p, i) => (
          <div key={p} style={{
            padding: '7px 13px', borderRadius: 999, fontSize: 11.5, fontWeight: 700,
            background: i === 1 ? 'rgba(244,185,66,0.18)' : 'rgba(255,248,232,0.08)',
            border: '1px solid ' + (i === 1 ? 'rgba(244,185,66,0.4)' : 'rgba(255,248,232,0.15)'),
            color: i === 1 ? '#F4B942' : 'rgba(255,248,232,0.8)',
          }}>{p}</div>
        ))}
      </div>

      {/* Progress + CTA */}
      <div style={{ position: 'absolute', bottom: 30, left: 24, right: 24, zIndex: 2 }}>
        <ProgressDots step={0} />
        <div style={{ marginTop: 18, padding: '14px 0', textAlign: 'center', background: '#F4B942', color: '#0A1F44', borderRadius: 999, fontSize: 14.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          Commencer
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </div>
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'rgba(255,248,232,0.55)' }}>
          Déjà un compte ? <span style={{ color: '#F4B942', fontWeight: 700 }}>Se connecter</span>
        </div>
      </div>
    </div>
  );
}

// 02 · Centres d'intérêt
function OnboardInterestsScreen() {
  const interests = [
    { l: 'Bons plans', emoji: '💡', sel: true },
    { l: 'Jardinage', emoji: '🌱' },
    { l: 'Vélo', emoji: '🚲', sel: true },
    { l: 'Cuisine', emoji: '🍳' },
    { l: 'Tech', emoji: '💻', sel: true },
    { l: 'Musique', emoji: '🎸' },
    { l: 'Sport', emoji: '⚽' },
    { l: 'Art', emoji: '🎨' },
    { l: 'Famille', emoji: '👨‍👩‍👧' },
    { l: 'Animaux', emoji: '🐕' },
    { l: 'Lecture', emoji: '📚', sel: true },
    { l: 'Cinéma', emoji: '🎬' },
    { l: 'Voyage', emoji: '✈️' },
    { l: 'Mode', emoji: '👗' },
    { l: 'Photo', emoji: '📷' },
    { l: 'Écolo', emoji: '♻️' },
  ];
  return (
    <div style={{ background: '#FFF', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui' }}>
      <StatusBarO />

      {/* Top bar */}
      <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F8F9FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <div style={{ fontSize: 12.5, color: '#8993A8', fontWeight: 700 }}>Étape 2 sur 5</div>
        <div style={{ fontSize: 12.5, color: '#B88A2A', fontWeight: 800 }}>Passer</div>
      </div>

      {/* Header */}
      <div style={{ padding: '20px 24px 16px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Tes centres d'intérêt</div>
        <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 32, color: '#0A1F44', lineHeight: 1.05, marginTop: 8 }}>
          Tu aimes <span style={{ color: '#B88A2A' }}>quoi</span>, toi ?
        </div>
        <div style={{ fontSize: 13, color: '#4B5B87', marginTop: 8, lineHeight: 1.5 }}>
          Choisis-en au moins 3. On t'aidera à trouver les bonnes personnes et les bons cercles.
        </div>
      </div>

      {/* Counter */}
      <div style={{ padding: '0 24px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 28, color: '#B88A2A', lineHeight: 1 }}>3</div>
        <div style={{ fontSize: 12, color: '#4B5B87', fontWeight: 600 }}>sur 16 sélectionnés</div>
      </div>

      {/* Grid of chips */}
      <div style={{ padding: '0 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {interests.map(it => (
          <div key={it.l} style={{
            padding: '9px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
            background: it.sel ? '#0A1F44' : '#FFF',
            color: it.sel ? '#FFF8E8' : '#0A1F44',
            border: it.sel ? 'none' : '1px solid #E6E9F0',
            boxShadow: it.sel ? '0 6px 16px rgba(10,31,68,0.2)' : 'none',
          }}>
            <span style={{ fontSize: 14 }}>{it.emoji}</span>
            {it.l}
            {it.sel && <span style={{ fontSize: 11, color: '#F4B942' }}>✓</span>}
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={{ position: 'absolute', bottom: 30, left: 24, right: 24 }}>
        <ProgressDotsLight step={1} />
        <div style={{ marginTop: 18, padding: '14px 0', textAlign: 'center', background: '#0A1F44', color: '#FFF8E8', borderRadius: 999, fontSize: 14.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          Continuer
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </div>
      </div>
    </div>
  );
}

// 03 · Quartier (mini map + recherche adresse)
function OnboardLocationScreen() {
  return (
    <div style={{ background: '#FFF', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui' }}>
      <StatusBarO />

      {/* Top bar */}
      <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F8F9FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <div style={{ fontSize: 12.5, color: '#8993A8', fontWeight: 700 }}>Étape 3 sur 5</div>
        <div style={{ width: 32 }} />
      </div>

      {/* Header */}
      <div style={{ padding: '20px 24px 14px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Ton quartier</div>
        <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 32, color: '#0A1F44', lineHeight: 1.05, marginTop: 8 }}>
          Tu habites <span style={{ color: '#B88A2A' }}>où</span> ?
        </div>
        <div style={{ fontSize: 13, color: '#4B5B87', marginTop: 8, lineHeight: 1.5 }}>
          Pour t'afficher les bons cercles, événements et offres locales. Approximatif suffit.
        </div>
      </div>

      {/* Search input */}
      <div style={{ padding: '4px 18px 14px' }}>
        <div style={{
          padding: '13px 16px', background: '#FFF', border: '2px solid #0A1F44',
          borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#0A1F44' }}>Belleville, Paris 19e</div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#F4B942"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19l12-12-1.4-1.4z"/></svg>
        </div>
      </div>

      {/* Mini map preview */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={{
          height: 200, borderRadius: 14, overflow: 'hidden', position: 'relative',
          background: 'linear-gradient(180deg, #C8D2E5 0%, #E6E9F0 100%)',
        }}>
          {/* Fake map roads */}
          <svg width="100%" height="100%" viewBox="0 0 360 200" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="none">
            <path d="M0 80 L360 110" stroke="#FFF" strokeWidth="6" />
            <path d="M0 130 L360 80" stroke="#FFF" strokeWidth="4" />
            <path d="M80 0 L120 200" stroke="#FFF" strokeWidth="5" />
            <path d="M260 0 L240 200" stroke="#FFF" strokeWidth="4" />
            <path d="M0 40 L360 50" stroke="#FFF" strokeWidth="3" opacity="0.7" />
            <path d="M0 170 L360 180" stroke="#FFF" strokeWidth="3" opacity="0.7" />
            {/* Parks */}
            <rect x="190" y="60" width="50" height="40" fill="#A6C9A6" rx="4" />
            <rect x="20" y="140" width="60" height="50" fill="#A6C9A6" rx="4" />
            {/* Buildings clusters */}
            {[
              [40, 60], [60, 70], [50, 90], [130, 40], [150, 55], [170, 35],
              [280, 60], [310, 80], [290, 110], [40, 100], [60, 110], [40, 120],
              [220, 130], [250, 150], [200, 160], [280, 140],
            ].map(([x, y], i) => (
              <rect key={i} x={x} y={y} width={10 + (i % 3) * 4} height={10 + (i % 3) * 4} fill="#8993A8" opacity="0.5" />
            ))}
          </svg>

          {/* Pin */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -100%)' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#F4B942', border: '4px solid #FFF', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(244,185,66,0.3)', position: 'absolute', top: 30, left: 3, animation: 'ping 2s infinite' }} />
          </div>

          {/* Radius label */}
          <div style={{ position: 'absolute', bottom: 12, left: 12, padding: '6px 11px', borderRadius: 999, background: 'rgba(10,31,68,0.85)', backdropFilter: 'blur(8px)', color: '#FFF8E8', fontSize: 11, fontWeight: 700 }}>
            Rayon 1.2 km
          </div>
        </div>
      </div>

      {/* Radius slider */}
      <div style={{ padding: '0 24px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4B5B87', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
          <span>Rayon visible</span>
          <span style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 16, color: '#0A1F44', textTransform: 'none', letterSpacing: 0 }}>1,2 km</span>
        </div>
        <div style={{ position: 'relative', height: 6, borderRadius: 3, background: '#E6E9F0' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: 6, width: '32%', borderRadius: 3, background: '#F4B942' }} />
          <div style={{ position: 'absolute', left: 'calc(32% - 10px)', top: -7, width: 20, height: 20, borderRadius: '50%', background: '#0A1F44', border: '3px solid #F4B942' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8993A8', marginTop: 6 }}>
          <span>500 m</span>
          <span>2 km</span>
          <span>5 km</span>
        </div>
      </div>

      {/* Privacy note */}
      <div style={{ padding: '6px 18px 0' }}>
        <div style={{ padding: '10px 12px', background: '#F8F9FB', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4B5B87" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: 1 }}>
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <div style={{ fontSize: 11, color: '#4B5B87', lineHeight: 1.45 }}>
            Ta position exacte n'est <strong style={{ color: '#0A1F44' }}>jamais</strong> affichée — uniquement le quartier que tu choisis ici.
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ position: 'absolute', bottom: 30, left: 24, right: 24 }}>
        <ProgressDotsLight step={2} />
        <div style={{ marginTop: 18, padding: '14px 0', textAlign: 'center', background: '#0A1F44', color: '#FFF8E8', borderRadius: 999, fontSize: 14.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          C'est mon quartier
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </div>
      </div>
    </div>
  );
}

// 04 · Connexions (cercles + voisins suggérés)
function OnboardConnectScreen() {
  const circles = [
    { name: 'Voisins de Belleville', members: 287, emoji: '🏘️', color: '#F4B942', joined: true },
    { name: 'Devs Paris', members: 1284, emoji: '💻', color: '#2C4D8C', joined: true },
    { name: 'Vélo · Paris Est', members: 412, emoji: '🚲', color: '#D97757', joined: false },
    { name: 'Bookclub Belleville', members: 23, emoji: '📚', color: '#8B7AB8', joined: true },
  ];
  const people = [
    { name: 'Sofia Marchand', role: 'Voisine · 200m', initials: 'SM', color: '#C8D2E5' },
    { name: 'Karim Lebel', role: 'Voisin · 450m · Mod', initials: 'KL', color: '#F4B942' },
    { name: 'Jean Dupont', role: 'Voisin · 800m', initials: 'JD', color: '#6FB89F' },
  ];
  return (
    <div style={{ background: '#FFF', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', paddingBottom: 120 }}>
      <StatusBarO />

      {/* Top bar */}
      <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F8F9FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <div style={{ fontSize: 12.5, color: '#8993A8', fontWeight: 700 }}>Étape 4 sur 5</div>
        <div style={{ fontSize: 12.5, color: '#B88A2A', fontWeight: 800 }}>Passer</div>
      </div>

      {/* Header */}
      <div style={{ padding: '20px 24px 14px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Tes premières connexions</div>
        <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 30, color: '#0A1F44', lineHeight: 1.1, marginTop: 8 }}>
          Voici qui est <span style={{ color: '#B88A2A' }}>déjà</span> chez toi
        </div>
      </div>

      {/* Cercles section */}
      <div style={{ padding: '0 18px 8px' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#0A1F44', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>4 cercles près de chez toi</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {circles.map(c => (
            <div key={c.name} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 10,
              background: c.joined ? 'rgba(244,185,66,0.06)' : '#FFF',
              border: '1px solid ' + (c.joined ? 'rgba(244,185,66,0.25)' : '#E6E9F0'),
              borderRadius: 12,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.15 }}>{_oArc ? <_oArc size={42} opacity={1} /> : null}</div>
                <span style={{ position: 'relative' }}>{c.emoji}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0A1F44' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#8993A8', marginTop: 1 }}>{c.members.toLocaleString('fr')} membres</div>
              </div>
              <div style={{
                padding: '6px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 800,
                background: c.joined ? '#0A1F44' : 'transparent',
                color: c.joined ? '#FFF8E8' : '#0A1F44',
                border: c.joined ? 'none' : '1.5px solid #0A1F44',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {c.joined ? '✓ Rejoint' : '+ Rejoindre'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voisins section */}
      <div style={{ padding: '14px 18px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#0A1F44', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>3 voisins à découvrir</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {people.map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: p.color, color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{p.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0A1F44' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#8993A8' }}>{p.role}</div>
              </div>
              <div style={{ padding: '6px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 800, color: '#0A1F44', border: '1.5px solid #0A1F44' }}>+ Suivre</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ position: 'absolute', bottom: 30, left: 24, right: 24 }}>
        <ProgressDotsLight step={3} />
        <div style={{ marginTop: 18, padding: '14px 0', textAlign: 'center', background: '#0A1F44', color: '#FFF8E8', borderRadius: 999, fontSize: 14.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          Continuer
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </div>
      </div>
    </div>
  );
}

// 05 · Premier post (encouragement)
function OnboardFirstPostScreen() {
  return (
    <div style={{ background: '#0A1F44', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', color: '#FFF8E8', overflow: 'hidden' }}>
      <StatusBarO dark />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #1F3563 0%, #0A1F44 80%)' }} />
      <div style={{ position: 'absolute', top: -100, right: -100, opacity: 0.3 }}>
        {_oArc ? <_oArc size={500} opacity={1} /> : null}
      </div>

      {/* Top bar */}
      <div style={{ padding: '0 16px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,248,232,0.08)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFF8E8" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,248,232,0.55)', fontWeight: 700 }}>Étape 5 sur 5 · dernière</div>
          <div style={{ width: 32 }} />
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '36px 28px 0', position: 'relative' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#F4B942', fontWeight: 800 }}>· Ton premier post</div>
        <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 38, lineHeight: 1.05, marginTop: 10, letterSpacing: '-0.02em' }}>
          Dis bonjour à tes <span style={{ color: '#F4B942' }}>voisins</span>.
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,248,232,0.7)', marginTop: 14, lineHeight: 1.5 }}>
          Une présentation rapide aide les autres à te répondre. Pas obligé, mais ça aide.
        </div>
      </div>

      {/* Composer card */}
      <div style={{ position: 'absolute', top: 290, left: 20, right: 20, padding: 16, background: '#FFF8E8', borderRadius: 18, color: '#0A1F44', boxShadow: '0 16px 40px rgba(0,0,0,0.3)' }}>
        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #F4B942, #B88A2A)', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>AM</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0A1F44' }}>Aïssata M.</div>
            <div style={{ fontSize: 10.5, color: '#8993A8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>
              Public · Belleville
            </div>
          </div>
        </div>

        {/* Composer */}
        <div style={{ marginTop: 14, padding: 12, background: '#FFF', borderRadius: 12, border: '1.5px solid rgba(244,185,66,0.4)', minHeight: 90 }}>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 18, color: '#0A1F44', lineHeight: 1.4 }}>
            Salut ! Je viens d'arriver sur DIVARC. J'habite Belleville depuis 3 ans, j'aime
          </div>
          <div style={{ display: 'inline-block', width: 1.5, height: 20, background: '#F4B942', verticalAlign: 'middle', animation: 'blink 1s infinite' }} />
        </div>

        {/* Suggestions chips */}
        <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['💡 Bons plans', '🚲 Vélo', '💻 Tech', '📚 Lecture'].map(s => (
            <div key={s} style={{ padding: '5px 10px', borderRadius: 999, background: 'rgba(244,185,66,0.12)', border: '1px solid rgba(244,185,66,0.3)', fontSize: 11, fontWeight: 700, color: '#B88A2A' }}>{s}</div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F0F2F7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 14, color: '#4B5B87' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>
          </div>
          <div style={{ padding: '7px 14px', borderRadius: 999, background: '#0A1F44', color: '#FFF8E8', fontSize: 12, fontWeight: 800 }}>Publier</div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ position: 'absolute', bottom: 30, left: 24, right: 24, zIndex: 2 }}>
        <ProgressDots step={4} />
        <div style={{ marginTop: 18, padding: '14px 0', textAlign: 'center', background: '#F4B942', color: '#0A1F44', borderRadius: 999, fontSize: 14.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          Publier et entrer dans DIVARC
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </div>
        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'rgba(255,248,232,0.55)' }}>
          <span style={{ fontWeight: 700 }}>Plus tard</span>, juste entrer
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  OnboardWelcomeScreen,
  OnboardInterestsScreen,
  OnboardLocationScreen,
  OnboardConnectScreen,
  OnboardFirstPostScreen,
});
