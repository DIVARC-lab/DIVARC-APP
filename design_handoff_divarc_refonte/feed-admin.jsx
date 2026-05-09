// Admin / modération — 4 écrans (mobile-first, même grammaire)

const _aArcDeco = window.ArcDeco;

function StatusBarA({ dark }) {
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
          <rect x="21" y="3.5" width="1.6" height="4" rx="0.6" fill="currentColor" opacity="0.5"/>
        </svg>
      </div>
    </div>
  );
}

// 01 · Dashboard admin
function AdminDashboardScreen() {
  const stats = [
    { l: 'Signalements', v: 12, sub: '+ 4 aujourd\'hui', tone: 'gold' },
    { l: 'Comptes flagués', v: 3, sub: 'À examiner', tone: 'red' },
    { l: 'Posts en file', v: 47, sub: 'Délai moyen 2h', tone: 'navy' },
    { l: 'Modos actifs', v: 8, sub: 'sur 11', tone: 'mute' },
  ];
  const queue = [
    { id: 'r1', kind: 'Post', who: 'Yacine R.', what: 'Spam · liens externes', when: 'il y a 12 min', sev: 'med' },
    { id: 'r2', kind: 'Annonce', who: 'Salima T.', what: 'Produit interdit', when: 'il y a 28 min', sev: 'high' },
    { id: 'r3', kind: 'Profil', who: 'Mohamed B.', what: 'Usurpation', when: 'il y a 1h', sev: 'high' },
    { id: 'r4', kind: 'Commentaire', who: 'Amina K.', what: 'Propos haineux', when: 'il y a 2h', sev: 'high' },
    { id: 'r5', kind: 'Post', who: 'Yasin O.', what: 'Hors sujet · à vérifier', when: 'il y a 3h', sev: 'low' },
  ];
  const sevColor = { high: '#D04C3F', med: '#B88A2A', low: '#8993A8' };
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', paddingBottom: 24 }}>
      <StatusBarA />

      {/* Header */}
      <div style={{ padding: '8px 16px 14px', position: 'relative' }}>
        <div style={{ position: 'absolute', right: -40, top: -20, opacity: 0.18 }}>
          {_aArcDeco ? <_aArcDeco size={220} opacity={1} /> : null}
        </div>
        <div style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Admin</div>
        <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 32, fontStyle: 'italic', color: '#0A1F44', lineHeight: 1.05, marginTop: 4 }}>
          Bonjour <span style={{ color: '#B88A2A' }}>Aïssata</span>.
        </div>
        <div style={{ fontSize: 13, color: '#4B5B87', marginTop: 4 }}>4 nouveaux signalements depuis hier soir.</div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: '0 16px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {stats.map(s => {
          const accent = s.tone === 'gold' ? '#B88A2A' : s.tone === 'red' ? '#D04C3F' : s.tone === 'navy' ? '#0A1F44' : '#8993A8';
          return (
            <div key={s.l} style={{
              padding: '14px 14px', background: '#FFF', borderRadius: 14, border: '1px solid #E6E9F0',
              borderTop: `3px solid ${accent}`,
            }}>
              <div style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8993A8', fontWeight: 700 }}>{s.l}</div>
              <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 32, color: '#0A1F44', marginTop: 4, lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 11, color: accent, marginTop: 4, fontWeight: 700 }}>{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* File de modération */}
      <div style={{ padding: '4px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 22, color: '#0A1F44' }}>File · à examiner</div>
          <div style={{ fontSize: 12, color: '#B88A2A', fontWeight: 700 }}>Tout voir →</div>
        </div>
        <div style={{ background: '#FFF', borderRadius: 16, border: '1px solid #E6E9F0', overflow: 'hidden' }}>
          {queue.map((r, i) => (
            <div key={r.id} style={{
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: i < queue.length - 1 ? '1px solid #F0F2F7' : 'none',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: sevColor[r.sev], flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#0A1F44', color: '#FFF8E8', fontWeight: 700, letterSpacing: '0.04em' }}>{r.kind}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1F44' }}>{r.who}</span>
                </div>
                <div style={{ fontSize: 12.5, color: '#4B5B87', marginTop: 3 }}>{r.what}</div>
                <div style={{ fontSize: 10.5, color: '#8993A8', marginTop: 2 }}>{r.when}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8993A8" strokeWidth="2.4"><path d="M9 6l6 6-6 6"/></svg>
            </div>
          ))}
        </div>
      </div>

      {/* Health bar */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          background: '#0A1F44', color: '#FFF8E8', borderRadius: 16, padding: 16,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -30, bottom: -30, opacity: 0.3 }}>
            {_aArcDeco ? <_aArcDeco size={140} opacity={1} /> : null}
          </div>
          <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#F4B942', fontWeight: 800 }}>· Santé du réseau</div>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 24, marginTop: 4 }}>97 % de posts conformes cette semaine.</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>↑ +1.2 pts vs sem. dernière</div>
        </div>
      </div>
    </div>
  );
}

// 02 · Liste signalements
function AdminReportsScreen() {
  const tabs = ['Tous', 'Posts', 'Annonces', 'Profils', 'Comptes'];
  const reports = [
    { id: 'r1', kind: 'Post', author: 'Yacine R.', reason: 'Spam · liens externes', n: 3, when: '12 min', sev: 'med' },
    { id: 'r2', kind: 'Annonce', author: 'Salima T.', reason: 'Produit interdit', n: 7, when: '28 min', sev: 'high' },
    { id: 'r3', kind: 'Profil', author: 'Mohamed B.', reason: 'Usurpation d\'identité', n: 11, when: '1h', sev: 'high' },
    { id: 'r4', kind: 'Comm.', author: 'Amina K.', reason: 'Propos haineux', n: 5, when: '2h', sev: 'high' },
    { id: 'r5', kind: 'Post', author: 'Yasin O.', reason: 'Hors sujet', n: 2, when: '3h', sev: 'low' },
    { id: 'r6', kind: 'Post', author: 'Karim M.', reason: 'Doublon · suspecté bot', n: 4, when: '4h', sev: 'med' },
    { id: 'r7', kind: 'Annonce', author: 'Fatima D.', reason: 'Fausse description', n: 2, when: '5h', sev: 'low' },
  ];
  const sevBg = { high: 'rgba(208,76,63,0.1)', med: 'rgba(184,138,42,0.12)', low: 'rgba(137,147,168,0.12)' };
  const sevC = { high: '#D04C3F', med: '#B88A2A', low: '#8993A8' };
  return (
    <div style={{ background: '#FFF', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', paddingBottom: 16 }}>
      <StatusBarA />

      {/* Header */}
      <div style={{ padding: '8px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F8F9FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Modération</div>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 22, color: '#0A1F44' }}>Signalements <span style={{ color: '#B88A2A' }}>· 12</span></div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '4px 16px 12px', display: 'flex', gap: 8, overflowX: 'auto', borderBottom: '1px solid #F0F2F7' }}>
        {tabs.map((t, i) => (
          <div key={t} style={{
            padding: '8px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
            background: i === 0 ? '#0A1F44' : '#F8F9FB',
            color: i === 0 ? '#FFF8E8' : '#4B5B87',
            border: i === 0 ? 'none' : '1px solid #E6E9F0',
          }}>{t}</div>
        ))}
      </div>

      {/* Reports */}
      <div>
        {reports.map((r, i) => (
          <div key={r.id} style={{ padding: '14px 16px', borderBottom: i < reports.length - 1 ? '1px solid #F0F2F7' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: sevBg[r.sev], color: sevC[r.sev], fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.sev === 'high' ? 'Haute' : r.sev === 'med' ? 'Moyenne' : 'Faible'}</span>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: '#F8F9FB', color: '#4B5B87', fontWeight: 700, border: '1px solid #E6E9F0' }}>{r.kind}</span>
              <span style={{ fontSize: 10.5, color: '#8993A8', marginLeft: 'auto' }}>il y a {r.when}</span>
            </div>
            <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 17, color: '#0A1F44', lineHeight: 1.2 }}>
              {r.reason}
            </div>
            <div style={{ fontSize: 12.5, color: '#4B5B87', marginTop: 4 }}>
              Par <span style={{ fontWeight: 700, color: '#0A1F44' }}>{r.author}</span> · {r.n} signalement{r.n > 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 03 · Détail signalement (review post)
function AdminReviewScreen() {
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', paddingBottom: 96 }}>
      <StatusBarA />

      {/* Header */}
      <div style={{ padding: '8px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FFF', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, color: '#8993A8', fontWeight: 600 }}>2/12 · Modération</div>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 19, color: '#0A1F44' }}>Détail · annonce</div>
        </div>
        <div style={{ fontSize: 11, padding: '5px 9px', borderRadius: 999, background: 'rgba(208,76,63,0.1)', color: '#D04C3F', fontWeight: 800, letterSpacing: '0.04em' }}>● Haute</div>
      </div>

      {/* Reason summary */}
      <div style={{ padding: '6px 16px 14px' }}>
        <div style={{
          background: '#FFF', borderRadius: 14, padding: 14, border: '1px solid #E6E9F0',
          borderLeft: '3px solid #D04C3F',
        }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D04C3F', fontWeight: 800 }}>· Motif principal</div>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 20, color: '#0A1F44', marginTop: 4 }}>Produit interdit · contrefaçon supposée</div>
          <div style={{ fontSize: 12.5, color: '#4B5B87', marginTop: 6 }}>7 signalements de 6 utilisateurs uniques · 3 « contrefaçon », 2 « arnaque », 2 « autre ».</div>
        </div>
      </div>

      {/* Content snapshot — listing card */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8993A8', fontWeight: 800, marginBottom: 8 }}>Annonce signalée</div>
        <div style={{ background: '#FFF', borderRadius: 16, border: '1px solid #E6E9F0', overflow: 'hidden' }}>
          <div style={{ height: 160, background: 'linear-gradient(135deg, #1F3563, #0A1F44)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,248,232,0.3)', fontSize: 11, letterSpacing: '0.2em' }}>· PHOTO ·</div>
            <div style={{ position: 'absolute', top: 10, left: 10, padding: '4px 9px', borderRadius: 4, background: '#D04C3F', color: '#FFF', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em' }}>SIGNALÉ</div>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 18, color: '#0A1F44' }}>Air Jordan 1 Chicago — Neuves</div>
              <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 18, color: '#B88A2A' }}>120 €</div>
            </div>
            <div style={{ fontSize: 12, color: '#4B5B87', marginTop: 4 }}>Posté il y a 6h · Belleville · 23 vues</div>
            <div style={{ fontSize: 12.5, color: '#4B5B87', marginTop: 8, lineHeight: 1.45 }}>
              "Toute neuves taille 42, jamais portées, vendues sans boîte. Prix négociable, échange possible contre des AF1."
            </div>
          </div>
        </div>
      </div>

      {/* Author card */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8993A8', fontWeight: 800, marginBottom: 8 }}>Auteur</div>
        <div style={{ background: '#FFF', borderRadius: 14, border: '1px solid #E6E9F0', padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #F4B942, #B88A2A)', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>ST</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1F44' }}>Salima T.</div>
            <div style={{ fontSize: 11.5, color: '#8993A8', marginTop: 1 }}>Membre depuis 4 mois · 2 avertissements</div>
          </div>
          <div style={{ fontSize: 11, padding: '5px 9px', borderRadius: 999, background: 'rgba(184,138,42,0.12)', color: '#B88A2A', fontWeight: 700 }}>2 alertes</div>
        </div>
      </div>

      {/* Action bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px 28px',
        background: '#FFF', borderTop: '1px solid #E6E9F0',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
      }}>
        <div style={{
          padding: '12px 0', textAlign: 'center', borderRadius: 12,
          background: '#FFF', border: '1px solid #E6E9F0', color: '#4B5B87',
          fontSize: 12.5, fontWeight: 700,
        }}>Ignorer</div>
        <div style={{
          padding: '12px 0', textAlign: 'center', borderRadius: 12,
          background: '#FFF8E8', border: '1px solid rgba(184,138,42,0.4)', color: '#B88A2A',
          fontSize: 12.5, fontWeight: 800,
        }}>Avertir</div>
        <div style={{
          padding: '12px 0', textAlign: 'center', borderRadius: 12,
          background: '#D04C3F', border: 'none', color: '#FFF',
          fontSize: 12.5, fontWeight: 800,
        }}>Retirer</div>
      </div>
    </div>
  );
}

// 04 · Gestion utilisateurs (ban/warn)
function AdminUsersScreen() {
  const users = [
    { name: 'Yacine R.', handle: '@yacine', status: 'warn', score: 2, joined: '3 mois', last: 'Spam · 2x' },
    { name: 'Salima T.', handle: '@salima_t', status: 'flag', score: 4, joined: '4 mois', last: 'Contrefaçon' },
    { name: 'Mohamed B.', handle: '@mob', status: 'ban', score: 7, joined: '6 mois', last: 'Usurpation' },
    { name: 'Amina K.', handle: '@amina.k', status: 'warn', score: 1, joined: '1 an', last: 'Propos limite' },
    { name: 'Karim M.', handle: '@karimx', status: 'ok', score: 0, joined: '2 ans', last: '—' },
  ];
  const statusMeta = {
    ok: { l: 'Sain', c: '#3F9F3E', bg: 'rgba(123,201,122,0.14)' },
    warn: { l: 'Averti', c: '#B88A2A', bg: 'rgba(184,138,42,0.14)' },
    flag: { l: 'Surveillé', c: '#D04C3F', bg: 'rgba(208,76,63,0.1)' },
    ban: { l: 'Banni', c: '#8993A8', bg: 'rgba(137,147,168,0.18)' },
  };
  return (
    <div style={{ background: '#FFF', minHeight: '100%', position: 'relative', fontFamily: 'Geist, system-ui', paddingBottom: 16 }}>
      <StatusBarA />

      {/* Header */}
      <div style={{ padding: '8px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F8F9FB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Utilisateurs</div>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 22, color: '#0A1F44' }}>Gestion <span style={{ color: '#B88A2A' }}>communauté</span></div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '4px 16px 12px' }}>
        <div style={{
          height: 42, borderRadius: 12, background: '#F8F9FB', border: '1px solid #E6E9F0',
          display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8993A8" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span style={{ fontSize: 13, color: '#8993A8' }}>Pseudo, email, handle…</span>
        </div>
      </div>

      {/* Filter */}
      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {['Tous · 2 412', 'Sains', 'Avertis · 23', 'Surveillés · 7', 'Bannis · 4'].map((f, i) => (
          <div key={f} style={{
            padding: '7px 11px', borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
            background: i === 0 ? '#0A1F44' : '#F8F9FB',
            color: i === 0 ? '#FFF8E8' : '#4B5B87',
            border: i === 0 ? 'none' : '1px solid #E6E9F0',
          }}>{f}</div>
        ))}
      </div>

      {/* Users list */}
      <div>
        {users.map((u, i) => {
          const sm = statusMeta[u.status];
          return (
            <div key={u.handle} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < users.length - 1 ? '1px solid #F0F2F7' : 'none' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #F4B942, #B88A2A)', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, opacity: u.status === 'ban' ? 0.4 : 1 }}>
                  {u.name.split(' ').map(s => s[0]).slice(0, 2).join('')}
                </div>
                {u.score > 0 && (
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2, minWidth: 18, height: 18, padding: '0 5px',
                    background: sm.c, color: '#FFF', borderRadius: 999, fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #FFF',
                  }}>{u.score}</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0A1F44' }}>{u.name}</span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, background: sm.bg, color: sm.c, fontWeight: 800, letterSpacing: '0.04em' }}>{sm.l}</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#8993A8', marginTop: 2 }}>{u.handle} · {u.joined} · {u.last}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8993A8" strokeWidth="2.4"><path d="M9 6l6 6-6 6"/></svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, {
  AdminDashboardScreen,
  AdminReportsScreen,
  AdminReviewScreen,
  AdminUsersScreen,
});
