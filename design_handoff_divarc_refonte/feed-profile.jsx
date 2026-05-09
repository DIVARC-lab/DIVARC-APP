// Public profile — 3 mobile screens : profil principal (posts), tab annonces, tab à propos.
// Reuses Icon, Avatar, ArcDeco, PhotoBlock from feed-shared.

const P_I = window.Icon;

const P_PROFILE = {
  fullName: 'Aïssata Camara',
  username: 'aissata',
  bio: 'Photographe et artisane du verre. Basée à Dakar — je documente la vie de quartier et les ateliers traditionnels. Toujours partante pour un projet collectif.',
  location: 'Dakar, Sénégal',
  memberSince: 'mars 2024',
  founderRank: 142,
  initials: 'AC',
  hue: 38,
  stats: { posts: 38, listings: 6, friends: 412 },
};

const P_POSTS = [
  { id: 'pp1', body: 'Premier rouleau d\u2019argentique scanné. La lumière de fin de journée à la Médina est dingue.', img: { a: '#F4B942', b: '#B88A2A', c: '#0A1F44' }, likes: 84, comments: 12, time: 'il y a 2 j' },
  { id: 'pp2', body: 'Atelier verre soufflé samedi matin chez Mawu — il reste 3 places. RDV à 9h, prévoyez les manches longues.', likes: 31, comments: 8, time: 'il y a 5 j' },
  { id: 'pp3', body: 'Petit thread sur les pigments naturels que j\u2019utilise pour mes clichés argentiques 🎞️', img: { a: '#0A1F44', b: '#F4B942', c: '#FFF8E8' }, likes: 127, comments: 23, time: 'la semaine dernière' },
];

const P_LISTINGS = [
  { id: 'pl1', t: 'Tirage argentique 30×40', p: 80, a: '#F4B942', b: '#B88A2A', c: '#0A1F44', tag: 'Photo' },
  { id: 'pl2', t: 'Vase verre soufflé bleu', p: 65, a: '#142A55', b: '#0A1F44', c: '#F4B942', tag: 'Maison' },
  { id: 'pl3', t: 'Carnet illustré (12 pages)', p: 25, a: '#FFF8E8', b: '#F8CD76', c: '#142A55', tag: 'Livres' },
  { id: 'pl4', t: 'Set de 3 photos encadrées', p: 140, a: '#B88A2A', b: '#0A1F44', c: '#FFF8E8', tag: 'Photo' },
];

// Shared hero (cover + avatar + name + actions)
function ProfileHero({ activeTab }) {
  return (
    <div style={{ background: '#fff' }}>
      {/* cover */}
      <div style={{ height: 140, background: 'linear-gradient(135deg, #0A1F44, #142A55)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
          <window.ArcDeco size={400} opacity={1} />
        </div>
        <div style={{ position: 'absolute', top: 56, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
          <button style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,248,232,0.15)', backdropFilter: 'blur(10px)', color: '#FFF8E8', border: '1px solid rgba(255,248,232,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><P_I.arrowLeft width={15} height={15} /></button>
          <button style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,248,232,0.15)', backdropFilter: 'blur(10px)', color: '#FFF8E8', border: '1px solid rgba(255,248,232,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><P_I.more width={15} height={15} /></button>
        </div>
      </div>

      {/* avatar + identity row */}
      <div style={{ padding: '0 20px 16px', marginTop: -44, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ borderRadius: '50%', padding: 4, background: 'linear-gradient(135deg, #F4B942, #B88A2A)' }}>
            <div style={{ borderRadius: '50%', padding: 3, background: '#fff' }}>
              <window.Avatar initials={P_PROFILE.initials} hue={P_PROFILE.hue} size={76} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            <button style={{ height: 34, padding: '0 10px', borderRadius: 17, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}><P_I.message width={13} height={13} /> Message</button>
            <button style={{ height: 34, padding: '0 14px', borderRadius: 17, background: '#0A1F44', border: 'none', color: '#FFF8E8', fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 5 }}><P_I.plus width={13} height={13} /> Ajouter</button>
          </div>
        </div>

        {/* name */}
        <div style={{ marginTop: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '3px 8px', borderRadius: 8, background: 'rgba(244,185,66,0.18)', color: '#B88A2A', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>★ Fondateur · #{P_PROFILE.founderRank}</span>
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 30, color: '#0A1F44', margin: '6px 0 0', lineHeight: 1.05, fontWeight: 400, letterSpacing: '-0.01em' }}>{P_PROFILE.fullName}</h1>
          <div style={{ fontSize: 13, color: '#8696B0', marginTop: 1 }}>@{P_PROFILE.username}</div>
        </div>

        {/* bio */}
        <p style={{ fontSize: 14, color: '#2A3D6B', lineHeight: 1.5, margin: '12px 0 0', textWrap: 'pretty' }}>{P_PROFILE.bio}</p>

        {/* meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#8696B0', marginTop: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><P_I.compass width={11} height={11} /> {P_PROFILE.location}</span>
          <span>· Membre depuis {P_PROFILE.memberSince}</span>
        </div>

        {/* stats */}
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { l: 'Posts', v: P_PROFILE.stats.posts },
            { l: 'Annonces', v: P_PROFILE.stats.listings },
            { l: 'Amis', v: P_PROFILE.stats.friends },
          ].map(s => (
            <div key={s.l} style={{ padding: 10, borderRadius: 12, background: 'rgba(10,31,68,0.03)', border: '1px solid #E6E9F0', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#8696B0', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>{s.l}</div>
              <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 22, color: '#0A1F44', marginTop: 1, lineHeight: 1 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* tabs */}
      <div style={{ borderTop: '1px solid #E6E9F0', display: 'flex', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
        {[
          { id: 'posts', l: 'Posts', i: 'sparkle' },
          { id: 'annonces', l: 'Annonces', i: 'shop' },
          { id: 'apropos', l: 'À propos', i: 'user' },
        ].map(t => {
          const Ic = P_I[t.i] || P_I.sparkle;
          const on = activeTab === t.id;
          return (
            <div key={t.id} style={{ flex: 1, padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: on ? 800 : 600, color: on ? '#0A1F44' : '#8696B0', borderBottom: on ? '2px solid #F4B942' : '2px solid transparent', position: 'relative' }}>
              <Ic width={13} height={13} /> {t.l}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 01 · profil + posts
function ProfilePostsScreen() {
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90 }}>
      <ProfileHero activeTab="posts" />
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {P_POSTS.map(p => (
          <div key={p.id} style={{ borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <window.Avatar initials={P_PROFILE.initials} hue={P_PROFILE.hue} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#0A1F44', fontWeight: 700 }}>{P_PROFILE.fullName}</div>
                <div style={{ fontSize: 11, color: '#8696B0' }}>{p.time}</div>
              </div>
              <P_I.more width={14} height={14} />
            </div>
            <div style={{ padding: '0 14px 12px', fontSize: 14, color: '#2A3D6B', lineHeight: 1.5 }}>{p.body}</div>
            {p.img ? (
              <div style={{ padding: '0 14px 12px' }}>
                <div style={{ borderRadius: 14, overflow: 'hidden' }}>
                  <window.PhotoBlock a={p.img.a} b={p.img.b} c={p.img.c} aspect="4/3" radius={0} />
                </div>
              </div>
            ) : null}
            <div style={{ padding: '10px 14px', borderTop: '1px solid #F1F3F8', display: 'flex', alignItems: 'center', gap: 14, color: '#4B5B87', fontSize: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><P_I.heart width={13} height={13} /> {p.likes}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><P_I.message width={13} height={13} /> {p.comments}</span>
              <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5 }}><P_I.send width={13} height={13} /> Partager</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 02 · profil + annonces
function ProfileListingsScreen() {
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90 }}>
      <ProfileHero activeTab="annonces" />
      <div style={{ padding: '14px 24px 8px', fontSize: 11, color: '#B88A2A', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>· {P_LISTINGS.length} annonces actives</div>
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {P_LISTINGS.map(l => (
          <div key={l.id} style={{ borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', overflow: 'hidden' }}>
            <div style={{ position: 'relative' }}>
              <window.PhotoBlock a={l.a} b={l.b} c={l.c} aspect="1/1" radius={0} />
              <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, padding: '3px 8px', borderRadius: 8, background: 'rgba(10,31,68,0.6)', backdropFilter: 'blur(8px)', color: '#FFF8E8', fontWeight: 700, letterSpacing: '0.04em' }}>{l.tag.toUpperCase()}</div>
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 16, color: '#0A1F44' }}>{l.p}€</div>
              <div style={{ fontSize: 12, color: '#0A1F44', fontWeight: 600, marginTop: 4, lineHeight: 1.3 }}>{l.t}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 03 · profil + about
function ProfileAboutScreen() {
  const cards = [
    { i: 'sparkle', l: 'Membre depuis', v: P_PROFILE.memberSince },
    { i: 'compass', l: 'Ville', v: P_PROFILE.location },
    { i: 'star', l: 'Rang fondateur', v: `#${P_PROFILE.founderRank}` },
    { i: 'user', l: 'Profil DIVARC', v: `@${P_PROFILE.username}` },
  ];
  const mutuals = [
    { i: 'YL', n: 'Yann Léo', hue: 220 },
    { i: 'MD', n: 'Mariam Diop', hue: 280 },
    { i: 'KS', n: 'Karim S.', hue: 20 },
  ];
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90 }}>
      <ProfileHero activeTab="apropos" />
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {cards.map(c => {
            const Ic = P_I[c.i] || P_I.sparkle;
            return (
              <div key={c.l} style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #E6E9F0' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(10,31,68,0.05)', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic width={14} height={14} /></div>
                <div style={{ fontSize: 9, color: '#8696B0', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, marginTop: 8 }}>{c.l}</div>
                <div style={{ fontSize: 13, color: '#0A1F44', fontWeight: 700, marginTop: 2 }}>{c.v}</div>
              </div>
            );
          })}
        </div>

        {/* mutuals */}
        <div style={{ marginTop: 18, padding: 14, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0' }}>
          <div style={{ fontSize: 11, color: '#B88A2A', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>· Amis en commun · {mutuals.length}</div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mutuals.map(m => (
              <div key={m.n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <window.Avatar initials={m.i} hue={m.hue} size={36} />
                <div style={{ flex: 1, fontSize: 13, color: '#0A1F44', fontWeight: 600 }}>{m.n}</div>
                <button style={{ height: 28, padding: '0 12px', borderRadius: 14, background: '#F1F3F8', border: 'none', color: '#0A1F44', fontSize: 11, fontWeight: 700 }}>Voir</button>
              </div>
            ))}
          </div>
        </div>

        {/* tags / interests */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: '#B88A2A', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0 8px 8px' }}>· Centres d'intérêt</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Photo argentique', 'Verre soufflé', 'Médina', 'Ateliers', 'Pigments naturels', 'Dakar', 'Artisanat'].map(t => (
              <span key={t} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 12, background: '#fff', border: '1px solid #E6E9F0', color: '#4B5B87', fontWeight: 600 }}>#{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProfilePostsScreen, ProfileListingsScreen, ProfileAboutScreen });
