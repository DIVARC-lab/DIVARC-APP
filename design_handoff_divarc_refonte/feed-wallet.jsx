// Wallet / paiements — 4 écrans
// Tokens: navy/gold/cream du repo. Réagit aux Tweaks via [data-divarc].

const _wIcon = window.Icon;
const _wArcDeco = window.ArcDeco;
const _wAvatar = window.Avatar || (({ name, size = 40 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: 'linear-gradient(135deg, #F4B942, #B88A2A)',
    color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: size * 0.36, fontFamily: 'Geist, system-ui',
    flexShrink: 0,
  }}>{(name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}</div>
));

// ─────────────────────────────────────────────────────────────
// Status bar + bottom tab bar (réutilisés du système)
// ─────────────────────────────────────────────────────────────
function StatusBar({ dark }) {
  return (
    <div style={{
      height: 44, padding: '0 22px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', fontFamily: 'Geist, system-ui',
      fontSize: 15, fontWeight: 700, color: dark ? '#FFF8E8' : '#0A1F44',
    }}>
      <div>9:41</div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path d="M0 8h2v3H0zM4 6h2v5H4zM8 4h2v7H8zM12 1h2v10h-2z" fill="currentColor"/>
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path d="M8 2.5C5.7 2.5 3.6 3.4 2 4.9l1.4 1.4C4.6 5 6.2 4.5 8 4.5s3.4.5 4.6 1.8L14 4.9C12.4 3.4 10.3 2.5 8 2.5z" fill="currentColor" opacity="0.85"/>
        </svg>
        <svg width="24" height="11" viewBox="0 0 24 11" fill="none">
          <rect x="0.5" y="0.5" width="20" height="10" rx="2.2" stroke="currentColor" opacity="0.5" fill="none"/>
          <rect x="2" y="2" width="16" height="7" rx="1" fill="currentColor"/>
          <rect x="21" y="3.5" width="1.6" height="4" rx="0.6" fill="currentColor" opacity="0.5"/>
        </svg>
      </div>
    </div>
  );
}

function TabBar({ active = 'wallet' }) {
  const tabs = [
    { id: 'home', label: 'Accueil', icon: 'home' },
    { id: 'market', label: 'Marché', icon: 'shop' },
    { id: 'jobs', label: 'Emploi', icon: 'briefcase' },
    { id: 'wallet', label: 'Wallet', icon: 'wallet' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: '#FFF', borderTop: '1px solid #E6E9F0',
      paddingBottom: 26, paddingTop: 8, display: 'flex',
    }}>
      {tabs.map(t => (
        <div key={t.id} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          color: t.id === active ? '#0A1F44' : '#8993A8',
        }}>
          <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {t.icon === 'home' && <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>}
            {t.icon === 'shop' && <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16l-1.4 12.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8zM8 7V5a4 4 0 0 1 8 0v2"/></svg>}
            {t.icon === 'briefcase' && <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>}
            {t.icon === 'wallet' && <svg viewBox="0 0 24 24" width="22" height="22" fill={t.id === active ? '#F4B942' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v3h-4a2 2 0 0 0 0 4h4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="17" cy="12" r="1" fill="currentColor"/></svg>}
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'Geist, system-ui' }}>{t.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Données mock
// ─────────────────────────────────────────────────────────────
const TXS = [
  { id: 't1', kind: 'in', label: 'Vente · Vélo Peugeot vintage', sub: 'de Karim D.', amount: 180, date: '7 mai · 14:32', tag: 'marketplace' },
  { id: 't2', kind: 'out', label: 'Achat · Lot de livres jeunesse', sub: 'à Sofia M.', amount: -28, date: '6 mai · 09:18', tag: 'marketplace' },
  { id: 't3', kind: 'fee', label: 'Frais service · 2,5%', sub: 'Vente Vélo Peugeot', amount: -4.50, date: '7 mai · 14:32', tag: 'fee' },
  { id: 't4', kind: 'in', label: 'Acompte · Mission graphisme', sub: 'de Bilal & Co', amount: 320, date: '4 mai · 17:02', tag: 'jobs' },
  { id: 't5', kind: 'out', label: 'Virement vers compte', sub: 'BNP Paribas · ••42', amount: -250, date: '2 mai · 10:00', tag: 'payout' },
  { id: 't6', kind: 'in', label: 'Vente · Table en chêne', sub: 'de Aïcha B.', amount: 95, date: '28 avr · 19:48', tag: 'marketplace' },
  { id: 't7', kind: 'in', label: 'Cagnotte · Anniv Mariam', sub: '12 contributeurs', amount: 240, date: '24 avr · 12:11', tag: 'gift' },
  { id: 't8', kind: 'out', label: 'Achat · Tajine Beldi', sub: 'à Hassan T.', amount: -45, date: '20 avr · 16:30', tag: 'marketplace' },
];

function formatEur(n) {
  const sign = n < 0 ? '−' : '+';
  return sign + Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// ─────────────────────────────────────────────────────────────
// 01 · Wallet home
// ─────────────────────────────────────────────────────────────
function WalletHomeScreen() {
  return (
    <div style={{
      background: '#F8F9FB', minHeight: '100%', position: 'relative',
      fontFamily: 'Geist, system-ui, sans-serif', paddingBottom: 90,
    }}>
      <StatusBar />

      {/* Hero balance card */}
      <div style={{ padding: '8px 16px 20px' }}>
        <div style={{
          background: '#0A1F44', color: '#FFF8E8', borderRadius: 22,
          padding: '24px 22px 26px', position: 'relative', overflow: 'hidden',
          minHeight: 200,
        }}>
          <div style={{ position: 'absolute', right: -60, top: -60, opacity: 0.55 }}>
            {_wArcDeco ? <_wArcDeco size={260} opacity={1} /> : <div style={{ width: 260, height: 260, borderRadius: '50%', border: '1px solid rgba(244,185,66,0.4)' }} />}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{
              fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: '#F4B942', fontWeight: 800,
            }}>· Wallet DIVARC</div>
            <div style={{
              fontSize: 10.5, padding: '5px 10px', borderRadius: 999,
              border: '1px solid rgba(244,185,66,0.35)', color: '#F4B942', fontWeight: 700,
              letterSpacing: '0.04em',
            }}>Vérifié · KYC</div>
          </div>

          <div style={{ marginTop: 22, position: 'relative' }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Solde disponible</div>
            <div style={{
              fontFamily: 'Instrument Serif, Georgia, serif',
              fontSize: 64, lineHeight: 1, fontStyle: 'italic',
              letterSpacing: '-0.02em', color: '#FFF8E8',
            }}>
              1&nbsp;247<span style={{ fontSize: 38, opacity: 0.65 }}>,80&nbsp;€</span>
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ color: '#7BC97A' }}>↑ +312,50 €</span>
              <span style={{ opacity: 0.5 }}>cette semaine</span>
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, position: 'relative' }}>
            {[
              { l: 'Recevoir', i: 'down' },
              { l: 'Envoyer', i: 'up' },
              { l: 'Encaisser', i: 'bank' },
            ].map(a => (
              <div key={a.l} style={{
                padding: '12px 8px', borderRadius: 14,
                background: 'rgba(255,248,232,0.08)', border: '1px solid rgba(244,185,66,0.18)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: '#F4B942',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A1F44',
                }}>
                  {a.i === 'down' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>}
                  {a.i === 'up' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>}
                  {a.i === 'bank' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 3l9 5H3z"/></svg>}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 700 }}>{a.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ padding: '0 16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ padding: '14px 14px', background: '#FFF', borderRadius: 14, border: '1px solid #E6E9F0' }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8993A8', fontWeight: 700 }}>Encaissé · mai</div>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 26, color: '#0A1F44', marginTop: 2 }}>+ 740 €</div>
          <div style={{ fontSize: 11, color: '#7BC97A', marginTop: 2, fontWeight: 600 }}>↑ +18% vs avril</div>
        </div>
        <div style={{ padding: '14px 14px', background: '#FFF', borderRadius: 14, border: '1px solid #E6E9F0' }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8993A8', fontWeight: 700 }}>Dépensé · mai</div>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 26, color: '#0A1F44', marginTop: 2 }}>− 73 €</div>
          <div style={{ fontSize: 11, color: '#8993A8', marginTop: 2, fontWeight: 600 }}>2 transactions</div>
        </div>
      </div>

      {/* Activity feed */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 22, color: '#0A1F44' }}>Activité récente</div>
          <div style={{ fontSize: 12, color: '#B88A2A', fontWeight: 700 }}>Tout voir →</div>
        </div>

        <div style={{ background: '#FFF', borderRadius: 18, border: '1px solid #E6E9F0', overflow: 'hidden' }}>
          {TXS.slice(0, 5).map((t, i) => (
            <div key={t.id} style={{
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: i < 4 ? '1px solid #F0F2F7' : 'none',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: t.kind === 'in' ? 'rgba(123,201,122,0.14)' : t.kind === 'fee' ? 'rgba(184,138,42,0.14)' : 'rgba(10,31,68,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.kind === 'in' ? '#3F9F3E' : t.kind === 'fee' ? '#B88A2A' : '#0A1F44',
              }}>
                {t.kind === 'in' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>}
                {t.kind === 'out' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7"/></svg>}
                {t.kind === 'fee' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M16 9l-8 6M9 9.01v.01M15 15.01v.01"/></svg>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1F44', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</div>
                <div style={{ fontSize: 11.5, color: '#8993A8', marginTop: 1 }}>{t.sub} · {t.date}</div>
              </div>
              <div style={{
                fontFamily: 'Instrument Serif', fontStyle: 'italic',
                fontSize: 18, color: t.kind === 'in' ? '#3F9F3E' : '#0A1F44', fontWeight: 500,
              }}>{formatEur(t.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="wallet" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 02 · Historique complet (filtrable)
// ─────────────────────────────────────────────────────────────
function WalletHistoryScreen() {
  // Group by month
  const groups = [
    { m: 'Mai 2026', items: TXS.slice(0, 5), total: '+ 469,00 €' },
    { m: 'Avril 2026', items: TXS.slice(5), total: '+ 290,00 €' },
  ];
  const filters = ['Tout', 'Entrant', 'Sortant', 'Frais'];
  return (
    <div style={{
      background: '#FFF', minHeight: '100%', position: 'relative',
      fontFamily: 'Geist, system-ui, sans-serif', paddingBottom: 90,
    }}>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: '#F8F9FB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.4"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Historique</div>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 24, color: '#0A1F44', lineHeight: 1.05 }}>Toutes tes <span style={{ color: '#B88A2A' }}>transactions</span></div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: '#F8F9FB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.2"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{
        padding: '6px 16px 14px', display: 'flex', gap: 8, overflowX: 'auto',
        scrollbarWidth: 'none', borderBottom: '1px solid #F0F2F7',
      }}>
        {filters.map((f, i) => (
          <div key={f} style={{
            padding: '8px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700,
            background: i === 0 ? '#0A1F44' : '#F8F9FB',
            color: i === 0 ? '#FFF8E8' : '#0A1F44',
            border: i === 0 ? 'none' : '1px solid #E6E9F0',
            whiteSpace: 'nowrap',
          }}>{f}</div>
        ))}
        <div style={{
          padding: '8px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700,
          background: '#FFF8E8', color: '#B88A2A', border: '1px solid rgba(244,185,66,0.45)',
          whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
          Mai 2026
        </div>
      </div>

      {/* Group list */}
      <div style={{ padding: '6px 0' }}>
        {groups.map(g => (
          <div key={g.m}>
            <div style={{
              padding: '14px 16px 6px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            }}>
              <div style={{
                fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
                color: '#0A1F44', fontWeight: 800,
              }}>{g.m}</div>
              <div style={{ fontSize: 12.5, color: '#3F9F3E', fontWeight: 700, fontFamily: 'Instrument Serif', fontStyle: 'italic' }}>{g.total}</div>
            </div>
            {g.items.map(t => (
              <div key={t.id} style={{
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: '1px solid #F0F2F7',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: t.kind === 'in' ? 'rgba(123,201,122,0.14)' : t.kind === 'fee' ? 'rgba(184,138,42,0.14)' : '#F8F9FB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: t.kind === 'in' ? '#3F9F3E' : t.kind === 'fee' ? '#B88A2A' : '#0A1F44',
                  fontSize: 11, fontWeight: 800, letterSpacing: '0.04em',
                }}>
                  {t.tag === 'marketplace' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16l-1.4 12.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8zM8 7V5a4 4 0 0 1 8 0v2"/></svg>}
                  {t.tag === 'jobs' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>}
                  {t.tag === 'fee' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M16 9l-8 6"/></svg>}
                  {t.tag === 'payout' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M12 3l9 5H3z"/></svg>}
                  {t.tag === 'gift' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 7v14M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/></svg>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1F44', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</div>
                  <div style={{ fontSize: 11.5, color: '#8993A8', marginTop: 1 }}>{t.sub}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: 'Instrument Serif', fontStyle: 'italic',
                    fontSize: 17, color: t.kind === 'in' ? '#3F9F3E' : '#0A1F44', fontWeight: 500,
                  }}>{formatEur(t.amount)}</div>
                  <div style={{ fontSize: 10.5, color: '#8993A8', marginTop: 1 }}>{t.date.split(' · ')[1] || t.date}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <TabBar active="wallet" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 03 · Vente reçue (notification post-paiement)
// ─────────────────────────────────────────────────────────────
function WalletSaleScreen() {
  return (
    <div style={{
      background: '#0A1F44', minHeight: '100%', position: 'relative',
      fontFamily: 'Geist, system-ui, sans-serif', color: '#FFF8E8',
      paddingBottom: 16,
    }}>
      <StatusBar dark />

      {/* Close */}
      <div style={{ padding: '4px 16px 12px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,248,232,0.08)', border: '1px solid rgba(244,185,66,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFF8E8" strokeWidth="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '20px 24px 0', position: 'relative', textAlign: 'center' }}>
        <div style={{ position: 'absolute', left: '50%', top: -10, transform: 'translateX(-50%)', opacity: 0.35 }}>
          {_wArcDeco ? <_wArcDeco size={340} opacity={1} /> : null}
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 70, height: 70, margin: '0 auto', borderRadius: '50%', background: '#F4B942',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 12px rgba(244,185,66,0.18)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
          </div>
          <div style={{
            marginTop: 22, fontSize: 11, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: '#F4B942', fontWeight: 800,
          }}>· Paiement reçu</div>
          <div style={{
            marginTop: 6, fontFamily: 'Instrument Serif, Georgia, serif',
            fontSize: 36, fontStyle: 'italic', lineHeight: 1.05, letterSpacing: '-0.015em',
          }}>+ 180,00 €</div>
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.78, lineHeight: 1.4 }}>
            Karim D. a réglé ta vente.<br />
            Les fonds sont disponibles dans ton wallet.
          </div>
        </div>
      </div>

      {/* Receipt */}
      <div style={{ padding: '28px 16px 0' }}>
        <div style={{
          background: 'rgba(255,248,232,0.06)', border: '1px solid rgba(244,185,66,0.18)',
          borderRadius: 18, padding: '4px 16px',
        }}>
          {[
            { l: 'Article', v: 'Vélo Peugeot vintage', alt: true },
            { l: 'Acheteur', v: <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
              <_wAvatar name="Karim D" size={22} />
              <span>Karim D.</span>
            </div> },
            { l: 'Mode', v: 'Carte ··42 · 3D-Secure' },
            { l: 'Brut', v: '184,50 €' },
            { l: 'Frais service · 2,5%', v: '− 4,50 €', muted: true },
            { l: 'Net crédité', v: '+ 180,00 €', accent: true },
            { l: 'Référence', v: 'DV-2026-0507-A8F3', mono: true, muted: true },
          ].map((r, i) => (
            <div key={i} style={{
              padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              borderBottom: i < 6 ? '1px solid rgba(244,185,66,0.12)' : 'none',
            }}>
              <div style={{ fontSize: 12.5, color: 'rgba(255,248,232,0.6)', fontWeight: 600 }}>{r.l}</div>
              <div style={{
                fontSize: r.accent ? 17 : 13.5,
                fontFamily: r.accent ? 'Instrument Serif' : (r.mono ? 'Geist Mono, ui-monospace, monospace' : 'Geist, system-ui'),
                fontStyle: r.accent ? 'italic' : 'normal',
                fontWeight: r.accent ? 500 : 600,
                color: r.accent ? '#F4B942' : (r.muted ? 'rgba(255,248,232,0.6)' : '#FFF8E8'),
                textAlign: 'right',
              }}>{r.v}</div>
            </div>
          ))}
        </div>

        {/* Acheteur preview */}
        <div style={{
          marginTop: 14, padding: 14, borderRadius: 16,
          background: 'rgba(255,248,232,0.06)', border: '1px solid rgba(244,185,66,0.18)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <_wAvatar name="Karim Diallo" size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Karim Diallo</div>
            <div style={{ fontSize: 11.5, opacity: 0.7 }}>Voisin · Belleville · ★ 4,9 (23 ventes)</div>
          </div>
          <div style={{
            padding: '7px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
            background: 'rgba(244,185,66,0.14)', color: '#F4B942',
            border: '1px solid rgba(244,185,66,0.3)',
          }}>Discuter</div>
        </div>

        {/* CTA */}
        <div style={{
          marginTop: 22, background: '#F4B942', color: '#0A1F44', borderRadius: 14,
          padding: '15px 0', textAlign: 'center', fontSize: 15, fontWeight: 800,
          letterSpacing: '0.01em', boxShadow: '0 8px 24px rgba(244,185,66,0.28)',
        }}>Encaisser sur mon compte →</div>
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'rgba(255,248,232,0.6)', fontWeight: 600 }}>
          Plus tard · garder dans le wallet
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 04 · Encaissement / payout
// ─────────────────────────────────────────────────────────────
function WalletPayoutScreen() {
  const amount = 800;
  const max = 1247.80;
  const pct = (amount / max) * 100;
  return (
    <div style={{
      background: '#FFF', minHeight: '100%', position: 'relative',
      fontFamily: 'Geist, system-ui, sans-serif', paddingBottom: 16,
    }}>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: '8px 16px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: '#F8F9FB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A1F44" strokeWidth="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Encaisser</div>
          <div style={{ fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 22, color: '#0A1F44' }}>Vers ton <span style={{ color: '#B88A2A' }}>compte</span></div>
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        {/* Compte sélectionné */}
        <div style={{
          padding: 16, borderRadius: 16, border: '1.5px solid #0A1F44',
          background: '#FFF', display: 'flex', alignItems: 'center', gap: 14,
          position: 'relative',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: '#0A1F44', color: '#FFF8E8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Instrument Serif', fontStyle: 'italic', fontSize: 18,
          }}>BNP</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1F44' }}>BNP Paribas · Compte courant</div>
            <div style={{ fontSize: 12, color: '#8993A8', marginTop: 2, letterSpacing: '0.05em' }}>FR76 · ···· ···· ··42</div>
          </div>
          <div style={{
            padding: '4px 9px', borderRadius: 999, fontSize: 10.5,
            background: '#FFF8E8', color: '#B88A2A', fontWeight: 800,
            letterSpacing: '0.04em', border: '1px solid rgba(244,185,66,0.35)',
          }}>Par défaut</div>
        </div>
        <div style={{ fontSize: 11.5, color: '#B88A2A', marginTop: 8, fontWeight: 700, letterSpacing: '0.04em' }}>
          + Ajouter un autre compte
        </div>

        {/* Montant */}
        <div style={{ marginTop: 26 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8993A8', fontWeight: 800, textAlign: 'center' }}>Montant à encaisser</div>
          <div style={{
            marginTop: 12, textAlign: 'center', fontFamily: 'Instrument Serif, Georgia, serif',
            fontSize: 72, lineHeight: 1, fontStyle: 'italic', color: '#0A1F44', letterSpacing: '-0.025em',
          }}>
            800<span style={{ color: '#B88A2A', fontSize: 50 }}>,00</span>
            <span style={{ fontSize: 38, color: '#8993A8', marginLeft: 6 }}>€</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: 6, fontSize: 12, color: '#8993A8' }}>
            Disponible : <span style={{ color: '#0A1F44', fontWeight: 700 }}>1&nbsp;247,80 €</span>
          </div>
        </div>

        {/* Slider */}
        <div style={{ marginTop: 24, padding: '0 6px' }}>
          <div style={{
            position: 'relative', height: 6, background: '#F0F2F7', borderRadius: 999,
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: 6,
              width: pct + '%',
              background: 'linear-gradient(90deg, #F4B942, #B88A2A)', borderRadius: 999,
            }} />
            <div style={{
              position: 'absolute', left: pct + '%', top: '50%', transform: 'translate(-50%,-50%)',
              width: 26, height: 26, borderRadius: '50%', background: '#0A1F44',
              border: '4px solid #F4B942',
              boxShadow: '0 4px 12px rgba(10,31,68,0.3)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: '#8993A8', fontWeight: 600 }}>
            <span>0 €</span>
            <span>1 247,80 €</span>
          </div>
        </div>

        {/* Quick % */}
        <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
          {['25 %', '50 %', '75 %', 'Tout'].map((q, i) => (
            <div key={q} style={{
              flex: 1, padding: '10px 0', textAlign: 'center', borderRadius: 10,
              background: i === 1 ? '#FFF8E8' : '#F8F9FB',
              border: i === 1 ? '1px solid rgba(244,185,66,0.45)' : '1px solid #E6E9F0',
              color: i === 1 ? '#B88A2A' : '#0A1F44',
              fontSize: 13, fontWeight: 700,
            }}>{q}</div>
          ))}
        </div>

        {/* Récap */}
        <div style={{
          marginTop: 20, padding: '14px 16px', borderRadius: 14,
          background: '#F8F9FB', border: '1px solid #E6E9F0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#8993A8', marginBottom: 6 }}>
            <span>Frais virement SEPA</span><span style={{ color: '#0A1F44', fontWeight: 600 }}>Gratuit</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#8993A8' }}>
            <span>Délai estimé</span><span style={{ color: '#0A1F44', fontWeight: 600 }}>1 à 2 jours ouvrés</span>
          </div>
        </div>

        {/* CTA */}
        <div style={{
          marginTop: 22, background: '#0A1F44', color: '#FFF8E8', borderRadius: 14,
          padding: '15px 0', textAlign: 'center', fontSize: 15, fontWeight: 800,
        }}>Encaisser 800,00 € →</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  WalletHomeScreen,
  WalletHistoryScreen,
  WalletSaleScreen,
  WalletPayoutScreen,
});
