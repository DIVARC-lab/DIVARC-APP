// Extended mobile flow — 8 screens grafted onto the DIVARC system.
// All visuals lean on feed-shared.jsx (Icon, Avatar, ArcDeco, DivarcLogo,
// PhotoBlock). Tokens stay on the navy/gold palette so dark-mode and gold-
// intensity tweaks still apply.

const I = window.Icon;

// ─────────────────────────────────────────────────────────────
// 01 · Onboarding (welcome + value props)
// ─────────────────────────────────────────────────────────────
function OnboardingScreen() {
  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100%', background: '#0A1F44', color: '#FFF8E8', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -40, right: -80, opacity: 0.45 }}><window.ArcDeco size={420} opacity={1} /></div>
      <div style={{ position: 'absolute', bottom: -100, left: -120, opacity: 0.18 }}><window.ArcDeco size={520} opacity={1} /></div>
      <div style={{ position: 'relative', padding: '72px 28px 40px', display: 'flex', flexDirection: 'column', minHeight: 844 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <window.DivarcLogo size={36} />
          <div style={{ fontFamily: 'Instrument Serif', fontSize: 24, letterSpacing: '-0.01em' }}>DIVARC</div>
          <div style={{ marginLeft: 'auto', fontSize: 11, padding: '4px 10px', borderRadius: 999, border: '1px solid rgba(244,185,66,0.35)', color: '#F4B942', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>FR · EN</div>
        </div>
        <div style={{ marginTop: 96 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#F4B942', fontWeight: 800 }}>· Bienvenue</div>
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 56, lineHeight: 1, fontWeight: 400, letterSpacing: '-0.025em', margin: '14px 0 14px' }}>
            Le réseau des <em style={{ fontStyle: 'italic', color: '#F4B942' }}>vrais&nbsp;liens</em>.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: 'rgba(255,248,232,0.78)', margin: 0, maxWidth: 320 }}>
            Tes proches, ton quartier, tes opportunités. Pas d&rsquo;algorithme, pas de pub. Que des humains.
          </p>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { i: 'sparkle', l: 'Feed chronologique', s: 'Tes amis dans l\u2019ordre' },
            { i: 'shop', l: 'Marché local', s: 'Achète, vends, échange' },
            { i: 'brief', l: 'Opportunités', s: 'Jobs partagés par ton réseau' },
          ].map(it => {
            const Icn = I[it.i];
            return (
              <div key={it.i} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 14px', background: 'rgba(255,248,232,0.06)', border: '1px solid rgba(244,185,66,0.18)', borderRadius: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(244,185,66,0.18)', color: '#F4B942', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icn width={16} height={16} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{it.l}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,248,232,0.65)' }}>{it.s}</div>
                </div>
              </div>
            );
          })}

          <button style={{ marginTop: 20, height: 54, borderRadius: 27, border: 'none', background: 'linear-gradient(135deg, #F4B942, #B88A2A)', color: '#0A1F44', fontWeight: 800, fontSize: 16, letterSpacing: '0.01em', boxShadow: '0 16px 36px -10px rgba(244,185,66,0.5)' }}>
            Créer mon compte
          </button>
          <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,248,232,0.65)', paddingTop: 4 }}>J&rsquo;ai déjà un compte · <span style={{ color: '#F4B942', fontWeight: 700 }}>Se connecter</span></div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 02 · Profil utilisateur (vue propre)
// ─────────────────────────────────────────────────────────────
function ProfileSelfScreen() {
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90, position: 'relative' }}>
      {/* hero band */}
      <div style={{ position: 'relative', height: 168, background: 'linear-gradient(135deg, #0A1F44, #142A55)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -60, top: -40, opacity: 0.35 }}><window.ArcDeco size={260} opacity={1} /></div>
        <div style={{ position: 'absolute', top: 56, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,248,232,0.12)', color: '#FFF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}><I.search width={16} height={16} /></div>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,248,232,0.12)', color: '#FFF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}><I.more width={16} height={16} /></div>
        </div>
      </div>

      <div style={{ padding: '0 20px', marginTop: -56, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ padding: 4, borderRadius: 999, background: '#F8F9FB' }}>
            <window.Avatar initials="AM" hue={200} size={96} />
          </div>
          <div style={{ flex: 1, paddingBottom: 6, display: 'flex', gap: 8 }}>
            <button style={{ flex: 1, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', fontWeight: 700, fontSize: 13 }}>Modifier</button>
            <button style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.share width={15} height={15} /></button>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 30, color: '#0A1F44', lineHeight: 1, fontWeight: 400 }}>Amine Maïga</div>
          <div style={{ fontSize: 13, color: '#8696B0', marginTop: 4 }}>@amine · Dakar, SN</div>
          <p style={{ fontSize: 14, color: '#2A3D6B', lineHeight: 1.5, margin: '12px 0 0' }}>
            Designer produit. Studio à <span style={{ color: '#0A1F44', fontWeight: 600 }}>Dakar</span>, projets à Paris. Café avant tout.
          </p>
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          {[
            { v: '348', l: 'amis' },
            { v: '127', l: 'posts' },
            { v: '12', l: 'arcs' },
          ].map(s => (
            <div key={s.l} style={{ flex: 1, padding: '12px 14px', borderRadius: 14, background: '#fff', border: '1px solid #E6E9F0' }}>
              <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 22, color: '#0A1F44', lineHeight: 1, fontStyle: 'italic' }}>{s.v}</div>
              <div style={{ fontSize: 11, color: '#8696B0', marginTop: 2, letterSpacing: '0.04em' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div style={{ marginTop: 22, display: 'flex', gap: 4, padding: 4, background: '#F1F3F8', borderRadius: 16 }}>
          {[
            { k: 'posts', l: 'Posts', on: true },
            { k: 'photos', l: 'Photos' },
            { k: 'arcs', l: 'Arcs' },
            { k: 'aboutyou', l: 'À propos' },
          ].map(t => (
            <div key={t.k} style={{ flex: 1, height: 32, borderRadius: 12, background: t.on ? '#fff' : 'transparent', color: t.on ? '#0A1F44' : '#4B5B87', fontWeight: t.on ? 700 : 500, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: t.on ? '0 1px 2px rgba(10,31,68,0.06)' : 'none' }}>{t.l}</div>
          ))}
        </div>

        {/* photo grid */}
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
          {[
            { a: '#f4b942', b: '#b88a2a', c: '#0a1f44' },
            { a: '#fff8e8', b: '#f8cd76', c: '#142a55' },
            { a: '#142a55', b: '#0a1f44', c: '#f4b942' },
            { a: '#b88a2a', b: '#0a1f44', c: '#fff8e8' },
            { a: '#0a1f44', b: '#f4b942', c: '#fff8e8' },
            { a: '#f8cd76', b: '#b88a2a', c: '#0a1f44' },
            { a: '#142a55', b: '#f4b942', c: '#0a1f44' },
            { a: '#fff8e8', b: '#f4b942', c: '#b88a2a' },
            { a: '#0a1f44', b: '#142a55', c: '#f4b942' },
          ].map((p, i) => (
            <div key={i} style={{ aspectRatio: '1/1' }}><window.PhotoBlock a={p.a} b={p.b} c={p.c} aspect="1/1" radius={2} /></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 03 · Profil public (autre utilisateur)
// ─────────────────────────────────────────────────────────────
function ProfilePublicScreen() {
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90, position: 'relative' }}>
      <div style={{ position: 'relative', height: 168, background: 'linear-gradient(135deg, #B88A2A, #F4B942)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -60, top: -40, opacity: 0.35 }}><window.ArcDeco size={260} opacity={1} gold={false} /></div>
        <div style={{ position: 'absolute', top: 56, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(10,31,68,0.18)', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.arrowLeft width={16} height={16} /></div>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(10,31,68,0.18)', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.more width={16} height={16} /></div>
        </div>
      </div>
      <div style={{ padding: '0 20px', marginTop: -56, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ padding: 4, borderRadius: 999, background: '#F8F9FB' }}>
            <window.Avatar initials="AC" hue={38} size={96} />
          </div>
          <div style={{ flex: 1, paddingBottom: 6, display: 'flex', gap: 8 }}>
            <button style={{ flex: 1, height: 36, borderRadius: 18, background: '#0A1F44', border: 'none', color: '#FFF8E8', fontWeight: 800, fontSize: 13 }}>+ Suivre</button>
            <button style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.message width={15} height={15} /></button>
            <button style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.share width={15} height={15} /></button>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 30, color: '#0A1F44', lineHeight: 1, fontWeight: 400 }}>Aïssata Coulibaly</div>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: '#F4B942', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>✓</div>
          </div>
          <div style={{ fontSize: 13, color: '#8696B0', marginTop: 4 }}>@aissata · Photographe · Dakar</div>
          <p style={{ fontSize: 14, color: '#2A3D6B', lineHeight: 1.5, margin: '12px 0 0' }}>
            Argentique. Lumière du matin. Studio ouvert pour collabs.
          </p>
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(244,185,66,0.14)', border: '1px solid rgba(244,185,66,0.3)', borderRadius: 14 }}>
          <div style={{ display: 'flex' }}>
            {['YL', 'MD', 'OK'].map((c, i) => (
              <div key={i} style={{ marginLeft: i ? -8 : 0 }}><window.Avatar initials={c} hue={[220, 280, 130][i]} size={24} /></div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#0A1F44', fontWeight: 600 }}><span style={{ color: '#B88A2A' }}>Yann, Mariam</span> et 6 autres amis communs</div>
        </div>
        <div style={{ marginTop: 22, display: 'flex', gap: 4, padding: 4, background: '#F1F3F8', borderRadius: 16 }}>
          {[{ l: 'Posts', on: true }, { l: 'Photos' }, { l: 'Marché' }].map((t, i) => (
            <div key={i} style={{ flex: 1, height: 32, borderRadius: 12, background: t.on ? '#fff' : 'transparent', color: t.on ? '#0A1F44' : '#4B5B87', fontWeight: t.on ? 700 : 500, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: t.on ? '0 1px 2px rgba(10,31,68,0.06)' : 'none' }}>{t.l}</div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <window.SagePostCard post={window.POSTS[0]} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 04 · Notifications
// ─────────────────────────────────────────────────────────────
function NotificationsScreen() {
  const groups = [
    { t: 'Aujourd’hui', notifs: [
      { kind: 'like', who: 'Yann Mbaye', initials: 'YL', hue: 220, body: 'a aimé ton post', detail: 'Première session photo dans l’atelier…', time: '14 min', unread: true },
      { kind: 'comment', who: 'Mariam Diop', initials: 'MD', hue: 280, body: 'a commenté ton post', detail: '« Magnifique cadrage 🙌 »', time: '38 min', unread: true },
      { kind: 'follow', who: 'Karim Sidibé', initials: 'KS', hue: 20, body: 's’est abonné·e', detail: '2 amis en commun', time: '1 h', unread: true },
    ]},
    { t: 'Cette semaine', notifs: [
      { kind: 'mention', who: 'Aïssata Coulibaly', initials: 'AC', hue: 38, body: 't’a mentionné·e', detail: '« Mention spéciale à @amine pour les conseils »', time: 'mar.' },
      { kind: 'like', who: 'Léo Marchal', initials: 'LM', hue: 160, body: 'et 12 autres ont aimé ton post', detail: 'Atelier ouvert · samedi', time: 'lun.' },
      { kind: 'job', who: 'Yann Mbaye', initials: 'YL', hue: 220, body: 'a partagé une opportunité', detail: 'Designer produit · Dakar studio', time: 'lun.' },
    ]},
  ];
  const kindIcon = { like: { i: 'heart', c: '#E0405D' }, comment: { i: 'message', c: '#0A1F44' }, follow: { i: 'plus', c: '#B88A2A' }, mention: { i: 'sparkle', c: '#B88A2A' }, job: { i: 'brief', c: '#142A55' } };
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90 }}>
      <div style={{ padding: '60px 20px 14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 700 }}>Activité</div>
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 36, color: '#0A1F44', margin: '4px 0 0', lineHeight: 1, fontWeight: 400, letterSpacing: '-0.02em' }}>
            <em style={{ fontStyle: 'italic' }}>Notifications</em>
          </h1>
        </div>
        <button style={{ height: 32, padding: '0 12px', borderRadius: 16, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', fontSize: 12, fontWeight: 700 }}>Tout marquer lu</button>
      </div>
      <div style={{ padding: '0 16px 6px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {['Tout', 'Mentions', 'Likes', 'Commentaires', 'Abonnements'].map((c, i) => (
          <div key={c} style={{ height: 30, padding: '0 12px', borderRadius: 15, background: i === 0 ? '#0A1F44' : '#fff', color: i === 0 ? '#FFF8E8' : '#4B5B87', fontWeight: i === 0 ? 700 : 500, fontSize: 12, display: 'inline-flex', alignItems: 'center', flexShrink: 0, border: i === 0 ? 'none' : '1px solid #E6E9F0' }}>{c}</div>
        ))}
      </div>
      {groups.map(g => (
        <div key={g.t} style={{ marginTop: 14 }}>
          <div style={{ padding: '6px 24px', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8696B0', fontWeight: 700 }}>{g.t}</div>
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {g.notifs.map((n, i) => {
              const KI = I[kindIcon[n.kind].i];
              return (
                <div key={i} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 16, background: n.unread ? 'rgba(244,185,66,0.1)' : '#fff', border: '1px solid', borderColor: n.unread ? 'rgba(244,185,66,0.3)' : '#E6E9F0', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <window.Avatar initials={n.initials} hue={n.hue} size={42} />
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, background: '#fff', border: `2px solid ${kindIcon[n.kind].c}`, color: kindIcon[n.kind].c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><KI width={10} height={10} {...(n.kind === 'like' ? { filled: true } : {})} /></div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#0A1F44', lineHeight: 1.35 }}><span style={{ fontWeight: 700 }}>{n.who}</span> <span style={{ color: '#4B5B87' }}>{n.body}</span></div>
                    <div style={{ fontSize: 12, color: '#8696B0', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.detail}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#8696B0', flexShrink: 0 }}>{n.time}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 05 · Recherche / Explorer
// ─────────────────────────────────────────────────────────────
function SearchScreen() {
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90 }}>
      <div style={{ padding: '60px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 44, borderRadius: 22, background: '#fff', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, color: '#8696B0', fontSize: 14 }}>
            <I.search width={16} height={16} /> Rechercher amis, posts, lieux…
          </div>
          <button style={{ height: 32, padding: '0 12px', borderRadius: 16, background: 'transparent', border: 'none', color: '#0A1F44', fontWeight: 700, fontSize: 13 }}>Annuler</button>
        </div>
      </div>
      <div style={{ padding: '4px 16px 0', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {['Tout', 'Personnes', 'Posts', 'Marché', 'Jobs', 'Lieux'].map((c, i) => (
          <div key={c} style={{ height: 30, padding: '0 12px', borderRadius: 15, background: i === 0 ? '#0A1F44' : '#fff', color: i === 0 ? '#FFF8E8' : '#4B5B87', fontWeight: i === 0 ? 700 : 500, fontSize: 12, display: 'inline-flex', alignItems: 'center', flexShrink: 0, border: i === 0 ? 'none' : '1px solid #E6E9F0' }}>{c}</div>
        ))}
      </div>

      <div style={{ marginTop: 18, padding: '0 20px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Tendances</div>
        <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 22, color: '#0A1F44', lineHeight: 1, margin: '4px 0 12px' }}>Cette semaine</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { t: '#Dakar', n: 124, c: '#0A1F44' },
            { t: '#PhotoArgentique', n: 87, c: '#B88A2A' },
            { t: '#FreelanceFR', n: 64, c: '#142A55' },
            { t: '#MarchéLocal', n: 41, c: '#F4B942' },
          ].map((t, i) => (
            <div key={t.t} style={{ borderRadius: 16, padding: 14, background: i % 2 ? 'linear-gradient(135deg, #FFF8E8, #fff)' : '#fff', border: '1px solid #E6E9F0', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: 11, color: '#8696B0', fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</div>
              <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 18, color: '#0A1F44', marginTop: 4 }}>{t.t}</div>
              <div style={{ fontSize: 11, color: '#8696B0', marginTop: 4 }}>{t.n} posts cette semaine</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 22, padding: '0 20px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· À découvrir</div>
        <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 22, color: '#0A1F44', lineHeight: 1, margin: '4px 0 12px' }}>Personnes près de toi</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { n: 'Mariam Diop', i: 'MD', hue: 280, mut: '@mariam · 4 amis en commun' },
            { n: 'Karim Sidibé', i: 'KS', hue: 20, mut: '@karim · Photographe · Dakar' },
            { n: 'Ousmane Kane', i: 'OK', hue: 130, mut: '@ousmane · 2 amis en commun' },
          ].map((u, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, background: '#fff', border: '1px solid #E6E9F0' }}>
              <window.Avatar initials={u.i} hue={u.hue} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1F44' }}>{u.n}</div>
                <div style={{ fontSize: 11, color: '#8696B0' }}>{u.mut}</div>
              </div>
              <button style={{ height: 32, padding: '0 14px', borderRadius: 16, border: 'none', background: '#0A1F44', color: '#FFF8E8', fontWeight: 800, fontSize: 12 }}>+ Suivre</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 22, padding: '0 20px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Récherches récentes</div>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column' }}>
          {['atelier photo dakar', 'mariam diop', 'jobs dev react', 'marché plateau'].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '1px solid #E6E9F0' }}>
              <I.refresh width={14} height={14} style={{ color: '#8696B0' }} />
              <span style={{ flex: 1, fontSize: 14, color: '#0A1F44' }}>{s}</span>
              <I.arrowLeft width={14} height={14} style={{ color: '#8696B0', transform: 'rotate(135deg)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 06 · Discussions (liste)
// ─────────────────────────────────────────────────────────────
function MessagesListScreen() {
  const convos = [
    { who: 'Aïssata Coulibaly', initials: 'AC', hue: 38, msg: 'Tu passes au studio demain matin ?', time: '14 min', unread: 2, online: true },
    { who: 'Yann Mbaye', initials: 'YL', hue: 220, msg: 'Tu as vu le brief que je t’ai envoyé ?', time: '38 min', unread: 1, online: true },
    { who: 'Atelier · 4', initials: 'AT', hue: 0, msg: 'Mariam : « C’est bon pour samedi 14h »', time: '1 h', unread: 1, group: true },
    { who: 'Mariam Diop', initials: 'MD', hue: 280, msg: 'Tu : « Parfait, je t’envoie l’adresse »', time: '3 h' },
    { who: 'Karim Sidibé', initials: 'KS', hue: 20, msg: 'Photo super, t’as utilisé quelle pellicule ?', time: 'mar.' },
    { who: 'Léo Marchal', initials: 'LM', hue: 160, msg: 'Yes ça marche pour vendredi.', time: 'lun.' },
  ];
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90 }}>
      <div style={{ padding: '60px 20px 12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 700 }}>Messages</div>
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 36, color: '#0A1F44', margin: '4px 0 0', lineHeight: 1, fontWeight: 400, letterSpacing: '-0.02em' }}><em style={{ fontStyle: 'italic' }}>Discussions</em></h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.search width={15} height={15} /></button>
          <button style={{ width: 36, height: 36, borderRadius: 18, background: 'linear-gradient(135deg, #F4B942, #B88A2A)', color: '#0A1F44', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.plus width={16} height={16} /></button>
        </div>
      </div>
      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 12, overflowX: 'auto' }}>
        {[
          { i: 'AM', n: 'Toi', self: true },
          ...window.STORIES.slice(1, 6).map(s => ({ i: s.initials, n: s.name, hue: s.hue })),
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <window.Avatar initials={s.i} hue={s.self ? 200 : s.hue} size={52} />
              {!s.self && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, background: '#F4B942', border: '2px solid #F8F9FB' }} />}
            </div>
            <div style={{ fontSize: 11, color: '#0A1F44', fontWeight: 500, maxWidth: 56, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.n}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column' }}>
        {convos.map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 4px', borderBottom: '1px solid rgba(10,31,68,0.06)', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <window.Avatar initials={c.initials} hue={c.hue} size={52} />
              {c.online && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, background: '#22C55E', border: '2.5px solid #F8F9FB' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, fontWeight: c.unread ? 700 : 600, color: '#0A1F44', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {c.who}
                  {c.group && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#F1F3F8', color: '#4B5B87', fontWeight: 700 }}>groupe</span>}
                </div>
                <div style={{ fontSize: 11, color: c.unread ? '#B88A2A' : '#8696B0', fontWeight: c.unread ? 700 : 500 }}>{c.time}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <div style={{ flex: 1, fontSize: 13, color: c.unread ? '#0A1F44' : '#8696B0', fontWeight: c.unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.msg}</div>
                {c.unread ? <div style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: '#F4B942', color: '#0A1F44', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{c.unread}</div> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 07 · Chat 1-1
// ─────────────────────────────────────────────────────────────
function ChatScreen() {
  const messages = [
    { from: 'them', t: 'Salut Amine !', time: '14:02' },
    { from: 'them', t: 'Tu passes au studio demain matin ? J’ai monté le set.', time: '14:02' },
    { from: 'me', t: 'Ah génial — oui, vers 9h ?', time: '14:08' },
    { from: 'them', t: 'Parfait. Apporte ton appareil, on teste la pellicule Kodak Gold.', time: '14:09' },
    { from: 'me', t: 'Top. Café avant, comme d’hab ?', time: '14:09' },
    { from: 'them', kind: 'photo', time: '14:11' },
    { from: 'them', t: '☕️ déjà prêt 😄', time: '14:11' },
    { from: 'me', t: 'Tu m’as déjà gagné.', time: '14:12' },
  ];
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* nav bar */}
      <div style={{ padding: '56px 16px 12px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(248,249,251,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #E6E9F0' }}>
        <div style={{ width: 32, height: 32, borderRadius: 16, color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.arrowLeft width={18} height={18} /></div>
        <div style={{ position: 'relative' }}>
          <window.Avatar initials="AC" hue={38} size={36} />
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5, background: '#22C55E', border: '2px solid #F8F9FB' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1F44' }}>Aïssata Coulibaly</div>
          <div style={{ fontSize: 11, color: '#22C55E', fontWeight: 600 }}>en ligne</div>
        </div>
        <button style={{ width: 36, height: 36, borderRadius: 18, background: 'transparent', border: 'none', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.more width={16} height={16} /></button>
      </div>

      <div style={{ flex: 1, padding: '14px 14px 14px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ textAlign: 'center', fontSize: 11, color: '#8696B0', padding: '6px 0 14px' }}>Aujourd&rsquo;hui</div>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
            {m.kind === 'photo' ? (
              <div style={{ width: 220, borderRadius: 18, overflow: 'hidden', border: '1px solid #E6E9F0' }}>
                <window.PhotoBlock a="#f4b942" b="#b88a2a" c="#0a1f44" aspect="4/5" radius={0} />
              </div>
            ) : (
              <div style={{
                maxWidth: '78%',
                padding: '10px 14px',
                borderRadius: 20,
                borderBottomLeftRadius: m.from === 'them' ? 6 : 20,
                borderBottomRightRadius: m.from === 'me' ? 6 : 20,
                background: m.from === 'me' ? 'linear-gradient(135deg, #F4B942, #B88A2A)' : '#fff',
                border: m.from === 'me' ? 'none' : '1px solid #E6E9F0',
                color: m.from === 'me' ? '#0A1F44' : '#0A1F44',
                fontSize: 14,
                lineHeight: 1.4,
                fontWeight: m.from === 'me' ? 600 : 500,
                boxShadow: m.from === 'me' ? '0 6px 16px -8px rgba(244,185,66,0.5)' : '0 1px 2px rgba(10,31,68,0.04)',
              }}>
                {m.t}
              </div>
            )}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
          <div style={{ padding: '10px 14px', borderRadius: 20, borderBottomLeftRadius: 6, background: '#fff', border: '1px solid #E6E9F0', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            {[0, 0.2, 0.4].map(d => (
              <span key={d} style={{ width: 6, height: 6, borderRadius: 3, background: '#8696B0', opacity: 0.4, animation: `dvc-typ 1.2s ${d}s infinite ease-in-out` }} />
            ))}
            <style>{`@keyframes dvc-typ { 0%, 80%, 100% { opacity: 0.3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }`}</style>
          </div>
        </div>
      </div>

      {/* composer */}
      <div style={{ padding: '8px 12px 32px', background: 'rgba(248,249,251,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid #E6E9F0', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.plus width={16} height={16} /></button>
        <div style={{ flex: 1, height: 40, borderRadius: 20, background: '#fff', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', padding: '0 14px', color: '#8696B0', fontSize: 14 }}>Écrire un message…</div>
        <button style={{ width: 40, height: 40, borderRadius: 20, background: 'linear-gradient(135deg, #F4B942, #B88A2A)', border: 'none', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.send width={16} height={16} /></button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 08 · Paramètres
// ─────────────────────────────────────────────────────────────
function SettingsScreen() {
  const groups = [
    { t: 'Compte', items: [
      { i: 'user', l: 'Profil et informations', s: '@amine · amine@divarc.app' },
      { i: 'lock', l: 'Confidentialité', s: 'Amis · contrôle qui te voit' },
      { i: 'wallet', l: 'Wallet et paiements', s: '2 cartes · 1 bénéficiaire', accent: true },
    ]},
    { t: 'Activité', items: [
      { i: 'bell', l: 'Notifications', s: 'Tout activé · son désactivé la nuit' },
      { i: 'message', l: 'Messages', s: 'Demandes filtrées · accusés de lecture on' },
      { i: 'globe', l: 'Langue', s: 'Français (par défaut)', val: 'FR' },
    ]},
    { t: 'Sécurité', items: [
      { i: 'sparkles', l: 'Sessions actives', s: '3 appareils · iPhone · MacBook · iPad' },
      { i: 'refresh', l: 'Mot de passe', s: 'Changé il y a 3 mois' },
    ]},
  ];
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90 }}>
      <div style={{ padding: '60px 20px 18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 700 }}>Réglages</div>
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 36, color: '#0A1F44', margin: '4px 0 0', lineHeight: 1, fontWeight: 400, letterSpacing: '-0.02em' }}><em style={{ fontStyle: 'italic' }}>Paramètres</em></h1>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: 'transparent', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.search width={16} height={16} /></div>
      </div>

      <div style={{ padding: '0 20px 12px' }}>
        <div style={{ borderRadius: 20, background: 'linear-gradient(135deg, #0A1F44, #142A55)', color: '#FFF8E8', padding: 16, display: 'flex', alignItems: 'center', gap: 12, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.4 }}><window.ArcDeco size={140} opacity={1} /></div>
          <window.Avatar initials="AM" hue={200} size={48} />
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 20, fontStyle: 'italic' }}>Amine Maïga</div>
            <div style={{ fontSize: 12, color: 'rgba(255,248,232,0.7)' }}>@amine · membre fondateur</div>
          </div>
          <button style={{ height: 30, padding: '0 12px', borderRadius: 15, background: '#F4B942', color: '#0A1F44', border: 'none', fontWeight: 800, fontSize: 12, position: 'relative' }}>Voir</button>
        </div>
      </div>

      {groups.map(g => (
        <div key={g.t} style={{ marginTop: 12 }}>
          <div style={{ padding: '4px 24px', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8696B0', fontWeight: 700 }}>{g.t}</div>
          <div style={{ margin: '6px 16px 0', borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', overflow: 'hidden' }}>
            {g.items.map((it, idx) => {
              const Icn = I[it.i];
              return (
                <div key={it.l} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderBottom: idx < g.items.length - 1 ? '1px solid #F1F3F8' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: it.accent ? 'rgba(244,185,66,0.18)' : '#F1F3F8', color: it.accent ? '#B88A2A' : '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icn width={16} height={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1F44' }}>{it.l}</div>
                    <div style={{ fontSize: 12, color: '#8696B0', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.s}</div>
                  </div>
                  {it.val ? <div style={{ fontSize: 12, color: '#8696B0', fontWeight: 600 }}>{it.val}</div> : null}
                  <I.arrowLeft width={14} height={14} style={{ color: '#8696B0', transform: 'rotate(180deg)' }} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ padding: '14px 16px 0' }}>
        <button style={{ width: '100%', height: 44, borderRadius: 22, background: '#fff', border: '1px solid rgba(224,64,93,0.3)', color: '#E0405D', fontWeight: 700, fontSize: 14 }}>Se déconnecter</button>
      </div>
      <div style={{ padding: '14px 20px 0', textAlign: 'center', fontSize: 11, color: '#8696B0' }}>DIVARC v1.0 · Beta privée · Dakar</div>
    </div>
  );
}

Object.assign(window, {
  OnboardingScreen, ProfileSelfScreen, ProfilePublicScreen,
  NotificationsScreen, SearchScreen, MessagesListScreen,
  ChatScreen, SettingsScreen,
});
