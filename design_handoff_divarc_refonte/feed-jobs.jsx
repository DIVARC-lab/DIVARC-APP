// Jobs — 3 mobile screens : liste, détail, candidature (apply dialog).
// Reuses Icon, Avatar, ArcDeco from feed-shared.

const J_I = window.Icon;

const J_JOBS = [
  { id: 'j1', t: 'Designer Produit Senior', co: 'Wave', loc: 'Dakar · Hybride', type: 'CDI', exp: 'Senior', sMin: 1800, sMax: 2400, cur: '€', per: 'mois', initials: 'WV', hue: 220, applicants: 24, posted: 'il y a 2 j', cat: 'Design', emoji: '💼', saved: true },
  { id: 'j2', t: 'Développeur Full-Stack (Next.js)', co: 'Yango', loc: 'Remote · Sénégal', type: 'CDI', exp: 'Confirmé', sMin: 1500, sMax: 2200, cur: '€', per: 'mois', initials: 'YG', hue: 30, applicants: 47, posted: 'il y a 4 j', cat: 'Tech', emoji: '💻' },
  { id: 'j3', t: 'Photographe événementiel', co: 'Studio Mawu', loc: 'Dakar · Sur place', type: 'Freelance', exp: 'Junior', sMin: 200, sMax: 350, cur: '€', per: 'jour', initials: 'SM', hue: 280, applicants: 8, posted: 'hier', cat: 'Création', emoji: '📸' },
  { id: 'j4', t: 'Chargé de partenariats marque', co: 'DIVARC Lab', loc: 'Dakar · Hybride', type: 'CDD · 6 mois', exp: 'Confirmé', sMin: 1200, sMax: 1600, cur: '€', per: 'mois', initials: 'DV', hue: 38, applicants: 12, posted: 'il y a 6 h', cat: 'Business', emoji: '🤝', boost: true },
  { id: 'j5', t: 'Community Manager bilingue', co: 'Sokafrica', loc: 'Remote', type: 'CDI', exp: 'Junior', sMin: 800, sMax: 1100, cur: '€', per: 'mois', initials: 'SK', hue: 160, applicants: 31, posted: 'il y a 3 j', cat: 'Marketing', emoji: '🌍' },
];

// ─────────────────────────────────────────────────────────────
// 01 · Jobs liste
// ─────────────────────────────────────────────────────────────
function JobsListScreen() {
  const filters = [
    { l: 'Tout', on: true },
    { l: 'CDI', n: 18 },
    { l: 'Freelance', n: 9 },
    { l: 'Remote', n: 24 },
    { l: 'Hybride', n: 12 },
    { l: 'Junior', n: 7 },
  ];
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90 }}>
      <div style={{ padding: '60px 20px 12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 700 }}>· Emploi</div>
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 38, color: '#0A1F44', margin: '4px 0 0', lineHeight: 1, fontWeight: 400, letterSpacing: '-0.02em' }}>
            Trouve ton prochain <em style={{ fontStyle: 'italic' }}>job</em>.
          </h1>
        </div>
        <button style={{ width: 36, height: 36, borderRadius: 18, background: 'linear-gradient(135deg, #F4B942, #B88A2A)', color: '#0A1F44', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><J_I.plus width={16} height={16} /></button>
      </div>

      {/* search */}
      <div style={{ padding: '4px 20px 12px' }}>
        <div style={{ height: 42, borderRadius: 21, background: '#fff', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, color: '#8696B0', fontSize: 13 }}>
          <J_I.search width={15} height={15} /> Poste, entreprise, lieu…
        </div>
      </div>

      {/* shortcut tabs */}
      <div style={{ padding: '0 20px 14px', display: 'flex', gap: 6 }}>
        {[
          { l: 'Mes candidatures', n: 3, c: '#0A1F44' },
          { l: 'Sauvegardés', n: 5, c: '#B88A2A' },
        ].map(b => (
          <div key={b.l} style={{ flex: 1, padding: 12, borderRadius: 14, background: '#fff', border: '1px solid #E6E9F0' }}>
            <div style={{ fontSize: 11, color: '#8696B0', fontWeight: 600 }}>{b.l}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
              <span style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 22, color: b.c }}>{b.n}</span>
              <span style={{ fontSize: 11, color: '#8696B0' }}>actifs</span>
            </div>
          </div>
        ))}
      </div>

      {/* filters */}
      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {filters.map(f => (
          <div key={f.l} style={{ height: 32, padding: '0 12px', borderRadius: 16, background: f.on ? '#0A1F44' : '#fff', color: f.on ? '#FFF8E8' : '#4B5B87', fontWeight: f.on ? 700 : 500, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, border: f.on ? 'none' : '1px solid #E6E9F0' }}>
            {f.l}{f.n ? <span style={{ fontSize: 10, opacity: 0.6 }}>· {f.n}</span> : null}
          </div>
        ))}
      </div>

      {/* count line */}
      <div style={{ padding: '0 24px 8px', fontSize: 12, color: '#8696B0' }}>{J_JOBS.length} offres actives · trié par pertinence</div>

      {/* job cards */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {J_JOBS.map(j => (
          <div key={j.id} style={{ borderRadius: 18, background: '#fff', border: j.boost ? '1px solid rgba(244,185,66,0.5)' : '1px solid #E6E9F0', padding: 14, position: 'relative', overflow: 'hidden' }}>
            {j.boost ? (
              <div style={{ position: 'absolute', top: 0, right: 0, fontSize: 9, padding: '3px 10px', borderRadius: '0 0 0 10px', background: 'linear-gradient(135deg, #F4B942, #B88A2A)', color: '#0A1F44', fontWeight: 800, letterSpacing: '0.06em' }}>★ MIS EN AVANT</div>
            ) : null}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F1F3F8', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{j.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: 'rgba(10,31,68,0.06)', color: '#4B5B87', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{j.type}</span>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: '#FFF8E8', color: '#B88A2A', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{j.cat}</span>
                </div>
                <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 19, color: '#0A1F44', lineHeight: 1.15, marginTop: 4 }}>{j.t}</div>
                <div style={{ fontSize: 12, color: '#4B5B87', marginTop: 3, fontWeight: 600 }}>{j.co}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#8696B0', marginTop: 6 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><J_I.compass width={11} height={11} />{j.loc}</span>
                  <span>· {j.exp}</span>
                </div>
              </div>
              <button style={{ width: 30, height: 30, borderRadius: 15, background: j.saved ? '#FFF8E8' : '#F1F3F8', color: j.saved ? '#B88A2A' : '#4B5B87', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><J_I.bookmark width={13} height={13} /></button>
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <span style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 16, color: '#0A1F44' }}>{j.sMin}–{j.sMax}{j.cur}</span>
                <span style={{ fontSize: 11, color: '#8696B0', marginLeft: 4 }}>/{j.per}</span>
              </div>
              <div style={{ fontSize: 11, color: '#8696B0' }}>{j.applicants} candidats · {j.posted}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 02 · Job détail
// ─────────────────────────────────────────────────────────────
function JobsDetailScreen() {
  const j = J_JOBS[0];
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 100, position: 'relative' }}>
      <div style={{ padding: '56px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><J_I.arrowLeft width={15} height={15} /></button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><J_I.share width={14} height={14} /></button>
          <button style={{ width: 36, height: 36, borderRadius: 18, background: '#FFF8E8', border: '1px solid rgba(244,185,66,0.4)', color: '#B88A2A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><J_I.bookmark width={14} height={14} /></button>
        </div>
      </div>

      {/* header card */}
      <div style={{ padding: '4px 16px 0' }}>
        <div style={{ borderRadius: 24, background: '#fff', border: '1px solid #E6E9F0', padding: 18, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -60, top: -60, opacity: 0.5 }}><window.ArcDeco size={180} opacity={0.5} /></div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', position: 'relative' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#0A1F44', color: '#FFF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{j.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: 'rgba(10,31,68,0.06)', color: '#4B5B87', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{j.type}</span>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: '#FFF8E8', color: '#B88A2A', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{j.cat}</span>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 6, background: 'rgba(34,197,94,0.12)', color: '#16A34A', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>● Active</span>
              </div>
              <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 26, color: '#0A1F44', lineHeight: 1.05, fontWeight: 400, margin: '8px 0 4px' }}>{j.t}</h1>
              <div style={{ fontSize: 13, color: '#0A1F44', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>{j.co} <span style={{ width: 12, height: 12, borderRadius: 6, background: '#F4B942', color: '#0A1F44', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800 }}>✓</span></div>
            </div>
          </div>

          {/* facts grid */}
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, position: 'relative' }}>
            {[
              { i: 'compass', l: 'Localisation', v: j.loc },
              { i: 'sparkle', l: 'Niveau', v: j.exp },
              { i: 'users', l: 'Candidatures', v: `${j.applicants} reçues` },
              { i: 'clock', l: 'Publiée', v: j.posted },
            ].map(f => {
              const Ic = J_I[f.i] || J_I.sparkle;
              return (
                <div key={f.l} style={{ padding: 10, borderRadius: 12, background: 'rgba(10,31,68,0.03)', border: '1px solid #E6E9F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: '#8696B0', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>
                    <Ic width={10} height={10} /> {f.l}
                  </div>
                  <div style={{ fontSize: 12, color: '#0A1F44', fontWeight: 700, marginTop: 3 }}>{f.v}</div>
                </div>
              );
            })}
          </div>

          {/* salary */}
          <div style={{ marginTop: 12, padding: 14, borderRadius: 16, background: 'linear-gradient(135deg, #FFF8E8, #fff)', border: '1px solid rgba(244,185,66,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, color: '#B88A2A', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Rémunération</div>
              <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 22, color: '#0A1F44', lineHeight: 1, marginTop: 2 }}>{j.sMin}–{j.sMax}{j.cur}<span style={{ fontStyle: 'normal', fontSize: 12, color: '#8696B0', marginLeft: 4 }}>/{j.per}</span></div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: '#0A1F44', color: '#F4B942', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>€</div>
          </div>
        </div>
      </div>

      {/* description */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Description</div>
        <p style={{ fontSize: 14, color: '#2A3D6B', lineHeight: 1.6, margin: '8px 0 0' }}>
          On cherche un·e <strong style={{ color: '#0A1F44' }}>Designer Produit Senior</strong> pour porter la vision de notre app mobile (10M+ utilisateurs). Tu travailleras avec le PM, l&rsquo;eng et le research, du discovery au ship.
        </p>
        <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {['5+ ans en design produit, idéalement mobile', 'Solide en Figma, prototypage et systèmes', 'Anglais courant, à l\u2019aise en remote async', 'Bonus : expérience fintech ou Afrique de l\u2019Ouest'].map(b => (
            <li key={b} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#2A3D6B', lineHeight: 1.5 }}>
              <span style={{ color: '#F4B942', fontWeight: 800, marginTop: 1 }}>✓</span>{b}
            </li>
          ))}
        </ul>
      </div>

      {/* poster */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ padding: 14, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <window.Avatar initials={j.initials} hue={j.hue} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, color: '#8696B0', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Publié par</div>
            <div style={{ fontSize: 14, color: '#0A1F44', fontWeight: 700, marginTop: 1 }}>Awa Diallo · {j.co}</div>
            <div style={{ fontSize: 11, color: '#8696B0' }}>People & Talent · répond en 48h</div>
          </div>
          <button style={{ width: 36, height: 36, borderRadius: 18, background: '#F1F3F8', color: '#0A1F44', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><J_I.message width={14} height={14} /></button>
        </div>
      </div>

      {/* tag bar */}
      <div style={{ padding: '14px 24px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {['Figma', 'Design system', 'Mobile', 'Fintech', 'Remote-friendly'].map(t => (
          <span key={t} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, background: '#fff', border: '1px solid #E6E9F0', color: '#4B5B87', fontWeight: 600 }}>#{t}</span>
        ))}
      </div>

      {/* sticky CTA */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px 28px', background: 'rgba(248,249,251,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid #E6E9F0', display: 'flex', gap: 10 }}>
        <button style={{ width: 48, height: 48, borderRadius: 24, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><J_I.bookmark width={17} height={17} /></button>
        <button style={{ flex: 1, height: 48, borderRadius: 24, background: '#0A1F44', border: 'none', color: '#FFF8E8', fontWeight: 800, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 12px 24px -10px rgba(10,31,68,0.5)' }}>
          <J_I.send width={15} height={15} /> Postuler · 1 clic
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 03 · Apply dialog (sheet)
// ─────────────────────────────────────────────────────────────
function JobsApplyScreen() {
  const j = J_JOBS[0];
  return (
    <div style={{ background: 'rgba(10,31,68,0.4)', minHeight: '100%', position: 'relative', backdropFilter: 'blur(2px)' }}>
      {/* faded backdrop content suggestion */}
      <div style={{ position: 'absolute', inset: 0, padding: 20, opacity: 0.25 }}>
        <div style={{ marginTop: 56, height: 30, width: '50%', borderRadius: 8, background: '#fff' }} />
        <div style={{ marginTop: 12, height: 80, borderRadius: 18, background: '#fff' }} />
        <div style={{ marginTop: 12, height: 60, borderRadius: 14, background: '#fff' }} />
      </div>

      {/* sheet */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#F8F9FB', borderRadius: '28px 28px 0 0', boxShadow: '0 -30px 80px -20px rgba(10,31,68,0.5)', overflow: 'hidden' }}>
        {/* handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E6E9F0' }} />
        </div>

        {/* header */}
        <div style={{ padding: '14px 20px 14px', borderBottom: '1px solid #E6E9F0', background: '#fff', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>Candidature</div>
            <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 22, color: '#0A1F44', lineHeight: 1.1, fontWeight: 400, marginTop: 4 }}>Postuler à <em style={{ fontStyle: 'italic' }}>« {j.t} »</em></div>
            <div style={{ fontSize: 11, color: '#8696B0', marginTop: 4 }}>{j.co} · {j.loc}</div>
          </div>
          <button style={{ width: 32, height: 32, borderRadius: 16, background: '#F1F3F8', border: 'none', color: '#4B5B87', flexShrink: 0, fontSize: 14, fontWeight: 700 }}>×</button>
        </div>

        {/* body */}
        <div style={{ padding: '18px 20px 14px' }}>
          {/* profile preview */}
          <div style={{ padding: 12, borderRadius: 14, background: '#fff', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <window.Avatar initials="MK" hue={38} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#0A1F44', fontWeight: 700 }}>Ton profil DIVARC sera partagé</div>
              <div style={{ fontSize: 11, color: '#8696B0' }}>Mariame K. · Designer · Dakar · ★ 4.8</div>
            </div>
            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: '#FFF8E8', color: '#B88A2A', fontWeight: 800 }}>Voir</span>
          </div>

          {/* message field */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label style={{ fontSize: 11, color: '#0A1F44', fontWeight: 700 }}>Message au recruteur <span style={{ color: '#E0405D' }}>*</span></label>
              <span style={{ fontSize: 10, color: '#8696B0' }}>312 / 2000</span>
            </div>
            <div style={{ marginTop: 6, padding: 12, borderRadius: 14, background: '#fff', border: '1.5px solid #F4B942', boxShadow: '0 0 0 4px rgba(244,185,66,0.12)' }}>
              <div style={{ fontSize: 13, color: '#0A1F44', lineHeight: 1.55 }}>
                Bonjour Awa, je découvre Wave depuis quelques mois et l&rsquo;impact que vous avez sur la diaspora me parle énormément. J&rsquo;ai 6 ans en design produit (dont 3 sur l&rsquo;app mobile de Yango), et je serais ravie d&rsquo;échanger sur la roadmap.
                <span style={{ display: 'inline-block', width: 1, height: 14, background: '#F4B942', marginLeft: 1, verticalAlign: 'middle', animation: 'blink 1s steps(2) infinite' }}>{'\u200B'}</span>
              </div>
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: '#8696B0', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: '#F4B942', color: '#0A1F44', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800 }}>i</span>
              Pourquoi ce poste ? Tes expériences clés ? Ta dispo ?
            </div>
          </div>

          {/* attachment row */}
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {[
              { l: 'Joindre CV', i: 'brief' },
              { l: 'Portfolio', i: 'image' },
            ].map(a => {
              const Ic = J_I[a.i] || J_I.image;
              return (
                <button key={a.l} style={{ flex: 1, height: 38, borderRadius: 12, background: '#fff', border: '1px dashed #B0BACA', color: '#4B5B87', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Ic width={13} height={13} /> {a.l}
                </button>
              );
            })}
          </div>

          {/* dispo */}
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 11, color: '#0A1F44', fontWeight: 700 }}>Disponibilité</label>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Immédiate', 'Sous 1 mois', 'Sous 3 mois', 'À discuter'].map((d, i) => (
                <span key={d} style={{ height: 30, padding: '0 12px', borderRadius: 15, background: i === 1 ? '#0A1F44' : '#fff', color: i === 1 ? '#FFF8E8' : '#4B5B87', fontWeight: i === 1 ? 700 : 500, fontSize: 12, display: 'inline-flex', alignItems: 'center', border: i === 1 ? 'none' : '1px solid #E6E9F0' }}>{d}</span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '12px 20px 28px', background: '#fff', borderTop: '1px solid #E6E9F0', display: 'flex', gap: 10 }}>
          <button style={{ flex: '0 0 auto', height: 46, padding: '0 16px', borderRadius: 23, background: '#fff', border: '1px solid #E6E9F0', color: '#4B5B87', fontWeight: 700, fontSize: 13 }}>Annuler</button>
          <button style={{ flex: 1, height: 46, borderRadius: 23, background: 'linear-gradient(135deg, #F4B942, #B88A2A)', border: 'none', color: '#0A1F44', fontWeight: 800, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 12px 24px -10px rgba(244,185,66,0.6)' }}>
            <J_I.send width={15} height={15} /> Envoyer ma candidature
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { JobsListScreen, JobsDetailScreen, JobsApplyScreen });
