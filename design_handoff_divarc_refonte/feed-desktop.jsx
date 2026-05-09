// Desktop feed — SAGE and BOLD variants in one file.
// Both render at 1280×860 to fit a typical laptop hero.

function DesktopShell({ active = 'feed', children, bold }) {
  const items = [
    { k: 'home', l: 'Accueil', i: Icon.home },
    { k: 'me', l: 'Profil', i: Icon.user },
    { k: 'notif', l: 'Notifications', i: Icon.bell, badge: 3 },
    { k: 'friends', l: 'Amis', i: Icon.users, badge: 2 },
    { k: 'msg', l: 'Discussions', i: Icon.msg, badge: 5 },
    { k: 'shop', l: 'Marché', i: Icon.shop },
    { k: 'feed', l: 'Feed', i: Icon.sparkle },
    { k: 'jobs', l: 'Emploi', i: Icon.brief },
    { k: 'wallet', l: 'Wallet', i: Icon.wallet },
    { k: 'explore', l: 'Découvrir', i: Icon.compass },
  ];
  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '260px 1fr', background: '#F8F9FB', fontFamily: 'Geist, system-ui, sans-serif', overflow: 'hidden' }}>
      <aside style={{ borderRight: '1px solid #E6E9F0', background: bold ? 'linear-gradient(180deg, #FFF8E8 0%, rgba(255,255,255,0.6) 100%)' : 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        {bold ? <div style={{ position: 'absolute', bottom: -60, left: -80, opacity: 0.35, pointerEvents: 'none' }}><ArcDeco size={260} opacity={1} /></div> : null}
        <div style={{ padding: '20px 24px 18px', borderBottom: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <DivarcLogo size={36} />
          <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 24, color: '#0A1F44', letterSpacing: '-0.01em' }}>DIVARC</div>
        </div>
        <div style={{ padding: '14px 16px 6px' }}>
          <div style={{ height: 38, borderRadius: 19, background: '#fff', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, color: '#8696B0', fontSize: 13 }}>
            <Icon.search width={14} height={14} /> Rechercher…
            <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#F1F3F8', color: '#4B5B87', fontWeight: 700 }}>⌘K</span>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {items.map(it => {
            const I = it.i;
            const on = it.k === active;
            return (
              <div key={it.k} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 12,
                background: on ? (bold ? 'linear-gradient(135deg, #0A1F44, #142A55)' : 'rgba(10,31,68,0.06)') : 'transparent',
                color: on ? (bold ? '#FFF8E8' : '#0A1F44') : '#4B5B87',
                fontSize: 13, fontWeight: on ? 700 : 500,
                position: 'relative',
              }}>
                <I width={16} height={16} />
                <span style={{ flex: 1 }}>{it.l}</span>
                {it.badge ? (
                  <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: on && bold ? '#F4B942' : '#0A1F44', color: on && bold ? '#0A1F44' : '#FFF8E8', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{it.badge}</span>
                ) : null}
                {on && bold ? <span style={{ position: 'absolute', left: -12, top: '50%', transform: 'translateY(-50%)', width: 4, height: 22, borderRadius: 2, background: '#F4B942' }} /> : null}
              </div>
            );
          })}
        </nav>
        <div style={{ borderTop: '1px solid #E6E9F0', padding: 12, display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <Avatar initials="AM" hue={200} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1F44' }}>Amine Maïga</div>
            <div style={{ fontSize: 11, color: '#8696B0' }}>@amine</div>
          </div>
          <Icon.more width={16} height={16} />
        </div>
      </aside>
      <main style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Beta strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: bold ? 'linear-gradient(90deg, #FFF8E8, #fff 60%)' : 'rgba(255,248,232,0.4)', borderBottom: '1px solid #E6E9F0', fontSize: 12, color: '#2A3D6B' }}>
          <Icon.sparkles width={13} height={13} style={{ color: '#B88A2A' }} />
          <span style={{ fontWeight: 700, color: '#0A1F44' }}>Beta privée</span>
          <span>· Tu fais partie des fondateurs. Badge permanent.</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      </main>
    </div>
  );
}

function DesktopFeedSage() {
  return (
    <DesktopShell active="feed">
      <div style={{ padding: '32px 40px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, maxWidth: 1100, margin: '0 auto' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 700 }}>Feed</div>
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 44, lineHeight: 1.05, color: '#0A1F44', margin: '8px 0 6px', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Ce que tes proches <em style={{ fontStyle: 'italic' }}>racontent</em>.
          </h1>
          <p style={{ fontSize: 14, color: '#4B5563', margin: 0 }}>Ordre chronologique strict. Pas d&rsquo;algorithme, pas de pub.</p>

          {/* stories */}
          <div style={{ marginTop: 20, display: 'flex', gap: 16, overflowX: 'auto' }}>
            {STORIES.map((s) => (
              <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {s.isSelf ? (
                  <div style={{ position: 'relative', width: 64, height: 64, borderRadius: 32, border: '2px dashed rgba(10,31,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Avatar initials={s.initials} hue={200} size={52} />
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, background: '#F4B942', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #F8F9FB' }}><Icon.plus width={11} height={11} /></div>
                  </div>
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: 32, padding: 2, background: s.unviewed ? 'linear-gradient(135deg, #F4B942 0%, #F8CD76 50%, #B88A2A 100%)' : 'rgba(10,31,68,0.15)' }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: 28, padding: 2, background: '#F8F9FB' }}>
                      <Avatar initials={s.initials} hue={s.hue} size={52} />
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#4B5B87', fontWeight: 500 }}>{s.name}</div>
              </div>
            ))}
          </div>

          {/* composer */}
          <div style={{ marginTop: 22, borderRadius: 24, background: '#fff', border: '1px solid #E6E9F0', padding: 20, boxShadow: '0 1px 2px rgba(10,31,68,0.04)' }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <Avatar initials="AM" hue={200} size={44} />
              <div style={{ flex: 1, color: '#6B7280', fontSize: 15, paddingTop: 10 }}>Quoi de neuf ?</div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 10, paddingLeft: 58 }}>
              <button style={{ height: 36, padding: '0 14px', borderRadius: 18, background: '#F1F3F8', border: 'none', color: '#2A3D6B', fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon.image width={14} height={14} /> Photos
              </button>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: 2, borderRadius: 18, background: '#F1F3F8' }}>
                {[
                  { v: 'friends', l: 'Amis', I: Icon.users },
                  { v: 'public', l: 'Public', I: Icon.globe },
                  { v: 'private', l: 'Moi', I: Icon.lock },
                ].map(o => {
                  const I = o.I; const on = o.v === 'friends';
                  return (
                    <div key={o.v} style={{ height: 32, padding: '0 12px', borderRadius: 16, background: on ? '#fff' : 'transparent', color: on ? '#0A1F44' : '#4B5B87', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5, boxShadow: on ? '0 1px 2px rgba(10,31,68,0.06)' : 'none' }}>
                      <I width={12} height={12} /> {o.l}
                    </div>
                  );
                })}
              </div>
              <button style={{ marginLeft: 'auto', height: 36, padding: '0 18px', borderRadius: 18, background: '#0A1F44', border: 'none', color: '#FFF8E8', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon.send width={13} height={13} /> Publier
              </button>
            </div>
          </div>

          {/* posts */}
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {POSTS.map(p => <SagePostCard key={p.id} post={p} />)}
          </div>
        </div>

        {/* right rail */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0, alignSelf: 'start' }}>
          <div style={{ borderRadius: 20, background: '#fff', border: '1px solid #E6E9F0', padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 700 }}>Suggestions</div>
            <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 18, color: '#0A1F44', marginTop: 4, marginBottom: 10 }}>Personnes à suivre</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { n: 'Mariam Diop', h: '@mariam', i: 'MD', hue: 280, mut: '4 amis en commun' },
                { n: 'Karim Sidibé', h: '@karim', i: 'KS', hue: 20, mut: '2 amis en commun' },
                { n: 'Ousmane Kane', h: '@ousmane', i: 'OK', hue: 130, mut: 'À Dakar' },
              ].map((u, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar initials={u.i} hue={u.hue} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1F44' }}>{u.n}</div>
                    <div style={{ fontSize: 11, color: '#8696B0' }}>{u.mut}</div>
                  </div>
                  <button style={{ height: 28, padding: '0 12px', borderRadius: 14, border: '1px solid rgba(10,31,68,0.15)', background: '#fff', color: '#0A1F44', fontWeight: 700, fontSize: 11 }}>Suivre</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: 20, background: '#fff', border: '1px solid #E6E9F0', padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 700 }}>Tendances</div>
            <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 18, color: '#0A1F44', marginTop: 4, marginBottom: 10 }}>Cette semaine</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['#Dakar', '#PhotoArgentique', '#FreelanceFR', '#MarchéLocal'].map((t, i) => (
                <div key={t} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#0A1F44', fontWeight: 600 }}>
                  <span>{t}</span>
                  <span style={{ color: '#8696B0', fontWeight: 500 }}>{[124, 87, 64, 41][i]} posts</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderRadius: 20, background: 'linear-gradient(135deg, #0A1F44, #142A55)', color: '#FFF8E8', padding: 18, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -40, bottom: -40, opacity: 0.4 }}><ArcDeco size={180} opacity={1} /></div>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#F4B942', fontWeight: 700, position: 'relative' }}>Ce soir</div>
            <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 18, marginTop: 4, position: 'relative' }}>Soirée fondateurs DIVARC</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6, position: 'relative' }}>Vendredi · 19h · En ligne</div>
            <button style={{ marginTop: 12, height: 30, padding: '0 14px', borderRadius: 15, border: 'none', background: '#F4B942', color: '#0A1F44', fontWeight: 700, fontSize: 12, position: 'relative' }}>Je viens</button>
          </div>
        </aside>
      </div>
    </DesktopShell>
  );
}

function DesktopFeedBold() {
  return (
    <DesktopShell active="feed" bold>
      <div style={{ position: 'relative', minHeight: '100%', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -80, opacity: 0.35, pointerEvents: 'none' }}><ArcDeco size={420} opacity={1} /></div>

        <div style={{ padding: '28px 40px 0', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, maxWidth: 1180, margin: '0 auto', position: 'relative' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ width: 5, height: 5, borderRadius: 3, background: '#F4B942', display: 'inline-block' }} />
              <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>Le feed · 7 mai</div>
            </div>
            <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 64, lineHeight: 0.98, color: '#0A1F44', margin: '12px 0 10px', fontWeight: 400, letterSpacing: '-0.025em', maxWidth: 600 }}>
              Ce que tes proches{' '}
              <em style={{ fontStyle: 'italic', backgroundImage: 'linear-gradient(120deg, #F4B942, #B88A2A)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>racontent</em> aujourd&rsquo;hui.
            </h1>
            <p style={{ fontSize: 15, color: '#2A3D6B', margin: 0 }}>Ordre chronologique strict. Pas d&rsquo;algorithme, pas de pub. <span style={{ color: '#0A1F44', fontWeight: 600 }}>4 nouveaux posts</span> depuis ta dernière visite.</p>

            {/* stories */}
            <div style={{ marginTop: 28, display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6 }}>
              {STORIES.map((s) => (
                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {s.isSelf ? (
                    <div style={{ position: 'relative', width: 72, height: 72, borderRadius: 36, background: '#fff', border: '2px solid #0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Avatar initials={s.initials} hue={200} size={56} />
                      <div style={{ position: 'absolute', bottom: -3, right: -3, width: 26, height: 26, borderRadius: 13, background: '#F4B942', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2.5px solid #F8F9FB' }}><Icon.plus width={12} height={12} /></div>
                    </div>
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: 36, padding: 3, background: s.unviewed ? 'conic-gradient(from 200deg, #F4B942, #F8CD76, #B88A2A, #F4B942)' : 'rgba(10,31,68,0.15)', boxShadow: s.unviewed ? '0 6px 18px -4px rgba(244,185,66,0.4)' : 'none' }}>
                      <div style={{ width: '100%', height: '100%', borderRadius: 33, padding: 2, background: '#F8F9FB' }}>
                        <Avatar initials={s.initials} hue={s.hue} size={60} />
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#142A55', fontWeight: 600 }}>{s.name}</div>
                </div>
              ))}
            </div>

            {/* composer hero */}
            <div style={{ marginTop: 24, borderRadius: 28, background: '#fff', padding: 22, position: 'relative', boxShadow: '0 1px 2px rgba(10,31,68,0.04), 0 24px 60px -28px rgba(10,31,68,0.22)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 38, width: 80, height: 4, background: '#F4B942', borderRadius: '0 0 4px 4px' }} />
              <div style={{ display: 'flex', gap: 14 }}>
                <Avatar initials="AM" hue={200} size={48} />
                <div style={{ flex: 1, paddingTop: 8 }}>
                  <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 20, color: '#0A1F44' }}>Quoi de neuf, Amine ?</div>
                  <div style={{ fontSize: 12, color: '#8696B0', marginTop: 2 }}>Photo, pensée, annonce, un moment de ta journée…</div>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 10, paddingLeft: 62, alignItems: 'center' }}>
                {[
                  { i: Icon.image, l: 'Photos' },
                  { i: Icon.sparkles, l: 'Moment' },
                  { i: Icon.compass, l: 'Lieu' },
                ].map((it, idx) => {
                  const I = it.i;
                  return (
                    <div key={idx} style={{ height: 36, padding: '0 14px', borderRadius: 18, background: idx === 0 ? '#FFF8E8' : '#F8F9FB', color: idx === 0 ? '#B88A2A' : '#2A3D6B', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <I width={14} height={14} /> {it.l}
                    </div>
                  );
                })}
                <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#F8F9FB', borderRadius: 12, fontSize: 12, color: '#2A3D6B', fontWeight: 700 }}>
                  <Icon.users width={12} height={12} /> Amis <Icon.chevDown width={10} height={10} />
                </div>
                <button style={{ height: 38, padding: '0 20px', borderRadius: 19, border: 'none', background: 'linear-gradient(135deg, #F4B942, #B88A2A)', color: '#0A1F44', fontWeight: 800, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 8px 20px -8px rgba(244,185,66,0.6)' }}>
                  <Icon.send width={13} height={13} /> Publier
                </button>
              </div>
            </div>

            {/* posts */}
            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 40 }}>
              {POSTS.map((p, i) => <BoldPostCard key={p.id} post={p} hero={i === 0} />)}
            </div>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 0, alignSelf: 'start' }}>
            <div style={{ borderRadius: 24, background: 'linear-gradient(135deg, #0A1F44, #142A55)', color: '#FFF8E8', padding: 22, position: 'relative', overflow: 'hidden', boxShadow: '0 24px 60px -28px rgba(10,31,68,0.5)' }}>
              <div style={{ position: 'absolute', right: -50, bottom: -50, opacity: 0.45, pointerEvents: 'none' }}><ArcDeco size={200} opacity={1} /></div>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#F4B942', fontWeight: 800, position: 'relative' }}>· Ton arc</div>
              <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 28, marginTop: 6, position: 'relative', lineHeight: 1.05, fontStyle: 'italic' }}>3 amis ont posté ce matin</div>
              <div style={{ display: 'flex', marginTop: 14, position: 'relative' }}>
                {[STORIES[1], STORIES[2], STORIES[3]].map((s, i) => (
                  <div key={s.id} style={{ marginLeft: i === 0 ? 0 : -10, padding: 2, borderRadius: 22, background: '#0A1F44' }}>
                    <Avatar initials={s.initials} hue={s.hue} size={36} />
                  </div>
                ))}
              </div>
              <button style={{ marginTop: 16, height: 32, padding: '0 16px', borderRadius: 16, border: 'none', background: '#F4B942', color: '#0A1F44', fontWeight: 800, fontSize: 12, position: 'relative' }}>Voir leurs posts</button>
            </div>

            <div style={{ borderRadius: 24, background: '#fff', padding: 18, boxShadow: '0 1px 2px rgba(10,31,68,0.04)' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>Suggestions</div>
              <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 19, color: '#0A1F44', fontStyle: 'italic', marginTop: 4, marginBottom: 12 }}>À suivre</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { n: 'Mariam Diop', i: 'MD', hue: 280, mut: '4 amis en commun' },
                  { n: 'Karim Sidibé', i: 'KS', hue: 20, mut: 'À Dakar · Photographe' },
                  { n: 'Ousmane Kane', i: 'OK', hue: 130, mut: '2 amis en commun' },
                ].map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar initials={u.i} hue={u.hue} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1F44' }}>{u.n}</div>
                      <div style={{ fontSize: 11, color: '#8696B0' }}>{u.mut}</div>
                    </div>
                    <button style={{ height: 30, padding: '0 12px', borderRadius: 15, border: 'none', background: '#0A1F44', color: '#FFF8E8', fontWeight: 800, fontSize: 11 }}>+ Suivre</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderRadius: 24, background: '#FFF8E8', padding: 18, border: '1px solid rgba(244,185,66,0.3)' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>Tendances</div>
              <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 19, color: '#0A1F44', marginTop: 4, marginBottom: 12 }}>Cette semaine</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { t: '#Dakar', n: 124 },
                  { t: '#PhotoArgentique', n: 87 },
                  { t: '#FreelanceFR', n: 64 },
                  { t: '#MarchéLocal', n: 41 },
                ].map((t, i) => (
                  <div key={t.t} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#0A1F44', fontWeight: 700, alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 18, color: '#B88A2A', fontWeight: 800, fontSize: 11 }}>{String(i+1).padStart(2, '0')}</span>
                      {t.t}
                    </span>
                    <span style={{ color: '#8696B0', fontWeight: 600, fontSize: 11 }}>{t.n} posts</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DesktopShell>
  );
}

Object.assign(window, { DesktopFeedSage, DesktopFeedBold, DesktopShell });
