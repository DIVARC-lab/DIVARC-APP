// Mobile feed — SAGE variant (faithful to the repo, polished)
// Renders four full-bleed iPhone screens.

function SageFeedScreen() {
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 60 }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E6E9F0',
        padding: '64px 20px 12px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <DivarcLogo size={28} />
        <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 22, color: '#0A1F44', letterSpacing: '-0.01em', fontWeight: 400 }}>DIVARC</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: '#F1F3F8', color: '#2A3D6B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.search width={16} height={16} />
          </div>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: '#F1F3F8', color: '#2A3D6B', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Icon.bell width={16} height={16} />
            <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, background: '#F4B942', border: '1.5px solid #fff' }} />
          </div>
        </div>
      </div>

      {/* Eyebrow + heading */}
      <div style={{ padding: '20px 20px 4px' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 700 }}>Feed</div>
        <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 34, lineHeight: 1.05, color: '#0A1F44', margin: '8px 0 4px', fontWeight: 400, letterSpacing: '-0.02em' }}>
          Ce que tes proches <em style={{ fontStyle: 'italic' }}>racontent</em>.
        </h1>
        <p style={{ fontSize: 13, color: '#4B5563', margin: 0 }}>Ordre chronologique strict. Pas d&rsquo;algo, pas de pub.</p>
      </div>

      {/* Stories */}
      <div style={{ overflow: 'hidden', padding: '16px 0 8px' }}>
        <div style={{ display: 'flex', gap: 14, padding: '0 20px', overflowX: 'auto' }}>
          {STORIES.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {s.isSelf ? (
                <div style={{ position: 'relative', width: 64, height: 64, borderRadius: 32, border: '2px dashed rgba(10,31,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Avatar initials={s.initials} hue={200} size={52} />
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, background: '#F4B942', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #F8F9FB' }}>
                    <Icon.plus width={11} height={11} />
                  </div>
                </div>
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 32, padding: 2, background: s.unviewed ? 'linear-gradient(135deg, #F4B942 0%, #F8CD76 50%, #B88A2A 100%)' : 'rgba(10,31,68,0.15)' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: 28, padding: 2, background: '#F8F9FB' }}>
                    <Avatar initials={s.initials} hue={s.hue} size={52} />
                  </div>
                </div>
              )}
              <div style={{ fontSize: 11, color: '#4B5B87', fontWeight: 500, maxWidth: 64, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{s.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Composer (collapsed) */}
      <div style={{ margin: '8px 16px 16px', borderRadius: 24, background: '#fff', border: '1px solid #E6E9F0', padding: 14, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 2px rgba(10,31,68,0.04)' }}>
        <Avatar initials="AM" hue={200} size={36} />
        <div style={{ flex: 1, color: '#6B7280', fontSize: 14 }}>Quoi de neuf ?</div>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: '#0A1F44', color: '#FFF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon.image width={16} height={16} />
        </div>
      </div>

      {/* Posts */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {POSTS.slice(0, 3).map((p) => <SagePostCard key={p.id} post={p} />)}
      </div>

      {/* Bottom tab bar */}
      <SageTabBar active="feed" />
    </div>
  );
}

function SagePostCard({ post, big }) {
  return (
    <article style={{ borderRadius: 24, background: '#fff', border: '1px solid #E6E9F0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(10,31,68,0.04), 0 8px 24px -16px rgba(10,31,68,0.12)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14 }}>
        <Avatar initials={post.initials} hue={post.avatarHue} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1F44' }}>{post.author}</div>
          <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ display: 'inline-flex' }}><VisIcon v={post.visibility} size={11} /></span>
            <span>·</span>
            <span>{post.time}</span>
            {post.pill ? (<>
              <span>·</span>
              <span style={{ background: '#FFF8E8', color: '#B88A2A', padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>{post.pill}</span>
            </>) : null}
          </div>
        </div>
        <div style={{ color: '#6B7280' }}><Icon.more width={18} height={18} /></div>
      </header>

      {post.body ? (
        <div style={{ padding: '0 14px 12px', fontSize: 14, color: '#0A1F44', lineHeight: 1.5 }}>{post.body}</div>
      ) : null}

      {post.photos.length > 0 ? (
        <div style={{ padding: 0 }}>
          <PhotoBlock {...post.photos[0]} aspect={big ? '16/10' : '4/5'} radius={0} />
        </div>
      ) : null}

      <footer style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderTop: '1px solid #E6E9F0' }}>
        <button style={{
          height: 34, padding: '0 12px', borderRadius: 17, border: 'none',
          background: post.liked ? '#FEF2F2' : '#F1F3F8',
          color: post.liked ? '#DC2626' : '#4B5B87',
          display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13,
        }}>
          <Icon.heart width={15} height={15} filled={post.liked} />
          {post.likes}
        </button>
        <button style={{
          height: 34, padding: '0 12px', borderRadius: 17, border: 'none',
          background: '#F1F3F8', color: '#4B5B87',
          display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13,
        }}>
          <Icon.message width={15} height={15} />
          {post.comments}
        </button>
        <div style={{ marginLeft: 'auto', color: '#6B7280' }}><Icon.bookmark width={16} height={16} /></div>
      </footer>
    </article>
  );
}

function SageTabBar({ active }) {
  const items = [
    { k: 'home', l: 'Accueil', i: Icon.home },
    { k: 'explore', l: 'Découvrir', i: Icon.compass },
    { k: 'feed', l: 'Feed', i: Icon.sparkle },
    { k: 'msg', l: 'Messages', i: Icon.msg },
    { k: 'me', l: 'Profil', i: Icon.user },
  ];
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid #E6E9F0', paddingBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 12px 6px' }}>
        {items.map(it => {
          const I = it.i;
          const on = it.k === active;
          return (
            <div key={it.k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: on ? '#0A1F44' : '#8696B0' }}>
              <I width={20} height={20} />
              <div style={{ fontSize: 10, fontWeight: on ? 700 : 500 }}>{it.l}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Story view
// ─────────────────────────────────────────────────────────────
function SageStoryScreen() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
      <PhotoBlock a="#f4b942" b="#b88a2a" c="#0a1f44" aspect="9/16" />
      {/* progress bars */}
      <div style={{ position: 'absolute', top: 56, left: 12, right: 12, display: 'flex', gap: 4 }}>
        {[1,2,3].map((i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#fff', width: i === 1 ? '100%' : i === 2 ? '40%' : '0%' }} />
          </div>
        ))}
      </div>
      {/* author */}
      <div style={{ position: 'absolute', top: 70, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
        <Avatar initials="AC" hue={38} size={36} ring={2} ringColor="#fff" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Aïssata</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>il y a 2 h</div>
        </div>
        <Icon.more width={18} height={18} />
      </div>
      {/* caption */}
      <div style={{ position: 'absolute', bottom: 120, left: 24, right: 24, color: '#fff', fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 26, lineHeight: 1.15, fontStyle: 'italic', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
        Le matin dans l&rsquo;atelier.
      </div>
      {/* reply */}
      <div style={{ position: 'absolute', bottom: 50, left: 16, right: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 44, borderRadius: 22, border: '1px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', padding: '0 16px', color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Répondre à Aïssata…</div>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon.heart width={20} height={20} />
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon.send width={18} height={18} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Composer screen (with keyboard)
// ─────────────────────────────────────────────────────────────
function SageComposerScreen() {
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%' }}>
      <div style={{ paddingTop: 56, paddingBottom: 4, padding: '56px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A1F44' }}>
          <Icon.arrowLeft width={16} height={16} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#0A1F44' }}>Nouveau post</div>
        <button style={{ height: 36, padding: '0 16px', borderRadius: 18, border: 'none', background: '#0A1F44', color: '#FFF8E8', fontWeight: 700, fontSize: 13 }}>Publier</button>
      </div>

      <div style={{ margin: '12px 14px', borderRadius: 24, background: '#fff', border: '1px solid #E6E9F0', padding: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Avatar initials="AM" hue={200} size={40} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1F44' }}>Amine Maïga</div>
            <div style={{ marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: '#F1F3F8', borderRadius: 8, fontSize: 11, color: '#2A3D6B', fontWeight: 600 }}>
              <Icon.users width={11} height={11} /> Amis
              <Icon.chevDown width={11} height={11} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 16, color: '#0A1F44', lineHeight: 1.5, minHeight: 60 }}>
          Première session photo dans l&rsquo;atelier ce week-end.
          <span style={{ borderLeft: '2px solid #0A1F44', marginLeft: 1, animation: 'caret 1s infinite' }} />
        </div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <PhotoBlock a="#f4b942" b="#b88a2a" c="#0a1f44" aspect="1/1" radius={14} />
          <PhotoBlock a="#fff8e8" b="#f8cd76" c="#142a55" aspect="1/1" radius={14} />
        </div>
      </div>

      <div style={{ margin: '0 14px', display: 'flex', gap: 8, alignItems: 'center', padding: '10px 4px' }}>
        <div style={{ height: 32, padding: '0 12px', borderRadius: 16, background: '#fff', border: '1px solid #E6E9F0', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#2A3D6B', fontWeight: 600 }}>
          <Icon.image width={13} height={13} /> Photos · 2/4
        </div>
        <div style={{ height: 32, padding: '0 12px', borderRadius: 16, background: '#fff', border: '1px solid #E6E9F0', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#2A3D6B', fontWeight: 600 }}>
          <Icon.sparkle width={13} height={13} /> Émotion
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#6B7280' }}>62/4000</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Post detail with comments
// ─────────────────────────────────────────────────────────────
function SageDetailScreen() {
  const post = POSTS[0];
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 60 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid #E6E9F0', padding: '60px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: '#F1F3F8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A1F44' }}>
          <Icon.arrowLeft width={16} height={16} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1F44' }}>Post</div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        <SagePostCard post={post} />
      </div>

      <div style={{ margin: '0 16px', borderRadius: 24, background: '#fff', border: '1px solid #E6E9F0', padding: 16 }}>
        <h3 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 20, color: '#0A1F44', margin: 0, fontWeight: 400 }}>
          Commentaires <span style={{ color: '#6B7280', fontFamily: 'inherit', fontSize: 16 }}>· {COMMENTS.length}</span>
        </h3>

        <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Avatar initials="AM" hue={200} size={32} />
          <div style={{ flex: 1, height: 40, borderRadius: 20, border: '1px solid #E6E9F0', background: '#F8F9FB', display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 13, color: '#6B7280' }}>Écris un commentaire…</div>
        </div>

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {COMMENTS.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10 }}>
              <Avatar initials={c.initials} hue={c.hue} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ background: 'rgba(10,31,68,0.04)', padding: '8px 12px', borderRadius: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0A1F44' }}>{c.author}</span>
                    <span style={{ fontSize: 10, color: '#8696B0' }}>{c.time}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#142A55', marginTop: 2, lineHeight: 1.4 }}>{c.body}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, padding: '4px 10px', fontSize: 11, color: '#8696B0', fontWeight: 600 }}>
                  <span>J&rsquo;aime</span>
                  <span>Répondre</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SageTabBar active="feed" />
    </div>
  );
}

Object.assign(window, { SageFeedScreen, SageStoryScreen, SageComposerScreen, SageDetailScreen, SagePostCard, SageTabBar });
