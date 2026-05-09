// Interactive mobile prototype — wires the 4 existing screens together
// with state-based navigation + functional tabs. Reuses Sage* and Bold*
// screens for the overlays; the home shell is wired locally.

function ProtoStub({ title, subtitle, icon, accent }) {
  const I = window.Icon[icon];
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '60px 24px 18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--dvc-gold-deep, #B88A2A)', fontWeight: 700 }}>{accent}</div>
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 36, lineHeight: 1, color: '#0A1F44', margin: '6px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>{title}</h1>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 20, background: '#fff', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <I width={18} height={18} style={{ color: '#0A1F44' }} />
        </div>
      </div>
      <div style={{ padding: '20px 20px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {subtitle ? <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>{subtitle}</div> : null}
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', padding: 16, display: 'flex', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #FFF8E8, #F4B942 80%)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ height: 11, borderRadius: 5, background: 'rgba(10,31,68,0.18)', width: '70%' }} />
              <div style={{ height: 9, borderRadius: 4, background: 'rgba(10,31,68,0.08)', width: '90%', marginTop: 8 }} />
              <div style={{ height: 9, borderRadius: 4, background: 'rgba(10,31,68,0.08)', width: '50%', marginTop: 5 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Interactive home — clickable stories and a clickable post
function ProtoHome({ onStory, onPost, onComposer }) {
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90 }}>
      <div style={{ padding: '60px 20px 14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--dvc-gold-deep, #B88A2A)', fontWeight: 700 }}>Le feed · jeu. 8 mai</div>
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 38, lineHeight: 1, color: '#0A1F44', margin: '6px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
            <em style={{ fontStyle: 'italic' }}>Tes proches</em>, aujourd&rsquo;hui.
          </h1>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 20, background: '#fff', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <window.Icon.search width={16} height={16} style={{ color: '#0A1F44' }} />
        </div>
      </div>

      {/* stories — clickable */}
      <div style={{ display: 'flex', gap: 14, padding: '12px 20px 18px', overflowX: 'auto' }}>
        {window.STORIES.map((s) => (
          <div key={s.id} onClick={() => !s.isSelf && onStory(s)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}>
            {s.isSelf ? (
              <div style={{ position: 'relative', width: 60, height: 60, borderRadius: 30, border: '2px dashed rgba(10,31,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <window.Avatar initials={s.initials} hue={200} size={48} />
                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, background: 'var(--dvc-gold, #F4B942)', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #F8F9FB' }}><window.Icon.plus width={11} height={11} /></div>
              </div>
            ) : (
              <div style={{ width: 60, height: 60, borderRadius: 30, padding: 2, background: s.unviewed ? 'linear-gradient(135deg, #F4B942 0%, #F8CD76 50%, #B88A2A 100%)' : 'rgba(10,31,68,0.15)' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: 26, padding: 2, background: '#F8F9FB' }}>
                  <window.Avatar initials={s.initials} hue={s.hue} size={48} />
                </div>
              </div>
            )}
            <div style={{ fontSize: 11, color: '#4B5B87', fontWeight: 500 }}>{s.name}</div>
          </div>
        ))}
      </div>

      {/* compose strip */}
      <div onClick={onComposer} style={{ margin: '0 20px 14px', borderRadius: 22, background: '#fff', border: '1px solid #E6E9F0', padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <window.Avatar initials="AM" hue={200} size={36} />
        <div style={{ flex: 1, color: '#8696B0', fontSize: 14 }}>Quoi de neuf, Amine ?</div>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--dvc-gold, #F4B942)', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <window.Icon.image width={16} height={16} />
        </div>
      </div>

      {/* posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 16px' }}>
        {window.POSTS.map(p => (
          <div key={p.id} onClick={() => onPost(p)} style={{ cursor: 'pointer' }}>
            <window.SagePostCard post={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProtoTabBar({ tab, onTab, onComposer }) {
  const items = [
    { k: 'home', l: 'Accueil', i: 'home' },
    { k: 'shop', l: 'Marché', i: 'shop' },
    { k: 'compose', l: '', i: 'plus', accent: true },
    { k: 'jobs', l: 'Emploi', i: 'brief' },
    { k: 'me', l: 'Profil', i: 'user' },
  ];
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: 24, paddingTop: 8, background: 'rgba(248,249,251,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid #E6E9F0', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 5 }}>
      {items.map(it => {
        const I = window.Icon[it.i];
        const on = it.k === tab;
        if (it.accent) {
          return (
            <button key={it.k} onClick={onComposer} style={{ width: 52, height: 52, borderRadius: 26, background: 'linear-gradient(135deg, var(--dvc-gold, #F4B942), var(--dvc-gold-deep, #B88A2A))', color: '#0A1F44', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px -6px rgba(244,185,66,0.6)', cursor: 'pointer' }}>
              <I width={22} height={22} />
            </button>
          );
        }
        return (
          <button key={it.k} onClick={() => onTab(it.k)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 12px', background: 'transparent', border: 'none', color: on ? '#0A1F44' : '#8696B0', cursor: 'pointer' }}>
            <I width={20} height={20} />
            <span style={{ fontSize: 10, fontWeight: on ? 700 : 500 }}>{it.l}</span>
          </button>
        );
      })}
    </div>
  );
}

function MobilePrototype() {
  const [tab, setTab] = React.useState('home');
  const [overlay, setOverlay] = React.useState(null); // 'story' | 'composer' | 'detail'

  const closeOverlay = () => setOverlay(null);

  let body;
  if (tab === 'home') body = <ProtoHome onStory={() => setOverlay('story')} onPost={() => setOverlay('detail')} onComposer={() => setOverlay('composer')} />;
  else if (tab === 'shop') body = <ProtoStub title="Marché" subtitle="Achète, vends, échange dans ton réseau de confiance." icon="shop" accent="Marketplace" />;
  else if (tab === 'jobs') body = <ProtoStub title="Emploi" subtitle="Opportunités partagées par tes amis et leur réseau." icon="brief" accent="Jobs" />;
  else if (tab === 'me') body = <ProtoStub title="Amine" subtitle="Ton profil, ta présence, tes contributions." icon="user" accent="Profil" />;
  else body = null;

  // Overlay renders existing detail screens with a close button
  let overlayEl = null;
  if (overlay === 'story') {
    overlayEl = (
      <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: '#000' }}>
        <window.SageStoryScreen />
        <button onClick={closeOverlay} style={{ position: 'absolute', top: 56, right: 16, width: 36, height: 36, borderRadius: 18, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    );
  } else if (overlay === 'composer') {
    overlayEl = (
      <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: '#F8F9FB', overflow: 'hidden' }}>
        <window.SageComposerScreen />
        <button onClick={closeOverlay} style={{ position: 'absolute', top: 60, left: 16, width: 36, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 25 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    );
  } else if (overlay === 'detail') {
    overlayEl = (
      <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: '#F8F9FB', overflow: 'auto' }}>
        <window.SageDetailScreen />
        <button onClick={closeOverlay} style={{ position: 'absolute', top: 60, left: 16, width: 36, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 25 }}>
          <window.Icon.arrowLeft width={16} height={16} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
        {body}
      </div>
      <ProtoTabBar tab={tab} onTab={setTab} onComposer={() => setOverlay('composer')} />
      {overlayEl}
    </div>
  );
}

window.MobilePrototype = MobilePrototype;
