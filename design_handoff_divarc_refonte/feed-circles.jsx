// Cercles · groupes (4 écrans)
const _cArc = window.ArcDeco;

function StatusBarC({ dark = false }) {
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

const CIRCLES = [
  { id: 1, name: 'Voisins de Belleville', members: 287, posts: 12, color: '#F4B942', emoji: '🏘️', desc: 'Le quartier, l\'entraide, les bons plans.', priv: false, role: 'Membre' },
  { id: 2, name: 'Devs Paris', members: 1284, posts: 34, color: '#2C4D8C', emoji: '💻', desc: 'Tech meetups, jobs, side projects.', priv: false, role: 'Modérateur' },
  { id: 3, name: 'Parents 19e', members: 156, posts: 5, color: '#6FB89F', emoji: '👶', desc: 'Crèches, écoles, sorties enfants.', priv: true, role: 'Membre' },
  { id: 4, name: 'Vélo · Paris Est', members: 412, posts: 8, color: '#D97757', emoji: '🚲', desc: 'Itinéraires, ateliers, bourses vélos.', priv: false, role: 'Membre' },
  { id: 5, name: 'Bookclub Belleville', members: 23, posts: 2, color: '#8B7AB8', emoji: '📚', desc: '1 livre par mois, RDV chaque dernier jeudi.', priv: true, role: 'Admin' },
];

// 01 · Mes cercles
function CirclesListScreen() {
  return (
    <div style={{ background: '#FFF', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', paddingBottom: 90 }}>
      <StatusBarC />

      {/* Header */}
      <div style={{ padding: '6px 18px 14px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Cercles</div>
        <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 38, lineHeight: 1.05, color: '#0A1F44', marginTop: 4 }}>
          Tes <span style={{ color: '#B88A2A' }}>5 cercles</span>
        </div>
        <div style={{ fontSize: 13, color: '#4B5B87', marginTop: 6 }}>Des espaces plus calmes que le feed. Discussions, événements, entraide.</div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: '#F8F9FB', borderRadius: 999, border: '1px solid #E6E9F0' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8993A8" strokeWidth="2.2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <span style={{ fontSize: 13, color: '#8993A8' }}>Chercher un cercle…</span>
        </div>
      </div>

      {/* Suggestions chip row */}
      <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {[
          { l: 'Tous', sel: true },
          { l: 'Modéré par toi', sel: false },
          { l: 'Privés', sel: false },
          { l: 'Publics', sel: false },
        ].map(c => (
          <div key={c.l} style={{
            padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, flexShrink: 0,
            background: c.sel ? '#0A1F44' : '#F8F9FB',
            color: c.sel ? '#FFF8E8' : '#4B5B87',
            border: c.sel ? 'none' : '1px solid #E6E9F0',
          }}>{c.l}</div>
        ))}
      </div>

      {/* Circle list */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CIRCLES.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 12, padding: 12, background: '#FFF', border: '1px solid #E6E9F0', borderRadius: 14, alignItems: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, flexShrink: 0,
              background: c.color, color: '#FFF8E8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.18 }}>{_cArc ? <_cArc size={56} opacity={1} /> : null}</div>
              <span style={{ position: 'relative' }}>{c.emoji}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: '#0A1F44', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                {c.priv && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#8993A8" strokeWidth="2.4"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#4B5B87', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.desc}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 10, fontSize: 11, color: '#8993A8', fontWeight: 600 }}>
                <span>{c.members.toLocaleString('fr')} membres</span>
                {c.posts > 0 && <span style={{ color: '#B88A2A', fontWeight: 800 }}>● {c.posts} nouveaux</span>}
              </div>
            </div>
            {c.role !== 'Membre' && (
              <div style={{ fontSize: 9.5, padding: '3px 7px', borderRadius: 999, background: c.role === 'Admin' ? '#0A1F44' : '#F4B942', color: c.role === 'Admin' ? '#FFF8E8' : '#0A1F44', fontWeight: 800, letterSpacing: '0.04em' }}>
                {c.role === 'Admin' ? 'ADMIN' : 'MOD'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Discover banner */}
      <div style={{ margin: '18px 16px 0', padding: 16, borderRadius: 14, background: 'linear-gradient(135deg, #0A1F44, #1F3563)', color: '#FFF8E8', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.25 }}>{_cArc ? <_cArc size={200} opacity={1} /> : null}</div>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#F4B942', fontWeight: 800 }}>· Découvrir</div>
        <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 22, marginTop: 4, position: 'relative' }}>14 cercles près de chez toi</div>
        <div style={{ marginTop: 12, padding: '8px 14px', background: '#F4B942', color: '#0A1F44', borderRadius: 999, fontSize: 12.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          Explorer
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </div>
      </div>

      {/* FAB */}
      <div style={{ position: 'absolute', bottom: 28, right: 18, width: 54, height: 54, borderRadius: '50%', background: '#F4B942', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(244,185,66,0.5)' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M12 5v14M5 12h14"/></svg>
      </div>
    </div>
  );
}

// 02 · Détail cercle (Voisins de Belleville)
function CircleDetailScreen() {
  return (
    <div style={{ background: '#FFF', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', paddingBottom: 24 }}>
      {/* Cover */}
      <div style={{ position: 'relative', height: 180, background: 'linear-gradient(135deg, #F4B942, #B88A2A)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>{_cArc ? <_cArc size={500} opacity={1} /> : null}</div>
        <StatusBarC dark />
        <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFF8E8" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF8E8" strokeWidth="2.2"><circle cx="12" cy="12" r="1.5" fill="#FFF8E8"/><circle cx="5" cy="12" r="1.5" fill="#FFF8E8"/><circle cx="19" cy="12" r="1.5" fill="#FFF8E8"/></svg>
          </div>
        </div>
      </div>

      {/* Avatar + meta */}
      <div style={{ padding: '0 18px', marginTop: -34, position: 'relative' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 18, background: '#F4B942', color: '#0A1F44',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
          border: '4px solid #FFF', boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
        }}>🏘️</div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 28, color: '#0A1F44', lineHeight: 1.1 }}>Voisins de Belleville</div>
          <div style={{ fontSize: 13, color: '#4B5B87', marginTop: 4 }}>Le quartier, l'entraide, les bons plans. Public · 287 membres</div>
        </div>

        {/* Member avatars + join */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex' }}>
            {['#C8D2E5', '#F4B942', '#6FB89F', '#D97757'].map((bg, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: '50%', background: bg, color: '#0A1F44',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 10,
                border: '2px solid #FFF', marginLeft: i === 0 ? 0 : -8,
              }}>{['SM', 'KL', 'AM', 'JD'][i]}</div>
            ))}
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F8F9FB', color: '#4B5B87', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 9, border: '2px solid #FFF', marginLeft: -8 }}>+283</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ padding: '8px 14px', background: '#0A1F44', color: '#FFF8E8', borderRadius: 999, fontSize: 12.5, fontWeight: 800 }}>✓ Membre</div>
        </div>

        {/* Tabs */}
        <div style={{ marginTop: 18, display: 'flex', gap: 18, borderBottom: '1px solid #E6E9F0' }}>
          {['Posts', 'Événements', 'Membres', 'À propos'].map((t, i) => (
            <div key={t} style={{
              fontSize: 13, fontWeight: i === 0 ? 800 : 600,
              color: i === 0 ? '#0A1F44' : '#8993A8',
              paddingBottom: 10,
              borderBottom: i === 0 ? '2px solid #F4B942' : '2px solid transparent',
            }}>{t}</div>
          ))}
        </div>

        {/* Pinned post */}
        <div style={{ marginTop: 14, padding: 14, background: 'rgba(244,185,66,0.08)', border: '1px solid rgba(244,185,66,0.3)', borderRadius: 12 }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M14 4l-3 3v3L4 17v3l3 3 7-7h3l3-3z"/></svg>
            ÉPINGLÉ
          </div>
          <div style={{ fontSize: 13.5, color: '#0A1F44', marginTop: 6, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 800 }}>Karim · Mod ·</span> Vide-grenier samedi 11 — inscriptions ouvertes jusqu'à jeudi soir.
          </div>
        </div>

        {/* Regular posts */}
        {[
          { who: 'Sofia M.', avatar: '#C8D2E5', initials: 'SM', when: '2h', txt: 'Quelqu\'un connait un bon plombier sur Pyrénées ? Robinet qui fuit chez moi 😅', likes: 8, comments: 12 },
          { who: 'Aïssata M.', avatar: '#F4B942', initials: 'AM', when: '4h', txt: 'Je donne 2 chaises bistrot en bois — RDV rue Ramponeau ce week-end.', likes: 4, comments: 3 },
          { who: 'Jean D.', avatar: '#6FB89F', initials: 'JD', when: 'hier', txt: 'Le marché du dimanche matin sur Belleville reste imbattable.', likes: 23, comments: 6 },
        ].map((p, i) => (
          <div key={i} style={{ padding: '14px 0', borderBottom: i < 2 ? '1px solid #F0F2F7' : 'none' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.avatar, color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11 }}>{p.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1F44' }}>{p.who} <span style={{ color: '#8993A8', fontWeight: 500 }}>· {p.when}</span></div>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 13.5, color: '#0A1F44', lineHeight: 1.45 }}>{p.txt}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 14, fontSize: 11.5, color: '#4B5B87', fontWeight: 600 }}>
              <span>♥ {p.likes}</span>
              <span>💬 {p.comments}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 03 · Événements du cercle
function CircleEventsScreen() {
  const events = [
    { d: 11, m: 'mai', day: 'sam', t: '10:00', title: 'Vide-grenier', loc: 'Place Fréhel', going: 47, type: 'comm' },
    { d: 14, m: 'mai', day: 'mar', t: '19:30', title: 'Apéro voisins', loc: 'Café chez Lulu', going: 12, type: 'social' },
    { d: 18, m: 'mai', day: 'sam', t: '09:00', title: 'Nettoyage Parc de Belleville', loc: 'Entrée rue Piat', going: 8, type: 'comm' },
    { d: 25, m: 'mai', day: 'sam', t: '15:00', title: 'Fête des voisins', loc: 'Rue de l\'Atlas', going: 89, type: 'social', highlight: true },
    { d: 6, m: 'juin', day: 'ven', t: '20:00', title: 'Projection ciné en plein air', loc: 'Parvis Notre-Dame de la Croix', going: 34, type: 'cult' },
  ];
  const typeColor = { comm: '#6FB89F', social: '#F4B942', cult: '#8B7AB8' };
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', paddingBottom: 24 }}>
      <StatusBarC />

      {/* Header */}
      <div style={{ padding: '6px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FFF', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>
          </div>
          <div style={{ fontSize: 13, color: '#4B5B87', fontWeight: 600 }}>Voisins de Belleville</div>
        </div>
        <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 32, color: '#0A1F44', marginTop: 10, lineHeight: 1.05 }}>
          5 événements à <span style={{ color: '#B88A2A' }}>venir</span>
        </div>
      </div>

      {/* Filter */}
      <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8 }}>
        {[
          { l: 'Tous', sel: true, c: '#0A1F44' },
          { l: '● Communauté', c: '#6FB89F' },
          { l: '● Social', c: '#F4B942' },
          { l: '● Culturel', c: '#8B7AB8' },
        ].map(f => (
          <div key={f.l} style={{
            padding: '6px 11px', borderRadius: 999, fontSize: 11, fontWeight: 700, flexShrink: 0,
            background: f.sel ? '#0A1F44' : '#FFF',
            color: f.sel ? '#FFF8E8' : '#4B5B87',
            border: f.sel ? 'none' : '1px solid #E6E9F0',
          }}>{f.l}</div>
        ))}
      </div>

      {/* Event list */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {events.map((e, i) => (
          <div key={i} style={{
            background: e.highlight ? 'linear-gradient(135deg, #0A1F44, #1F3563)' : '#FFF',
            color: e.highlight ? '#FFF8E8' : '#0A1F44',
            border: e.highlight ? 'none' : '1px solid #E6E9F0',
            borderRadius: 14, padding: 14, display: 'flex', gap: 14, alignItems: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            {e.highlight && <div style={{ position: 'absolute', right: -40, top: -30, opacity: 0.25 }}>{_cArc ? <_cArc size={180} opacity={1} /> : null}</div>}

            {/* Date pill */}
            <div style={{
              width: 56, padding: '10px 0', borderRadius: 12,
              background: e.highlight ? 'rgba(244,185,66,0.2)' : '#F8F9FB',
              border: e.highlight ? '1px solid rgba(244,185,66,0.4)' : '1px solid #E6E9F0',
              textAlign: 'center', flexShrink: 0,
            }}>
              <div style={{ fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: e.highlight ? '#F4B942' : '#B88A2A', fontWeight: 800 }}>{e.day}</div>
              <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 26, lineHeight: 1, marginTop: 2 }}>{e.d}</div>
              <div style={{ fontSize: 9.5, opacity: 0.7, marginTop: 1 }}>{e.m}</div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.2 }}>{e.title}</div>
              <div style={{ fontSize: 11.5, opacity: e.highlight ? 0.75 : 0.65, marginTop: 3, display: 'flex', gap: 8 }}>
                <span>📍 {e.loc}</span>
                <span>· {e.t}</span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex' }}>
                  {['#C8D2E5', '#F4B942', '#6FB89F'].map((bg, k) => (
                    <div key={k} style={{ width: 18, height: 18, borderRadius: '50%', background: bg, border: '2px solid ' + (e.highlight ? '#1F3563' : '#FFF'), marginLeft: k === 0 ? 0 : -6 }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: e.highlight ? '#F4B942' : typeColor[e.type] }}>{e.going} y vont</div>
              </div>
            </div>

            {/* CTA */}
            <div style={{
              padding: '7px 12px', borderRadius: 999,
              background: e.highlight ? '#F4B942' : '#0A1F44',
              color: e.highlight ? '#0A1F44' : '#FFF8E8',
              fontSize: 11, fontWeight: 800, flexShrink: 0,
            }}>+ Y aller</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 04 · Invitation à un cercle
function CircleInviteScreen() {
  return (
    <div style={{ background: '#FFF', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui' }}>
      <StatusBarC />

      {/* Top bar */}
      <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F8F9FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </div>
        <div style={{ fontSize: 12, color: '#8993A8', fontWeight: 700 }}>Invitation</div>
        <div style={{ width: 32 }} />
      </div>

      {/* Hero */}
      <div style={{ padding: '24px 24px 18px', textAlign: 'center' }}>
        <div style={{
          width: 100, height: 100, borderRadius: 24, margin: '0 auto',
          background: 'linear-gradient(135deg, #6FB89F, #4A8E76)',
          color: '#FFF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 50, position: 'relative', overflow: 'hidden',
          boxShadow: '0 12px 28px rgba(111,184,159,0.4)',
        }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.25 }}>{_cArc ? <_cArc size={100} opacity={1} /> : null}</div>
          <span style={{ position: 'relative' }}>👶</span>
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Invitation privée</div>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 32, color: '#0A1F44', marginTop: 8, lineHeight: 1.1 }}>
            Sofia M. t'invite à <span style={{ color: '#B88A2A' }}>Parents 19e</span>
          </div>
        </div>

        {/* Inviter card */}
        <div style={{ marginTop: 16, padding: 12, background: '#F8F9FB', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#C8D2E5', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>SM</div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1F44' }}>Sofia Marchand</div>
            <div style={{ fontSize: 11, color: '#8993A8' }}>Modératrice du cercle</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4B942" strokeWidth="2.4"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
      </div>

      {/* Quote message */}
      <div style={{ padding: '0 24px 22px' }}>
        <div style={{
          padding: 16, background: '#FFF8E8', border: '1px solid rgba(244,185,66,0.3)', borderRadius: 14,
          fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 16.5, color: '#0A1F44', lineHeight: 1.45,
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: 6, left: 10, fontSize: 38, color: 'rgba(244,185,66,0.5)', lineHeight: 1 }}>"</div>
          <div style={{ paddingLeft: 22 }}>
            Je t'ajoute, je sais que tu cherches une crèche pour Léa. Y'a une maman ici qui en a une à céder dans le 11e, elle vient d'en parler.
          </div>
        </div>
      </div>

      {/* Circle facts */}
      <div style={{ padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { l: 'Membres', v: 156 },
          { l: 'Posts/sem', v: 23 },
          { l: 'Événements', v: 4 },
        ].map(s => (
          <div key={s.l} style={{ padding: 12, background: '#F8F9FB', borderRadius: 12, textAlign: 'center', border: '1px solid #E6E9F0' }}>
            <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 22, color: '#0A1F44', lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: '#8993A8', fontWeight: 700, marginTop: 3, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Privacy */}
      <div style={{ margin: '20px 24px 0', padding: '12px 14px', borderRadius: 12, background: '#F8F9FB', border: '1px solid #E6E9F0', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4B5B87" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: 1 }}>
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <div style={{ fontSize: 11.5, color: '#4B5B87', lineHeight: 1.4 }}>
          Ce cercle est <strong style={{ color: '#0A1F44' }}>privé</strong>. Les posts ne sont visibles que par les membres. Tu peux quitter à tout moment.
        </div>
      </div>

      {/* CTAs */}
      <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ padding: '13px 0', textAlign: 'center', background: '#0A1F44', color: '#FFF8E8', borderRadius: 999, fontSize: 14, fontWeight: 800 }}>Rejoindre Parents 19e</div>
        <div style={{ padding: '11px 0', textAlign: 'center', color: '#4B5B87', fontSize: 13, fontWeight: 600 }}>Plus tard</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  CirclesListScreen,
  CircleDetailScreen,
  CircleEventsScreen,
  CircleInviteScreen,
});
