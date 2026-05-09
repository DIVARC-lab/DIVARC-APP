// Stories — création + détail (4 écrans, fond navy, full-bleed)

const _sArcDeco = window.ArcDeco;

function StatusBarS({ dark = true }) {
  return (
    <div style={{
      height: 44, padding: '0 22px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', fontFamily: 'Geist, system-ui',
      fontSize: 15, fontWeight: 700, color: dark ? '#FFF8E8' : '#0A1F44',
      position: 'relative', zIndex: 5,
    }}>
      <div>9:41</div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <svg width="16" height="11" viewBox="0 0 16 11"><path d="M0 8h2v3H0zM4 6h2v5H4zM8 4h2v7H8zM12 1h2v10h-2z" fill="currentColor"/></svg>
        <svg width="24" height="11" viewBox="0 0 24 11" fill="none">
          <rect x="0.5" y="0.5" width="20" height="10" rx="2.2" stroke="currentColor" opacity="0.5"/>
          <rect x="2" y="2" width="16" height="7" rx="1" fill="currentColor"/>
        </svg>
      </div>
    </div>
  );
}

// 01 · Capture (camera UI)
function StoriesCaptureScreen() {
  return (
    <div style={{ background: '#0A1F44', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', color: '#FFF8E8', overflow: 'hidden' }}>
      <StatusBarS />
      {/* Faux viewfinder background */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, #2C4D8C 0%, #0A1F44 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.45 }}>
        {_sArcDeco ? <_sArcDeco size={760} opacity={0.6} /> : null}
      </div>

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 44, left: 0, right: 0, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 4 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF8E8" strokeWidth="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </div>
        <div style={{ fontSize: 11, padding: '5px 12px', borderRadius: 999, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', color: '#F4B942', fontWeight: 800, letterSpacing: '0.06em' }}>● REC · 0:08</div>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFF8E8" strokeWidth="2"><path d="M5 8.5C5 7 6 6 7.5 6h2L11 4h2l1.5 2h2C18 6 19 7 19 8.5v8C19 18 18 19 16.5 19h-9C6 19 5 18 5 16.5z"/><circle cx="12" cy="12" r="3.5"/></svg>
        </div>
      </div>

      {/* Side tools */}
      <div style={{ position: 'absolute', top: 130, right: 14, display: 'flex', flexDirection: 'column', gap: 14, zIndex: 3 }}>
        {[
          { i: 'flash', label: 'Flash' },
          { i: 'timer', label: '3s' },
          { i: 'grid', label: 'Grille' },
          { i: 'speed', label: '1×' },
        ].map((t, i) => (
          <div key={t.i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: i === 0 ? '#F4B942' : 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: i === 0 ? '#0A1F44' : '#FFF8E8' }}>
              {t.i === 'flash' && <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7v8l10-12h-7z"/></svg>}
              {t.i === 'timer' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>}
              {t.i === 'grid' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>}
              {t.i === 'speed' && <span style={{ fontSize: 11, fontWeight: 800 }}>1×</span>}
            </div>
            <div style={{ fontSize: 9.5, fontWeight: 700, opacity: 0.7 }}>{t.label}</div>
          </div>
        ))}
      </div>

      {/* Subject pseudo-photo */}
      <div style={{ position: 'absolute', top: 200, left: '50%', transform: 'translateX(-50%)', width: 240, height: 320, borderRadius: 18, background: 'rgba(255,248,232,0.06)', border: '2px solid rgba(244,185,66,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 56, color: 'rgba(244,185,66,0.5)' }}>·</div>
      </div>

      {/* Mode tabs */}
      <div style={{ position: 'absolute', bottom: 180, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 22, zIndex: 3 }}>
        {['Texte', 'Photo', 'Vidéo', 'Boomerang'].map((m, i) => (
          <div key={m} style={{
            fontSize: 12.5, fontWeight: i === 1 ? 800 : 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: i === 1 ? '#F4B942' : 'rgba(255,248,232,0.55)',
            paddingBottom: 4,
            borderBottom: i === 1 ? '2px solid #F4B942' : '2px solid transparent',
          }}>{m}</div>
        ))}
      </div>

      {/* Shutter */}
      <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 30, zIndex: 3 }}>
        <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(255,248,232,0.1)', border: '1px solid rgba(244,185,66,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #F4B942, #B88A2A)' }} />
        </div>
        <div style={{ width: 86, height: 86, borderRadius: '50%', background: '#FFF8E8', border: '5px solid rgba(244,185,66,0.4)', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: '#F4B942' }} />
        </div>
        <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFF8E8" strokeWidth="2"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/></svg>
        </div>
      </div>
    </div>
  );
}

// 02 · Édition (filtres, texte, stickers)
function StoriesEditScreen() {
  return (
    <div style={{ background: '#0A1F44', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', color: '#FFF8E8', overflow: 'hidden' }}>
      <StatusBarS />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #2C4D8C 0%, #0A1F44 80%)' }} />
      <div style={{ position: 'absolute', right: -100, bottom: 200, opacity: 0.32 }}>
        {_sArcDeco ? <_sArcDeco size={520} opacity={1} /> : null}
      </div>

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 44, left: 0, right: 0, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 4 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF8E8" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['type', 'sticker', 'pen', 'music'].map((i, k) => (
            <div key={i} style={{ width: 38, height: 38, borderRadius: '50%', background: k === 0 ? '#F4B942' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: k === 0 ? '#0A1F44' : '#FFF8E8' }}>
              {i === 'type' && <span style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 18, fontWeight: 600 }}>Aa</span>}
              {i === 'sticker' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11V3l-8 8M3 21h12l6-6"/></svg>}
              {i === 'pen' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>}
              {i === 'music' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>}
            </div>
          ))}
        </div>
      </div>

      {/* Center text overlay */}
      <div style={{ position: 'absolute', top: 200, left: 30, right: 30, zIndex: 3, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic',
          fontSize: 54, lineHeight: 1.05, color: '#FFF8E8',
          letterSpacing: '-0.02em',
          textShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          Premier vrai jour de <span style={{ color: '#F4B942' }}>printemps</span>.
        </div>
      </div>

      {/* Sticker */}
      <div style={{ position: 'absolute', top: 460, right: 40, zIndex: 3, transform: 'rotate(-8deg)' }}>
        <div style={{
          background: '#FFF8E8', color: '#0A1F44', padding: '10px 16px', borderRadius: 999,
          fontSize: 13, fontWeight: 800, letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F4B942' }} />
          Belleville · 19e
        </div>
      </div>

      {/* Filter strip */}
      <div style={{ position: 'absolute', bottom: 130, left: 0, right: 0, padding: '0 16px', display: 'flex', gap: 10, overflowX: 'auto', zIndex: 3 }}>
        {[
          { l: 'Original', sel: false },
          { l: 'Doré', sel: true },
          { l: 'Crème', sel: false },
          { l: 'Nuit', sel: false },
          { l: 'Pellicule', sel: false },
          { l: 'Argent', sel: false },
        ].map(f => (
          <div key={f.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{
              width: 56, height: 70, borderRadius: 10,
              background: f.l === 'Original' ? 'linear-gradient(135deg, #2C4D8C, #0A1F44)' :
                          f.l === 'Doré' ? 'linear-gradient(135deg, #F4B942, #B88A2A)' :
                          f.l === 'Crème' ? 'linear-gradient(135deg, #FFF8E8, #F0E5C5)' :
                          f.l === 'Nuit' ? '#0A1F44' :
                          f.l === 'Pellicule' ? 'linear-gradient(135deg, #6B7B9F, #2C4D8C)' :
                          'linear-gradient(135deg, #C8D2E5, #8993A8)',
              border: f.sel ? '3px solid #F4B942' : '1px solid rgba(255,248,232,0.18)',
            }} />
            <div style={{ fontSize: 10.5, fontWeight: f.sel ? 800 : 600, color: f.sel ? '#F4B942' : 'rgba(255,248,232,0.65)' }}>{f.l}</div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 4 }}>
        <div style={{
          flex: 1, height: 44, borderRadius: 22, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(244,185,66,0.25)',
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
        }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #F4B942, #B88A2A)', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 9 }}>AM</div>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Ton story</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.55 }}>+ Cercles</span>
        </div>
        <div style={{
          height: 44, padding: '0 18px', borderRadius: 22,
          background: '#F4B942', color: '#0A1F44',
          display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13.5,
        }}>
          Partager
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </div>
      </div>
    </div>
  );
}

// 03 · Viewer (full-screen story playback)
function StoriesViewerScreen() {
  return (
    <div style={{ background: '#0A1F44', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', color: '#FFF8E8', overflow: 'hidden' }}>
      <StatusBarS />

      {/* Backdrop image (placeholder) */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #1F3563 0%, #0A1F44 60%, #050E22 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
        {_sArcDeco ? <_sArcDeco size={840} opacity={0.55} /> : null}
      </div>

      {/* Progress bars */}
      <div style={{ position: 'absolute', top: 50, left: 14, right: 14, display: 'flex', gap: 4, zIndex: 4 }}>
        {[100, 100, 35, 0, 0].map((p, i) => (
          <div key={i} style={{ flex: 1, height: 2.5, borderRadius: 2, background: 'rgba(255,248,232,0.25)', overflow: 'hidden' }}>
            <div style={{ width: p + '%', height: '100%', background: '#F4B942' }} />
          </div>
        ))}
      </div>

      {/* Author header */}
      <div style={{ position: 'absolute', top: 64, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 10, zIndex: 4 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', padding: 2, background: 'linear-gradient(135deg, #F4B942, #B88A2A)' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, #C8D2E5, #6B7B9F)', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>SM</div>
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Sofia M.</div>
          <div style={{ fontSize: 10.5, opacity: 0.6 }}>il y a 2h · Belleville</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF8E8" strokeWidth="2.2"><circle cx="12" cy="12" r="1.5" fill="#FFF8E8"/><circle cx="5" cy="12" r="1.5" fill="#FFF8E8"/><circle cx="19" cy="12" r="1.5" fill="#FFF8E8"/></svg>
          </div>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFF8E8" strokeWidth="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </div>
        </div>
      </div>

      {/* Story content area */}
      <div style={{ position: 'absolute', top: 200, left: 24, right: 24, zIndex: 3 }}>
        <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 52, lineHeight: 1.05, color: '#FFF8E8', letterSpacing: '-0.02em', textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
          Le marché de la rue de Belleville à <span style={{ color: '#F4B942' }}>l'ouverture</span>.
        </div>
      </div>

      {/* Question sticker */}
      <div style={{ position: 'absolute', top: 420, left: 24, right: 24, zIndex: 3 }}>
        <div style={{
          background: 'rgba(255,248,232,0.95)', borderRadius: 18, padding: '14px 18px',
          color: '#0A1F44', boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontSize: 11, color: '#B88A2A', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>· Question</div>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 22 }}>Le meilleur poissonnier ?</div>
          <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 12, background: '#F8F9FB', fontSize: 13, color: '#8993A8', fontWeight: 600 }}>
            Réponds…
          </div>
        </div>
      </div>

      {/* Bottom interaction */}
      <div style={{ position: 'absolute', bottom: 28, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 10, zIndex: 4 }}>
        <div style={{
          flex: 1, height: 42, borderRadius: 21, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,248,232,0.18)',
          display: 'flex', alignItems: 'center', padding: '0 16px',
          fontSize: 13, color: 'rgba(255,248,232,0.65)',
        }}>Envoyer un message…</div>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF8E8" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFF8E8" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
        </div>
      </div>
    </div>
  );
}

// 04 · Mes stories / archive avec stats
function StoriesArchiveScreen() {
  const stories = [
    { d: 'Aujourd\'hui · 14:32', preview: 'Marché de Belleville', views: 47, replies: 8, sticker: 'question' },
    { d: 'Aujourd\'hui · 09:18', preview: 'Premier café', views: 92, replies: 3, sticker: 'poll' },
    { d: 'Hier · 22:04', preview: 'Coucher de soleil', views: 184, replies: 12 },
    { d: 'Hier · 18:30', preview: 'Apéro avec Karim', views: 76, replies: 5 },
    { d: '6 mai · 11:15', preview: 'Vélo Peugeot vendu', views: 312, replies: 24, sticker: 'link' },
  ];
  return (
    <div style={{ background: '#FFF', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', paddingBottom: 24 }}>
      <div style={{ height: 44, padding: '0 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#0A1F44' }}>
        <div>9:41</div>
      </div>

      {/* Header */}
      <div style={{ padding: '8px 16px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F8F9FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Mes stories</div>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 22, color: '#0A1F44' }}>Archive · <span style={{ color: '#B88A2A' }}>5 actives</span></div>
        </div>
      </div>

      {/* Stat row */}
      <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { l: 'Vues', v: 711 },
          { l: 'Réponses', v: 52 },
          { l: 'Partages', v: 18 },
        ].map(s => (
          <div key={s.l} style={{ padding: 12, background: '#F8F9FB', borderRadius: 12, border: '1px solid #E6E9F0', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 24, color: '#0A1F44', lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 10.5, color: '#8993A8', fontWeight: 700, marginTop: 3, letterSpacing: '0.04em' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Story list */}
      <div style={{ padding: '0 16px' }}>
        {stories.map((s, i) => (
          <div key={i} style={{
            padding: '12px 0', display: 'flex', gap: 12,
            borderBottom: i < stories.length - 1 ? '1px solid #F0F2F7' : 'none',
            alignItems: 'center',
          }}>
            <div style={{ width: 56, height: 80, borderRadius: 10, background: 'linear-gradient(135deg, #2C4D8C, #0A1F44)', position: 'relative', flexShrink: 0, border: '2px solid rgba(244,185,66,0.4)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
                {_sArcDeco ? <_sArcDeco size={80} opacity={1} /> : null}
              </div>
              {s.sticker && (
                <div style={{ position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: '#F4B942', color: '#0A1F44', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.sticker === 'question' ? '?' : s.sticker === 'poll' ? '%' : '↗'}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1F44', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.preview}</div>
              <div style={{ fontSize: 11.5, color: '#8993A8', marginTop: 2 }}>{s.d}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: 11, color: '#4B5B87' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  {s.views}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  {s.replies}
                </span>
              </div>
            </div>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#F8F9FB', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4B5B87" strokeWidth="2.2"><circle cx="12" cy="12" r="1.5" fill="#4B5B87"/><circle cx="5" cy="12" r="1.5" fill="#4B5B87"/><circle cx="19" cy="12" r="1.5" fill="#4B5B87"/></svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  StoriesCaptureScreen,
  StoriesEditScreen,
  StoriesViewerScreen,
  StoriesArchiveScreen,
});
