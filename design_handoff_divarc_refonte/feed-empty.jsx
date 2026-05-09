// États vides + erreurs — 5 écrans
// Souvent oubliés mais critiques. Même grammaire que le reste.

const _eArcDeco = window.ArcDeco;

function StatusBarE({ dark }) {
  return (
    <div style={{
      height: 44, padding: '0 22px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', fontFamily: 'Geist, system-ui',
      fontSize: 15, fontWeight: 700, color: dark ? '#FFF8E8' : '#0A1F44',
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

// 01 · Feed vide (premier login, pas encore d'amis)
function EmptyFeedScreen() {
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', paddingBottom: 24 }}>
      <StatusBarE />

      <div style={{ padding: '8px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 28, color: '#0A1F44' }}>DIVARC</div>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FFF', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        </div>
      </div>

      {/* Hero illustration */}
      <div style={{ padding: '24px 24px 0', textAlign: 'center', position: 'relative' }}>
        <div style={{ width: 180, height: 180, margin: '0 auto', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
            {_eArcDeco ? <_eArcDeco size={180} opacity={1} /> : null}
          </div>
          <div style={{
            position: 'absolute', inset: '50% auto auto 50%', transform: 'translate(-50%,-50%)',
            width: 76, height: 76, borderRadius: '50%', background: '#0A1F44',
            color: '#F4B942', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 38,
          }}>·</div>
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <div key={i} style={{
              position: 'absolute', left: '50%', top: '50%',
              width: 32, height: 32, borderRadius: '50%',
              background: i % 2 === 0 ? '#FFF8E8' : '#FFF',
              border: '1.5px solid #E6E9F0',
              transform: `translate(-50%,-50%) rotate(${deg}deg) translateY(-72px) rotate(${-deg}deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: i % 2 === 0 ? '#B88A2A' : '#8993A8',
            }}>{['?', '+', '·', '?', '+', '·'][i]}</div>
          ))}
        </div>

        <div style={{ marginTop: 28, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Bienvenue</div>
        <div style={{ marginTop: 8, fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 34, fontStyle: 'italic', color: '#0A1F44', lineHeight: 1.1, letterSpacing: '-0.015em' }}>
          Ton fil est encore <span style={{ color: '#B88A2A' }}>vide</span>.
        </div>
        <div style={{ marginTop: 10, fontSize: 14, color: '#4B5B87', lineHeight: 1.5, padding: '0 10px' }}>
          Suis 5 personnes ou rejoins un cercle pour voir leurs posts ici. Ou commence par un mot.
        </div>
      </div>

      {/* Suggestions */}
      <div style={{ padding: '28px 16px 0' }}>
        <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8993A8', fontWeight: 800, marginBottom: 10 }}>Pour commencer</div>
        <div style={{ background: '#FFF', borderRadius: 18, border: '1px solid #E6E9F0', overflow: 'hidden' }}>
          {[
            { i: 'pen', t: 'Écrire ton premier post', d: 'Présente-toi à la communauté.', cta: 'Écrire', accent: true },
            { i: 'users', t: 'Rejoindre un cercle', d: '12 cercles près de chez toi.', cta: 'Voir' },
            { i: 'compass', t: 'Explorer le quartier', d: 'Posts publics autour de toi.', cta: 'Explorer' },
          ].map((s, i) => (
            <div key={s.t} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: i < 2 ? '1px solid #F0F2F7' : 'none' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: s.accent ? '#FFF8E8' : '#F8F9FB', color: s.accent ? '#B88A2A' : '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.i === 'pen' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>}
                {s.i === 'users' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
                {s.i === 'compass' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/></svg>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1F44' }}>{s.t}</div>
                <div style={{ fontSize: 12, color: '#8993A8', marginTop: 2 }}>{s.d}</div>
              </div>
              <div style={{
                padding: '6px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 800,
                background: s.accent ? '#0A1F44' : '#F8F9FB',
                color: s.accent ? '#FFF8E8' : '#0A1F44',
                border: s.accent ? 'none' : '1px solid #E6E9F0',
              }}>{s.cta}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 02 · Recherche sans résultat
function EmptySearchScreen() {
  return (
    <div style={{ background: '#FFF', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', paddingBottom: 24 }}>
      <StatusBarE />

      {/* Search bar */}
      <div style={{ padding: '8px 16px 14px' }}>
        <div style={{
          height: 46, borderRadius: 14, background: '#F8F9FB', border: '1px solid #0A1F44',
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span style={{ fontSize: 14, color: '#0A1F44', fontWeight: 600, flex: 1 }}>vélo cargo électrique 75019</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8993A8" strokeWidth="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 16px 14px', display: 'flex', gap: 18, borderBottom: '1px solid #F0F2F7' }}>
        {['Tout', 'Posts', 'Annonces', 'Profils'].map((t, i) => (
          <div key={t} style={{
            padding: '8px 0',
            fontSize: 13, fontWeight: 700,
            color: i === 0 ? '#0A1F44' : '#8993A8',
            borderBottom: i === 0 ? '2px solid #F4B942' : '2px solid transparent',
          }}>{t}</div>
        ))}
      </div>

      {/* Empty state */}
      <div style={{ padding: '40px 28px 0', textAlign: 'center' }}>
        <div style={{
          width: 88, height: 88, margin: '0 auto', borderRadius: '50%',
          background: '#FFF8E8', border: '1.5px solid rgba(244,185,66,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B88A2A" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <div style={{
            position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%',
            background: '#0A1F44', color: '#F4B942', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px solid #FFF',
          }}>?</div>
        </div>

        <div style={{ marginTop: 24, fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 30, fontStyle: 'italic', color: '#0A1F44', lineHeight: 1.1 }}>
          Pas de résultat<br /><span style={{ color: '#B88A2A' }}>pour cette recherche.</span>
        </div>
        <div style={{ marginTop: 10, fontSize: 13.5, color: '#4B5B87', lineHeight: 1.5 }}>
          Essaie avec moins de mots, ou élargis ta zone géographique.
        </div>

        {/* Suggested queries */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8993A8', fontWeight: 800, marginBottom: 10 }}>Essaie plutôt</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {['vélo cargo · Paris', 'vélo électrique 75019', 'cargo électrique', 'Larry vs Dorothée 19e'].map(s => (
              <div key={s} style={{
                padding: '8px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 700,
                background: '#F8F9FB', color: '#0A1F44', border: '1px solid #E6E9F0',
              }}>{s}</div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 28, padding: '14px 16px', background: '#FFF8E8', borderRadius: 14, border: '1px solid rgba(244,185,66,0.4)', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F4B942', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1F44' }}>Créer une alerte</div>
            <div style={{ fontSize: 11.5, color: '#4B5B87', marginTop: 2 }}>On te prévient dès qu'une annonce match.</div>
          </div>
          <div style={{ padding: '6px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 800, background: '#0A1F44', color: '#FFF8E8' }}>Activer</div>
        </div>
      </div>
    </div>
  );
}

// 03 · Offline / pas de connexion
function OfflineScreen() {
  return (
    <div style={{ background: '#0A1F44', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', color: '#FFF8E8', overflow: 'hidden' }}>
      <StatusBarE dark />

      <div style={{ position: 'absolute', right: -120, top: 60, opacity: 0.25 }}>
        {_eArcDeco ? <_eArcDeco size={500} opacity={1} /> : null}
      </div>

      <div style={{ padding: '60px 28px 0', position: 'relative', textAlign: 'center' }}>
        <div style={{
          width: 96, height: 96, margin: '0 auto', borderRadius: '50%',
          background: 'rgba(255,248,232,0.06)', border: '1px solid rgba(244,185,66,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#F4B942" strokeWidth="1.8">
            <path d="M2 8.82a15 15 0 0 1 20 0M5 12.86a10 10 0 0 1 14 0M8.5 16.43a5 5 0 0 1 7 0M12 20h.01" />
            <line x1="2" y1="2" x2="22" y2="22" stroke="#D04C3F" strokeWidth="2.4" />
          </svg>
        </div>
        <div style={{ marginTop: 28, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#F4B942', fontWeight: 800 }}>· Hors ligne</div>
        <h1 style={{ marginTop: 8, fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 42, fontStyle: 'italic', lineHeight: 1.05, letterSpacing: '-0.02em', fontWeight: 400 }}>
          Pas de réseau<br />pour le moment.
        </h1>
        <div style={{ marginTop: 14, fontSize: 14, color: 'rgba(255,248,232,0.7)', lineHeight: 1.5, padding: '0 12px' }}>
          Tes derniers posts sont gardés en cache. Tout sera resynchronisé dès que la connexion revient.
        </div>
      </div>

      {/* Cached items */}
      <div style={{ padding: '32px 16px 0', position: 'relative' }}>
        <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#F4B942', fontWeight: 800, marginBottom: 10 }}>Disponible hors ligne</div>
        <div style={{ background: 'rgba(255,248,232,0.06)', borderRadius: 16, border: '1px solid rgba(244,185,66,0.18)', padding: '4px 16px' }}>
          {[
            { l: 'Tes 12 derniers posts', i: 'feed' },
            { l: 'Tes brouillons', i: 'pen', n: '3' },
            { l: 'Conversations récentes', i: 'msg' },
          ].map((c, i) => (
            <div key={c.l} style={{ padding: '13px 0', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < 2 ? '1px solid rgba(244,185,66,0.12)' : 'none' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(244,185,66,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F4B942' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
              </div>
              <div style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{c.l}</div>
              {c.n && <div style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, background: 'rgba(244,185,66,0.18)', color: '#F4B942', fontWeight: 800 }}>{c.n}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '32px 16px 0', position: 'relative' }}>
        <div style={{
          background: '#F4B942', color: '#0A1F44', borderRadius: 14,
          padding: '15px 0', textAlign: 'center', fontSize: 15, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>
          Réessayer
        </div>
      </div>
    </div>
  );
}

// 04 · 404 (page introuvable)
function NotFoundScreen() {
  return (
    <div style={{ background: '#FFF', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', display: 'flex', flexDirection: 'column' }}>
      <StatusBarE />

      <div style={{ padding: '8px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F8F9FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, pointerEvents: 'none' }}>
          {_eArcDeco ? <_eArcDeco size={340} opacity={1} /> : null}
        </div>

        <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 180, fontWeight: 400, lineHeight: 0.85, color: '#0A1F44', letterSpacing: '-0.04em', position: 'relative' }}>
          4<span style={{ color: '#F4B942' }}>0</span>4
        </div>

        <div style={{ marginTop: 24, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800, position: 'relative' }}>· Introuvable</div>
        <div style={{ marginTop: 8, fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 26, color: '#0A1F44', lineHeight: 1.15, position: 'relative' }}>
          Cette page a pris une <span style={{ color: '#B88A2A' }}>autre direction</span>.
        </div>
        <div style={{ marginTop: 12, fontSize: 13.5, color: '#4B5B87', lineHeight: 1.5, position: 'relative' }}>
          Le contenu a été supprimé, déplacé, ou n'a jamais existé.
        </div>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', position: 'relative' }}>
          <div style={{ background: '#0A1F44', color: '#FFF8E8', borderRadius: 14, padding: '14px 0', textAlign: 'center', fontSize: 14, fontWeight: 800 }}>
            Retour à l'accueil
          </div>
          <div style={{ background: '#FFF', color: '#4B5B87', border: '1px solid #E6E9F0', borderRadius: 14, padding: '14px 0', textAlign: 'center', fontSize: 14, fontWeight: 700 }}>
            Signaler le problème
          </div>
        </div>
      </div>
    </div>
  );
}

// 05 · Erreur serveur (5xx)
function ServerErrorScreen() {
  return (
    <div style={{ background: '#FFF8E8', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', display: 'flex', flexDirection: 'column' }}>
      <StatusBarE />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
        {/* Stripped nav illustration */}
        <div style={{ width: 200, height: 80, position: 'relative', marginBottom: 24 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 14, background: '#FFF', border: '1px solid #E6E9F0', overflow: 'hidden' }}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                position: 'absolute', left: 0, right: 0, top: i * 14,
                height: 6,
                background: i % 2 === 0 ? 'repeating-linear-gradient(45deg, #B88A2A, #B88A2A 4px, transparent 4px, transparent 8px)' : 'transparent',
                opacity: 0.45,
              }} />
            ))}
          </div>
          <div style={{
            position: 'absolute', inset: '50% auto auto 50%', transform: 'translate(-50%,-50%)',
            width: 56, height: 56, borderRadius: '50%', background: '#0A1F44',
            color: '#F4B942', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 28, fontWeight: 400,
            boxShadow: '0 8px 24px rgba(10,31,68,0.2)',
          }}>!</div>
        </div>

        <div style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#D04C3F', fontWeight: 800 }}>· Erreur 503</div>
        <div style={{ marginTop: 10, fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 38, fontStyle: 'italic', color: '#0A1F44', lineHeight: 1.05, letterSpacing: '-0.015em' }}>
          On a un <span style={{ color: '#D04C3F' }}>petit souci</span><br />de notre côté.
        </div>
        <div style={{ marginTop: 14, fontSize: 14, color: '#4B5B87', lineHeight: 1.5 }}>
          Notre équipe est déjà sur le coup. Réessaie dans quelques instants.
        </div>

        {/* Status pill */}
        <div style={{
          marginTop: 24, padding: '8px 14px', borderRadius: 999,
          background: '#FFF', border: '1px solid #E6E9F0',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D04C3F', boxShadow: '0 0 0 4px rgba(208,76,63,0.18)' }} />
          <div style={{ fontSize: 12, color: '#4B5B87', fontWeight: 600 }}>Status mis à jour il y a 2 min</div>
          <div style={{ fontSize: 11.5, color: '#B88A2A', fontWeight: 800, marginLeft: 4 }}>↗</div>
        </div>

        <div style={{ marginTop: 32, width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: '#0A1F44', color: '#FFF8E8', borderRadius: 14, padding: '14px 0', textAlign: 'center', fontSize: 14, fontWeight: 800 }}>
            Réessayer
          </div>
          <div style={{ fontSize: 12.5, color: '#8993A8', fontWeight: 600 }}>
            Code incident : <span style={{ fontFamily: 'Geist Mono, ui-monospace, monospace', color: '#B88A2A' }}>DV-503-7A4F2</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  EmptyFeedScreen,
  EmptySearchScreen,
  OfflineScreen,
  NotFoundScreen,
  ServerErrorScreen,
});
