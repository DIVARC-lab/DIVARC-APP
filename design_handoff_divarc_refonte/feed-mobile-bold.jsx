// Mobile feed — AUDACIEUX variant: pushed identity (arc deco, gold accents,
// italic display lead, FAB, deeper shadows). 4 screens.

function BoldFeedScreen() {
  return (
    <div style={{ background: '#F1F3F8', minHeight: '100%', paddingBottom: 86, position: 'relative' }}>
      {/* Hero header w/ arc */}
      <div style={{ position: 'relative', background: 'linear-gradient(180deg, #FFF8E8 0%, #F1F3F8 100%)', padding: '64px 22px 28px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -60, opacity: 0.55, pointerEvents: 'none' }}>
          <ArcDeco size={260} opacity={1} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <DivarcLogo size={32} />
          <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 24, color: '#0A1F44', letterSpacing: '-0.01em' }}>DIVARC</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <div style={{ width: 38, height: 38, borderRadius: 19, background: '#fff', border: '1px solid rgba(10,31,68,0.06)', boxShadow: '0 1px 2px rgba(10,31,68,0.04)', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.search width={16} height={16} />
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 19, background: '#0A1F44', color: '#FFF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Icon.bell width={16} height={16} />
              <span style={{ position: 'absolute', top: 6, right: 6, width: 9, height: 9, borderRadius: 5, background: '#F4B942', border: '1.5px solid #0A1F44' }} />
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 700 }}>· Le feed</div>
        <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 44, lineHeight: 1, color: '#0A1F44', margin: '10px 0 8px', fontWeight: 400, letterSpacing: '-0.025em' }}>
          Ce que tes proches<br /><em style={{ fontStyle: 'italic', backgroundImage: 'linear-gradient(120deg, #F4B942, #B88A2A)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>racontent</em>.
        </h1>
        <p style={{ fontSize: 13, color: '#2A3D6B', margin: 0, maxWidth: 280 }}>Ordre chronologique strict. Pas d&rsquo;algo, pas de pub.</p>
      </div>

      {/* Stories rail */}
      <div style={{ marginTop: -10, padding: '0 0 12px' }}>
        <div style={{ display: 'flex', gap: 12, padding: '8px 18px', overflowX: 'auto' }}>
          {STORIES.map((s) => (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {s.isSelf ? (
                <div style={{ position: 'relative', width: 70, height: 70, borderRadius: 35, background: '#fff', border: '2px solid #0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Avatar initials={s.initials} hue={200} size={56} />
                  <div style={{ position: 'absolute', bottom: -3, right: -3, width: 26, height: 26, borderRadius: 13, background: '#F4B942', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2.5px solid #F1F3F8', boxShadow: '0 4px 12px rgba(244,185,66,0.5)' }}>
                    <Icon.plus width={13} height={13} />
                  </div>
                </div>
              ) : (
                <div style={{ width: 70, height: 70, borderRadius: 35, padding: 3, background: s.unviewed ? 'conic-gradient(from 200deg, #F4B942, #F8CD76, #B88A2A, #F4B942)' : 'rgba(10,31,68,0.15)', boxShadow: s.unviewed ? '0 6px 18px -4px rgba(244,185,66,0.45)' : 'none' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: 32, padding: 2, background: '#F1F3F8' }}>
                    <Avatar initials={s.initials} hue={s.hue} size={58} />
                  </div>
                </div>
              )}
              <div style={{ fontSize: 11, color: '#142A55', fontWeight: 600, maxWidth: 70, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{s.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Composer chip */}
      <div style={{ margin: '4px 16px 14px', borderRadius: 28, background: '#fff', padding: 16, position: 'relative', boxShadow: '0 1px 2px rgba(10,31,68,0.04), 0 16px 40px -20px rgba(10,31,68,0.18)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 28, width: 60, height: 4, background: '#F4B942', borderRadius: '0 0 4px 4px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar initials="AM" hue={200} size={42} />
          <div style={{ flex: 1, color: '#4B5B87', fontSize: 14 }}>
            <span style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 17, color: '#0A1F44' }}>Quoi de neuf</span>
            <span style={{ color: '#8696B0' }}>, Amine ?</span>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          {[
            { i: Icon.image, l: 'Photo' },
            { i: Icon.sparkles, l: 'Moment' },
            { i: Icon.users, l: 'Amis' },
          ].map((it, idx) => {
            const I = it.i;
            return (
              <div key={idx} style={{ flex: 1, height: 36, borderRadius: 18, background: idx === 0 ? '#FFF8E8' : '#F8F9FB', color: idx === 0 ? '#B88A2A' : '#2A3D6B', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600, fontSize: 12 }}>
                <I width={13} height={13} /> {it.l}
              </div>
            );
          })}
        </div>
      </div>

      {/* Posts */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {POSTS.slice(0, 3).map((p, i) => <BoldPostCard key={p.id} post={p} hero={i === 0} />)}
      </div>

      {/* FAB */}
      <div style={{ position: 'absolute', right: 18, bottom: 100, width: 56, height: 56, borderRadius: 28, background: '#0A1F44', color: '#FFF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px -8px rgba(244,185,66,0.6), 0 4px 12px rgba(10,31,68,0.4)', border: '2px solid #F4B942' }}>
        <Icon.plus width={22} height={22} />
      </div>

      <BoldTabBar active="feed" />
    </div>
  );
}

function BoldPostCard({ post, hero }) {
  // Split body into first sentence (italic display) + rest
  const firstDot = post.body ? post.body.indexOf('.') : -1;
  const firstSentence = firstDot > 0 ? post.body.slice(0, firstDot + 1) : post.body;
  const rest = firstDot > 0 ? post.body.slice(firstDot + 1).trim() : '';

  return (
    <article style={{ borderRadius: 28, background: '#fff', overflow: 'hidden', boxShadow: '0 1px 2px rgba(10,31,68,0.04), 0 20px 50px -28px rgba(10,31,68,0.22)' }}>
      {hero && post.photos.length > 0 ? (
        <PhotoBlock {...post.photos[0]} aspect="16/11" />
      ) : null}

      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px 8px' }}>
        <Avatar initials={post.initials} hue={post.avatarHue} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1F44' }}>{post.author}</div>
          <div style={{ fontSize: 11, color: '#4B5B87', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: '#F4B942' }} />
            <span>{post.time}</span>
            <span>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><VisIcon v={post.visibility} size={11} /> {post.visibility === 'public' ? 'Public' : post.visibility === 'private' ? 'Moi' : 'Amis'}</span>
            {post.pill ? <span style={{ background: 'linear-gradient(135deg, #FFF8E8, #F8CD76)', color: '#B88A2A', padding: '2px 8px', borderRadius: 8, fontWeight: 700, fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{post.pill}</span> : null}
          </div>
        </div>
        <div style={{ color: '#8696B0' }}><Icon.more width={18} height={18} /></div>
      </header>

      {post.body ? (
        <div style={{ padding: '0 18px 14px' }}>
          <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 19, color: '#0A1F44', lineHeight: 1.3, fontWeight: 400 }}>{firstSentence}</div>
          {rest ? <div style={{ fontSize: 13.5, color: '#142A55', marginTop: 6, lineHeight: 1.5 }}>{rest}</div> : null}
        </div>
      ) : null}

      {!hero && post.photos.length > 0 ? (
        <div style={{ padding: '0 18px 14px' }}>
          <PhotoBlock {...post.photos[0]} aspect="16/10" radius={18} />
        </div>
      ) : null}

      <footer style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px 14px' }}>
        <button style={{
          height: 36, padding: '0 14px', borderRadius: 18, border: 'none',
          background: post.liked ? 'linear-gradient(135deg, #FEF2F2, #FFE4E4)' : 'transparent',
          color: post.liked ? '#DC2626' : '#2A3D6B',
          display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13,
        }}>
          <Icon.heart width={16} height={16} filled={post.liked} />
          {post.likes}
        </button>
        <button style={{ height: 36, padding: '0 12px', borderRadius: 18, border: 'none', background: 'transparent', color: '#2A3D6B', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
          <Icon.message width={16} height={16} /> {post.comments}
        </button>
        <button style={{ height: 36, padding: '0 10px', borderRadius: 18, border: 'none', background: 'transparent', color: '#2A3D6B', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
          <Icon.share width={15} height={15} />
        </button>
        <div style={{ marginLeft: 'auto', height: 36, padding: '0 12px', borderRadius: 18, background: '#FFF8E8', color: '#B88A2A', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12 }}>
          <Icon.bookmark width={14} height={14} /> Sauver
        </div>
      </footer>
    </article>
  );
}

function BoldTabBar({ active }) {
  const items = [
    { k: 'home', l: 'Accueil', i: Icon.home },
    { k: 'explore', l: 'Découvrir', i: Icon.compass },
    { k: 'feed', l: 'Feed', i: Icon.sparkle },
    { k: 'msg', l: 'Messages', i: Icon.msg },
    { k: 'me', l: 'Profil', i: Icon.user },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 24 }}>
      <div style={{ margin: '0 14px', borderRadius: 32, background: 'rgba(10,31,68,0.96)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 24px 60px -16px rgba(10,31,68,0.5)', display: 'flex', justifyContent: 'space-around', padding: '12px 8px' }}>
        {items.map(it => {
          const I = it.i;
          const on = it.k === active;
          return (
            <div key={it.k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: on ? '#F4B942' : 'rgba(255,248,232,0.55)', position: 'relative', minWidth: 50 }}>
              <I width={20} height={20} />
              <div style={{ fontSize: 10, fontWeight: on ? 700 : 500 }}>{it.l}</div>
              {on ? <div style={{ position: 'absolute', top: -12, width: 22, height: 3, borderRadius: 2, background: '#F4B942', boxShadow: '0 0 12px #F4B942' }} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BoldStoryScreen() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0A1F44', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0 }}><PhotoBlock a="#f4b942" b="#b88a2a" c="#0a1f44" aspect="9/16" /></div>
      {/* gradient veil */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,31,68,0.55) 0%, rgba(10,31,68,0) 35%, rgba(10,31,68,0) 60%, rgba(10,31,68,0.85) 100%)' }} />
      {/* arc deco */}
      <div style={{ position: 'absolute', top: 120, right: -120, opacity: 0.3 }}><ArcDeco size={400} opacity={1} /></div>
      {/* progress */}
      <div style={{ position: 'absolute', top: 56, left: 12, right: 12, display: 'flex', gap: 4 }}>
        {[1,2,3].map((i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: i === 2 ? '#F4B942' : '#fff', width: i === 1 ? '100%' : i === 2 ? '60%' : '0%', boxShadow: i === 2 ? '0 0 8px #F4B942' : 'none' }} />
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 70, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
        <div style={{ padding: 2, borderRadius: 22, background: 'conic-gradient(from 200deg, #F4B942, #F8CD76, #B88A2A, #F4B942)' }}>
          <Avatar initials="AC" hue={38} size={36} ring={1} ringColor="#0A1F44" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Aïssata Coulibaly</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>il y a 2 h · Atelier</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon.more width={18} height={18} />
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 140, left: 24, right: 60, color: '#fff' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#F4B942', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>·  Story</div>
        <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 32, lineHeight: 1.1, fontStyle: 'italic', textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}>
          Le matin dans<br />l&rsquo;atelier.
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 50, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 46, borderRadius: 23, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', padding: '0 18px', color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Répondre à Aïssata…</div>
        <div style={{ width: 46, height: 46, borderRadius: 23, background: '#F4B942', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px -4px rgba(244,185,66,0.7)' }}>
          <Icon.heart width={20} height={20} />
        </div>
      </div>
    </div>
  );
}

function BoldComposerScreen() {
  return (
    <div style={{ background: '#F1F3F8', minHeight: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.25, pointerEvents: 'none' }}><ArcDeco size={220} opacity={1} /></div>
      <div style={{ padding: '56px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ width: 38, height: 38, borderRadius: 19, background: '#fff', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A1F44' }}>
          <Icon.arrowLeft width={16} height={16} />
        </div>
        <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 20, color: '#0A1F44', fontStyle: 'italic' }}>Nouveau post</div>
        <button style={{ height: 38, padding: '0 18px', borderRadius: 19, border: 'none', background: 'linear-gradient(135deg, #F4B942, #B88A2A)', color: '#0A1F44', fontWeight: 700, fontSize: 13, boxShadow: '0 8px 20px -8px rgba(244,185,66,0.7)' }}>Publier</button>
      </div>

      <div style={{ margin: '14px 14px 0', borderRadius: 28, background: '#fff', padding: 18, position: 'relative', boxShadow: '0 20px 50px -24px rgba(10,31,68,0.22)' }}>
        <div style={{ position: 'absolute', top: 0, left: 32, width: 64, height: 4, background: '#F4B942', borderRadius: '0 0 4px 4px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <Avatar initials="AM" hue={200} size={42} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1F44' }}>Amine Maïga</div>
            <div style={{ marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#FFF8E8', borderRadius: 10, fontSize: 11, color: '#B88A2A', fontWeight: 700 }}>
              <Icon.users width={11} height={11} /> Amis
              <Icon.chevDown width={10} height={10} />
            </div>
          </div>
        </div>

        <div style={{ fontSize: 16, color: '#0A1F44', lineHeight: 1.55, minHeight: 60 }}>
          <span style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 19 }}>Première session photo dans l&rsquo;atelier ce week-end.</span>
          <span style={{ borderLeft: '2px solid #F4B942', marginLeft: 2, height: 18, display: 'inline-block', verticalAlign: 'middle' }} />
        </div>

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <PhotoBlock a="#f4b942" b="#b88a2a" c="#0a1f44" aspect="1/1" radius={16} />
          <PhotoBlock a="#fff8e8" b="#f8cd76" c="#142a55" aspect="1/1" radius={16} />
        </div>
      </div>

      <div style={{ margin: '14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { i: Icon.image, l: 'Photos · 2/4', on: true },
          { i: Icon.sparkles, l: 'Moment' },
          { i: Icon.compass, l: 'Lieu' },
        ].map((it, idx) => {
          const I = it.i;
          return (
            <div key={idx} style={{ height: 36, padding: '0 14px', borderRadius: 18, background: it.on ? '#0A1F44' : '#fff', color: it.on ? '#FFF8E8' : '#2A3D6B', border: it.on ? 'none' : '1px solid #E6E9F0', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
              <I width={13} height={13} /> {it.l}
            </div>
          );
        })}
        <div style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: 11, color: '#6B7280' }}>62/4000</div>
      </div>
    </div>
  );
}

function BoldDetailScreen() {
  const post = POSTS[0];
  return (
    <div style={{ background: '#F1F3F8', minHeight: '100%', paddingBottom: 92, position: 'relative' }}>
      {/* Hero header w/ photo */}
      <div style={{ position: 'relative', height: 240, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}><PhotoBlock {...post.photos[0]} aspect="auto" /></div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,31,68,0.55) 0%, rgba(10,31,68,0) 35%, rgba(10,31,68,0) 65%, rgba(10,31,68,0.95) 100%)' }} />
        <div style={{ position: 'absolute', top: 56, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ width: 38, height: 38, borderRadius: 19, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A1F44' }}>
            <Icon.arrowLeft width={16} height={16} />
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 19, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Icon.more width={18} height={18} />
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 16, left: 18, right: 18, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: 2, borderRadius: 22, background: 'conic-gradient(from 200deg, #F4B942, #F8CD76, #B88A2A, #F4B942)' }}>
            <Avatar initials={post.initials} hue={post.avatarHue} size={36} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{post.author}</div>
            <div style={{ fontSize: 11, opacity: 0.85, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: 3, background: '#F4B942' }} /> {post.time}
            </div>
          </div>
          <button style={{ height: 32, padding: '0 14px', borderRadius: 16, border: '1.5px solid #F4B942', background: 'transparent', color: '#F4B942', fontWeight: 700, fontSize: 12 }}>Suivre</button>
        </div>
      </div>

      <div style={{ margin: '-14px 16px 0', borderRadius: 24, background: '#fff', padding: 18, position: 'relative', boxShadow: '0 20px 50px -28px rgba(10,31,68,0.22)' }}>
        <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 21, color: '#0A1F44', lineHeight: 1.3 }}>Première session photo dans l&rsquo;atelier ce week-end.</div>
        <div style={{ fontSize: 14, color: '#142A55', marginTop: 8, lineHeight: 1.55 }}>La lumière du matin, c&rsquo;est vraiment autre chose. Mention spéciale à <span style={{ color: '#B88A2A', fontWeight: 600 }}>@yann</span> pour les conseils.</div>

        <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
          <button style={{ height: 38, padding: '0 14px', borderRadius: 19, border: 'none', background: 'linear-gradient(135deg, #FEF2F2, #FFE4E4)', color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
            <Icon.heart width={15} height={15} filled /> {post.likes}
          </button>
          <button style={{ height: 38, padding: '0 14px', borderRadius: 19, border: 'none', background: '#F1F3F8', color: '#0A1F44', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
            <Icon.message width={15} height={15} /> {post.comments}
          </button>
          <button style={{ height: 38, padding: '0 14px', borderRadius: 19, border: 'none', background: '#F1F3F8', color: '#0A1F44', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 }}>
            <Icon.share width={14} height={14} />
          </button>
        </div>
      </div>

      <div style={{ margin: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
          <h3 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 22, color: '#0A1F44', margin: 0, fontWeight: 400 }}>Commentaires</h3>
          <div style={{ height: 22, padding: '0 8px', borderRadius: 11, background: '#0A1F44', color: '#FFF8E8', display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 700 }}>{COMMENTS.length}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {COMMENTS.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', gap: 10 }}>
              <Avatar initials={c.initials} hue={c.hue} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ background: '#fff', padding: '10px 14px', borderRadius: 18, borderTopLeftRadius: 4, boxShadow: '0 1px 2px rgba(10,31,68,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0A1F44' }}>{c.author}</span>
                    <span style={{ width: 3, height: 3, borderRadius: 2, background: '#F4B942' }} />
                    <span style={{ fontSize: 10, color: '#8696B0' }}>{c.time}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#142A55', lineHeight: 1.45 }}>{c.body}</div>
                </div>
                <div style={{ display: 'flex', gap: 14, padding: '6px 12px', fontSize: 11, color: '#8696B0', fontWeight: 700 }}>
                  <span>J&rsquo;aime</span>
                  <span>Répondre</span>
                  {i === 0 ? <span style={{ marginLeft: 'auto', color: '#B88A2A' }}>+ 2 réponses</span> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* sticky reply */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px 28px', background: 'linear-gradient(180deg, rgba(241,243,248,0) 0%, rgba(241,243,248,0.95) 30%, #F1F3F8 100%)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <Avatar initials="AM" hue={200} size={36} />
        <div style={{ flex: 1, height: 44, borderRadius: 22, background: '#fff', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 13, color: '#6B7280' }}>Répondre à {post.author.split(' ')[0]}…</div>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: 'linear-gradient(135deg, #F4B942, #B88A2A)', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px -6px rgba(244,185,66,0.55)' }}>
          <Icon.send width={16} height={16} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BoldFeedScreen, BoldStoryScreen, BoldComposerScreen, BoldDetailScreen, BoldPostCard, BoldTabBar });
