// Jobs · Mes candidatures + Mes offres (recruteur).
// Reuses Icon, Avatar, ArcDeco from feed-shared.

const JM_I = window.Icon;

const APPLICATIONS = [
  { id: 'a1', title: 'Designer Produit Senior', co: 'Wave', emoji: '💼', initials: 'WV', hue: 220, status: 'pending', tone: 'gold', when: 'il y a 2 j', msg: 'Bonjour Awa, je découvre Wave depuis quelques mois et l\u2019impact que vous avez sur la diaspora me parle énormément. J\u2019ai 6 ans en design produit (dont 3 sur Yango)…' },
  { id: 'a2', title: 'Développeur Full-Stack (Next.js)', co: 'Yango', emoji: '💻', initials: 'YG', hue: 30, status: 'reviewed', tone: 'blue', when: 'il y a 5 j', msg: 'Hello l\u2019équipe, j\u2019ai déjà shipé une app Next 14 + Supabase pour 50k DAU. Stack qui matche pile poil avec ce que vous décrivez dans l\u2019offre.' },
  { id: 'a3', title: 'Photographe événementiel', co: 'Studio Mawu', emoji: '📸', initials: 'SM', hue: 280, status: 'accepted', tone: 'green', when: 'il y a 1 sem.', msg: 'Disponible 3 jours par semaine, portfolio à jour avec 12 mariages cette année. Hâte d\u2019échanger.' },
  { id: 'a4', title: 'Lead Marketing Afrique', co: 'Sokafrica', emoji: '🌍', initials: 'SK', hue: 160, status: 'rejected', tone: 'red', when: 'il y a 2 sem.', msg: 'Bonjour, après 4 ans à Jumia j\u2019aimerais rejoindre une équipe plus petite avec un vrai impact terrain.' },
];

const STATUS_META = {
  pending: { label: 'En attente', tone: 'gold' },
  reviewed: { label: 'Vue par le recruteur', tone: 'blue' },
  accepted: { label: 'Acceptée', tone: 'green' },
  rejected: { label: 'Refusée', tone: 'red' },
};

const TONE_BG = {
  gold: { bg: 'rgba(244,185,66,0.18)', fg: '#B88A2A' },
  blue: { bg: 'rgba(10,31,68,0.06)', fg: '#0A1F44' },
  green: { bg: 'rgba(34,197,94,0.14)', fg: '#16A34A' },
  red: { bg: 'rgba(224,64,93,0.12)', fg: '#E0405D' },
};

// ─────────────────────────────────────────────────────────────
// Mes candidatures
// ─────────────────────────────────────────────────────────────
function JobsAppliedScreen() {
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90 }}>
      <div style={{ padding: '56px 20px 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4B5B87' }}>
          <JM_I.arrowLeft width={13} height={13} /> Emploi
        </div>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 700, marginTop: 14 }}>· Mes candidatures</div>
        <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 38, color: '#0A1F44', margin: '4px 0 0', lineHeight: 1, fontWeight: 400, letterSpacing: '-0.02em' }}>
          Tes <em style={{ fontStyle: 'italic' }}>candidatures</em>.
        </h1>
        <p style={{ fontSize: 13, color: '#4B5B87', marginTop: 6 }}>{APPLICATIONS.length} candidatures envoyées</p>
      </div>

      {/* stat row */}
      <div style={{ padding: '14px 16px 14px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {[
          { l: 'Envoi.', n: APPLICATIONS.length, c: '#0A1F44' },
          { l: 'Vues', n: 1, c: '#0A1F44' },
          { l: 'Accept.', n: 1, c: '#16A34A' },
          { l: 'Refus.', n: 1, c: '#E0405D' },
        ].map(s => (
          <div key={s.l} style={{ padding: 10, borderRadius: 12, background: '#fff', border: '1px solid #E6E9F0', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 22, color: s.c, lineHeight: 1 }}>{s.n}</div>
            <div style={{ fontSize: 10, color: '#8696B0', marginTop: 3, fontWeight: 600 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* applications */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {APPLICATIONS.map(a => {
          const meta = STATUS_META[a.status];
          const tone = TONE_BG[meta.tone];
          const isActive = a.status === 'pending' || a.status === 'reviewed';
          return (
            <div key={a.id} style={{ borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F1F3F8', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{a.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 17, color: '#0A1F44', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: '#4B5B87', fontWeight: 600, marginTop: 2 }}>{a.co}</div>
                  </div>
                </div>
                <span style={{ flexShrink: 0, padding: '4px 8px', borderRadius: 8, fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', background: tone.bg, color: tone.fg }}>
                  {meta.label}
                </span>
              </div>

              <blockquote style={{ marginTop: 10, padding: 10, borderRadius: 12, background: 'rgba(10,31,68,0.03)', border: '1px solid #E6E9F0', fontSize: 12, color: '#4B5B87', lineHeight: 1.5, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                « {a.msg} »
              </blockquote>

              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#8696B0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <JM_I.clock width={11} height={11} /> Envoyée {a.when}
                </span>
                {isActive ? (
                  <button style={{ height: 26, padding: '0 10px', borderRadius: 13, background: '#fff', border: '1px solid #E6E9F0', color: '#E0405D', fontSize: 11, fontWeight: 700 }}>Retirer</button>
                ) : a.status === 'accepted' ? (
                  <button style={{ height: 26, padding: '0 10px', borderRadius: 13, background: '#0A1F44', border: 'none', color: '#FFF8E8', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <JM_I.message width={10} height={10} /> Discuter
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mes offres (recruteur)
// ─────────────────────────────────────────────────────────────
const MY_JOBS = [
  { id: 'mj1', t: 'Chargé de partenariats marque', emoji: '🤝', type: 'CDD · 6 mois', cat: 'Business', loc: 'Dakar · Hybride', sMin: 1200, sMax: 1600, applicants: 12, status: 'active', posted: 'il y a 6 h', new: 4 },
  { id: 'mj2', t: 'Stagiaire Brand Designer', emoji: '🎨', type: 'Stage · 6 mois', cat: 'Design', loc: 'Dakar · Sur place', sMin: 600, sMax: 800, applicants: 27, status: 'active', posted: 'il y a 2 sem.', new: 0 },
  { id: 'mj3', t: 'Lead Growth Afrique de l\u2019Ouest', emoji: '📈', type: 'CDI', cat: 'Marketing', loc: 'Remote', sMin: 2200, sMax: 3000, applicants: 41, status: 'closed', posted: 'il y a 2 mois' },
];

function JobsMineScreen() {
  const active = MY_JOBS.filter(j => j.status === 'active');
  const closed = MY_JOBS.filter(j => j.status !== 'active');
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90 }}>
      <div style={{ padding: '56px 20px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4B5B87' }}>
            <JM_I.arrowLeft width={13} height={13} /> Emploi
          </div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 700, marginTop: 14 }}>· Mes offres</div>
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 36, color: '#0A1F44', margin: '4px 0 0', lineHeight: 1, fontWeight: 400, letterSpacing: '-0.02em' }}>
            Tes <em style={{ fontStyle: 'italic' }}>offres</em>.
          </h1>
          <p style={{ fontSize: 12, color: '#4B5B87', marginTop: 6 }}>{MY_JOBS.length} offres · {active.length} active{active.length > 1 ? 's' : ''}</p>
        </div>
        <button style={{ height: 38, padding: '0 14px', borderRadius: 19, background: 'linear-gradient(135deg, #F4B942, #B88A2A)', border: 'none', color: '#0A1F44', fontWeight: 800, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, boxShadow: '0 8px 18px -8px rgba(244,185,66,0.6)' }}>
          <JM_I.plus width={13} height={13} /> Publier
        </button>
      </div>

      {/* top stats */}
      <div style={{ padding: '14px 16px 6px' }}>
        <div style={{ borderRadius: 18, background: 'linear-gradient(135deg, #0A1F44, #142A55)', color: '#FFF8E8', padding: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -50, bottom: -50, opacity: 0.4 }}><window.ArcDeco size={170} opacity={1} /></div>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#F4B942', fontWeight: 800, position: 'relative' }}>· Cette semaine</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6, position: 'relative' }}>
            <div>
              <span style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 30, lineHeight: 1 }}>4</span>
              <span style={{ fontSize: 12, marginLeft: 6, color: 'rgba(255,248,232,0.7)' }}>nouvelles candidatures</span>
            </div>
            <button style={{ height: 28, padding: '0 12px', borderRadius: 14, background: 'rgba(255,248,232,0.14)', border: 'none', color: '#FFF8E8', fontSize: 11, fontWeight: 700 }}>Voir →</button>
          </div>
        </div>
      </div>

      {/* Active section */}
      <div style={{ padding: '14px 24px 6px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 22, color: '#0A1F44', margin: 0, fontWeight: 400 }}>Actives <span style={{ color: '#8696B0', fontSize: 14 }}>· {active.length}</span></h2>
      </div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {active.map(j => (
          <MyJobCard key={j.id} j={j} />
        ))}
      </div>

      {/* Closed */}
      {closed.length > 0 && (
        <>
          <div style={{ padding: '18px 24px 6px' }}>
            <h2 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 22, color: '#0A1F44', margin: 0, fontWeight: 400 }}>Clôturées <span style={{ color: '#8696B0', fontSize: 14 }}>· {closed.length}</span></h2>
          </div>
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {closed.map(j => (
              <MyJobCard key={j.id} j={j} closed />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MyJobCard({ j, closed }) {
  return (
    <div style={{ borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', padding: 14, opacity: closed ? 0.75 : 1 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F1F3F8', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{j.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: 'rgba(10,31,68,0.06)', color: '#4B5B87', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{j.type}</span>
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: '#FFF8E8', color: '#B88A2A', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{j.cat}</span>
            {closed ? (
              <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: '#0A1F44', color: '#FFF8E8', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Clôturée</span>
            ) : (
              <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: 'rgba(34,197,94,0.14)', color: '#16A34A', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>● Active</span>
            )}
          </div>
          <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 17, color: '#0A1F44', lineHeight: 1.15, marginTop: 4 }}>{j.t}</div>
          <div style={{ fontSize: 11, color: '#8696B0', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><JM_I.compass width={10} height={10} />{j.loc}</span>
            <span>· {j.sMin}–{j.sMax}€</span>
          </div>
        </div>
      </div>

      {/* applicants pill */}
      <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 12, background: j.new > 0 ? 'rgba(244,185,66,0.12)' : 'rgba(10,31,68,0.03)', border: '1px solid', borderColor: j.new > 0 ? 'rgba(244,185,66,0.3)' : '#E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex' }}>
            {['AC', 'YL', 'MD'].slice(0, Math.min(3, j.applicants)).map((c, i) => (
              <div key={i} style={{ marginLeft: i ? -8 : 0 }}><window.Avatar initials={c} hue={[38, 220, 280][i]} size={22} /></div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#0A1F44', fontWeight: 600 }}>
            {j.applicants} candidat{j.applicants > 1 ? 's' : ''}
            {j.new > 0 && <span style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#F4B942', color: '#0A1F44', fontWeight: 800 }}>+{j.new} nouv.</span>}
          </div>
        </div>
        <button style={{ height: 26, padding: '0 10px', borderRadius: 13, background: '#0A1F44', border: 'none', color: '#FFF8E8', fontSize: 11, fontWeight: 700 }}>Voir →</button>
      </div>

      {/* footer actions */}
      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#8696B0' }}>Publiée {j.posted}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {!closed && <button style={{ height: 26, padding: '0 10px', borderRadius: 13, background: '#fff', border: '1px solid #E6E9F0', color: '#4B5B87', fontSize: 11, fontWeight: 700 }}>Modifier</button>}
          <button style={{ width: 26, height: 26, borderRadius: 13, background: '#fff', border: '1px solid #E6E9F0', color: '#4B5B87', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><JM_I.more width={11} height={11} /></button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { JobsAppliedScreen, JobsMineScreen });
