// Marketplace — 3 mobile screens in the DIVARC grammar.
// Liste + détail listing + favoris. Reuses Icon, Avatar, ArcDeco, PhotoBlock.

const M_I = window.Icon;

const M_LISTINGS = [
  { id: 'l1', t: 'Olympus OM-2 + 50mm f/1.8', p: 185, place: 'Dakar · Plateau', who: 'Aïssata C.', initials: 'AC', hue: 38, cond: 'Très bon état', a: '#F4B942', b: '#B88A2A', c: '#0A1F44', tag: 'Photo', fav: true, time: 'il y a 2 h' },
  { id: 'l2', t: 'Vélo de ville Peugeot, taille M', p: 90, place: 'Dakar · Almadies', who: 'Yann M.', initials: 'YL', hue: 220, cond: 'Bon état', a: '#142A55', b: '#0A1F44', c: '#F4B942', tag: 'Mobilité', time: 'il y a 5 h' },
  { id: 'l3', t: 'Lot de livres design (12)', p: 60, place: 'Dakar · HLM', who: 'Mariam D.', initials: 'MD', hue: 280, cond: 'Comme neuf', a: '#FFF8E8', b: '#F8CD76', c: '#142A55', tag: 'Livres', time: 'hier' },
  { id: 'l4', t: 'Bureau bois massif, 140cm', p: 220, place: 'Dakar · Mermoz', who: 'Léo M.', initials: 'LM', hue: 160, cond: 'Bon état', a: '#B88A2A', b: '#0A1F44', c: '#FFF8E8', tag: 'Maison', fav: true, time: 'hier' },
  { id: 'l5', t: 'Boubou tissé · taille L', p: 45, place: 'Dakar · Médina', who: 'Karim S.', initials: 'KS', hue: 20, cond: 'Neuf', a: '#0A1F44', b: '#F4B942', c: '#FFF8E8', tag: 'Mode', time: 'il y a 2 j' },
  { id: 'l6', t: 'Console PS4 + 4 jeux', p: 140, place: 'Dakar · Ouakam', who: 'Ousmane K.', initials: 'OK', hue: 130, cond: 'Très bon état', a: '#142A55', b: '#F4B942', c: '#0A1F44', tag: 'Tech', time: 'il y a 3 j' },
];

// ─────────────────────────────────────────────────────────────
// 01 · Marketplace home (browse)
// ─────────────────────────────────────────────────────────────
function MarketplaceListScreen() {
  const cats = [
    { l: 'Tout', i: 'sparkle', on: true },
    { l: 'Mode', i: 'bookmark' },
    { l: 'Maison', i: 'home' },
    { l: 'Tech', i: 'sparkles' },
    { l: 'Photo', i: 'image' },
    { l: 'Livres', i: 'brief' },
    { l: 'Mobilité', i: 'compass' },
  ];
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90 }}>
      <div style={{ padding: '60px 20px 12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 700 }}>· Le marché</div>
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 38, color: '#0A1F44', margin: '4px 0 0', lineHeight: 1, fontWeight: 400, letterSpacing: '-0.02em' }}>
            <em style={{ fontStyle: 'italic' }}>Près de toi</em>, aujourd&rsquo;hui.
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><M_I.bookmark width={15} height={15} /></button>
          <button style={{ width: 36, height: 36, borderRadius: 18, background: 'linear-gradient(135deg, #F4B942, #B88A2A)', color: '#0A1F44', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><M_I.plus width={16} height={16} /></button>
        </div>
      </div>

      {/* search */}
      <div style={{ padding: '4px 20px 14px' }}>
        <div style={{ height: 42, borderRadius: 21, background: '#fff', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, color: '#8696B0', fontSize: 13 }}>
          <M_I.search width={15} height={15} /> Rechercher dans le marché…
          <span style={{ marginLeft: 'auto', fontSize: 10, padding: '3px 8px', borderRadius: 6, background: '#F1F3F8', color: '#4B5B87', fontWeight: 700 }}>5 km</span>
        </div>
      </div>

      {/* categories */}
      <div style={{ padding: '0 16px 14px', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {cats.map(c => {
          const Ic = M_I[c.i];
          return (
            <div key={c.l} style={{ height: 32, padding: '0 12px', borderRadius: 16, background: c.on ? '#0A1F44' : '#fff', color: c.on ? '#FFF8E8' : '#4B5B87', fontWeight: c.on ? 700 : 500, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, border: c.on ? 'none' : '1px solid #E6E9F0' }}>
              <Ic width={12} height={12} /> {c.l}
            </div>
          );
        })}
      </div>

      {/* hero card */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ borderRadius: 22, background: 'linear-gradient(135deg, #0A1F44, #142A55)', color: '#FFF8E8', padding: 18, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -50, bottom: -50, opacity: 0.4 }}><window.ArcDeco size={180} opacity={1} /></div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#F4B942', fontWeight: 800, position: 'relative' }}>· Coup de cœur</div>
          <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 22, marginTop: 4, position: 'relative' }}>
            12 nouveaux objets près de chez toi cette semaine
          </div>
          <button style={{ marginTop: 14, height: 30, padding: '0 14px', borderRadius: 15, border: 'none', background: '#F4B942', color: '#0A1F44', fontWeight: 800, fontSize: 12, position: 'relative' }}>Découvrir</button>
        </div>
      </div>

      {/* grid */}
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {M_LISTINGS.map(l => (
          <div key={l.id} style={{ borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <window.PhotoBlock a={l.a} b={l.b} c={l.c} aspect="1/1" radius={0} />
              <div style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, background: 'rgba(248,249,251,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: l.fav ? '#E0405D' : '#0A1F44' }}>
                <M_I.heart width={13} height={13} filled={l.fav} />
              </div>
              <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, padding: '3px 8px', borderRadius: 8, background: 'rgba(10,31,68,0.6)', backdropFilter: 'blur(8px)', color: '#FFF8E8', fontWeight: 700, letterSpacing: '0.04em' }}>{l.tag.toUpperCase()}</div>
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 16, color: '#0A1F44', lineHeight: 1.1 }}>{l.p}€</div>
              <div style={{ fontSize: 12, color: '#0A1F44', fontWeight: 600, marginTop: 4, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.t}</div>
              <div style={{ fontSize: 10, color: '#8696B0', marginTop: 6 }}>{l.place} · {l.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 02 · Détail d'un listing
// ─────────────────────────────────────────────────────────────
function MarketplaceDetailScreen() {
  const l = M_LISTINGS[0];
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90, position: 'relative' }}>
      {/* hero gallery */}
      <div style={{ position: 'relative' }}>
        <div style={{ height: 380 }}>
          <window.PhotoBlock a={l.a} b={l.b} c={l.c} aspect="auto" radius={0} />
        </div>
        <div style={{ position: 'absolute', top: 56, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(10,31,68,0.55)', backdropFilter: 'blur(10px)', color: '#FFF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><M_I.arrowLeft width={16} height={16} /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(10,31,68,0.55)', backdropFilter: 'blur(10px)', color: '#FFF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><M_I.share width={15} height={15} /></div>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', color: '#E0405D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><M_I.heart width={15} height={15} filled /></div>
          </div>
        </div>
        {/* dots */}
        <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
          {[0, 1, 2, 3].map(i => (
            <span key={i} style={{ width: i === 0 ? 16 : 6, height: 6, borderRadius: 3, background: i === 0 ? '#FFF8E8' : 'rgba(255,248,232,0.4)' }} />
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 700 }}>· {l.tag}</div>
            <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 28, color: '#0A1F44', lineHeight: 1.05, fontWeight: 400, marginTop: 6 }}>{l.t}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#8696B0', marginTop: 6 }}>
              <M_I.compass width={12} height={12} /> {l.place} · 1.2 km
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 32, color: '#0A1F44', lineHeight: 1 }}>{l.p}€</div>
            <div style={{ fontSize: 11, color: '#22C55E', fontWeight: 700, marginTop: 2 }}>Négociable</div>
          </div>
        </div>

        {/* facts */}
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { l: 'État', v: l.cond },
            { l: 'Marque', v: 'Olympus' },
            { l: 'Année', v: '1980' },
          ].map(f => (
            <div key={f.l} style={{ padding: 10, borderRadius: 12, background: '#fff', border: '1px solid #E6E9F0' }}>
              <div style={{ fontSize: 10, color: '#8696B0', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{f.l}</div>
              <div style={{ fontSize: 13, color: '#0A1F44', fontWeight: 600, marginTop: 2 }}>{f.v}</div>
            </div>
          ))}
        </div>

        {/* description */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>Description</div>
          <p style={{ fontSize: 14, color: '#2A3D6B', lineHeight: 1.55, margin: '6px 0 0' }}>
            Boîtier en parfait état, juste un peu d&rsquo;usure cosmétique. Cellule fonctionne nickel. Vendu avec le 50mm f/1.8, sangle d&rsquo;origine et housse cuir. Idéal pour démarrer l&rsquo;argentique.
          </p>
        </div>

        {/* seller */}
        <div style={{ marginTop: 20, padding: 14, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <window.Avatar initials={l.initials} hue={l.hue} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1F44' }}>{l.who}</div>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: '#F4B942', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800 }}>✓</div>
            </div>
            <div style={{ fontSize: 11, color: '#8696B0', marginTop: 1 }}>★ 4.9 · 12 ventes · répond en moins d&rsquo;1h</div>
          </div>
          <button style={{ width: 36, height: 36, borderRadius: 18, background: '#F1F3F8', border: 'none', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><M_I.user width={15} height={15} /></button>
        </div>

        {/* mutual / context */}
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(244,185,66,0.14)', border: '1px solid rgba(244,185,66,0.3)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex' }}>
            {['YL', 'MD'].map((c, i) => (
              <div key={i} style={{ marginLeft: i ? -8 : 0 }}><window.Avatar initials={c} hue={[220, 280][i]} size={24} /></div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#0A1F44', fontWeight: 600 }}><span style={{ color: '#B88A2A' }}>Yann</span> et <span style={{ color: '#B88A2A' }}>Mariam</span> connaissent le vendeur</div>
        </div>

        {/* similar */}
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Similaires</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {M_LISTINGS.slice(1, 5).map(s => (
              <div key={s.id} style={{ width: 140, flexShrink: 0, borderRadius: 14, background: '#fff', border: '1px solid #E6E9F0', overflow: 'hidden' }}>
                <window.PhotoBlock a={s.a} b={s.b} c={s.c} aspect="1/1" radius={0} />
                <div style={{ padding: 10 }}>
                  <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 14, color: '#0A1F44' }}>{s.p}€</div>
                  <div style={{ fontSize: 11, color: '#0A1F44', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.t}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* sticky CTA */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px 28px', background: 'rgba(248,249,251,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid #E6E9F0', display: 'flex', gap: 10 }}>
        <button style={{ width: 48, height: 48, borderRadius: 24, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><M_I.message width={18} height={18} /></button>
        <button style={{ flex: 1, height: 48, borderRadius: 24, background: 'linear-gradient(135deg, #F4B942, #B88A2A)', border: 'none', color: '#0A1F44', fontWeight: 800, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 12px 24px -10px rgba(244,185,66,0.6)' }}>
          <M_I.send width={15} height={15} /> Contacter Aïssata
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 03 · Favoris
// ─────────────────────────────────────────────────────────────
function MarketplaceFavoritesScreen() {
  const favs = M_LISTINGS.slice(0, 4);
  const dropped = M_LISTINGS[1];
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 90 }}>
      <div style={{ padding: '60px 20px 14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 700 }}>· Tes favoris</div>
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 36, color: '#0A1F44', margin: '4px 0 0', lineHeight: 1, fontWeight: 400, letterSpacing: '-0.02em' }}>
            <em style={{ fontStyle: 'italic' }}>Sauvegardé</em>
          </h1>
        </div>
        <button style={{ height: 32, padding: '0 12px', borderRadius: 16, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', fontSize: 12, fontWeight: 700 }}>Trier</button>
      </div>

      {/* tabs */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: '#F1F3F8', borderRadius: 14 }}>
          {[{ l: 'Objets', n: 12, on: true }, { l: 'Recherches', n: 3 }, { l: 'Vendeurs', n: 5 }].map(t => (
            <div key={t.l} style={{ flex: 1, height: 32, borderRadius: 10, background: t.on ? '#fff' : 'transparent', color: t.on ? '#0A1F44' : '#4B5B87', fontWeight: t.on ? 700 : 500, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: t.on ? '0 1px 2px rgba(10,31,68,0.06)' : 'none' }}>
              {t.l} <span style={{ fontSize: 10, opacity: 0.6 }}>· {t.n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* price drop banner */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ borderRadius: 16, background: 'linear-gradient(135deg, #FFF8E8, #fff)', border: '1px solid rgba(244,185,66,0.3)', padding: 12, display: 'flex', alignItems: 'center', gap: 12, position: 'relative', overflow: 'hidden' }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
            <window.PhotoBlock a={dropped.a} b={dropped.b} c={dropped.c} aspect="1/1" radius={0} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', color: '#B88A2A', fontWeight: 800, textTransform: 'uppercase' }}>↓ Prix baissé</div>
            <div style={{ fontSize: 13, color: '#0A1F44', fontWeight: 700, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dropped.t}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginTop: 2 }}>
              <span style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 18, color: '#0A1F44' }}>{dropped.p}€</span>
              <span style={{ fontSize: 12, color: '#8696B0', textDecoration: 'line-through' }}>110€</span>
            </div>
          </div>
          <button style={{ height: 30, padding: '0 12px', borderRadius: 15, background: '#0A1F44', color: '#FFF8E8', border: 'none', fontWeight: 800, fontSize: 11 }}>Voir</button>
        </div>
      </div>

      {/* fav list */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {favs.map(l => (
          <div key={l.id} style={{ display: 'flex', gap: 12, padding: 12, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0' }}>
            <div style={{ width: 90, height: 90, borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
              <window.PhotoBlock a={l.a} b={l.b} c={l.c} aspect="1/1" radius={0} />
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 18, color: '#0A1F44', lineHeight: 1 }}>{l.p}€</div>
                  <div style={{ fontSize: 12, color: '#0A1F44', fontWeight: 600, marginTop: 4, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.t}</div>
                </div>
                <div style={{ width: 30, height: 30, borderRadius: 15, background: '#F1F3F8', color: '#E0405D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <M_I.heart width={13} height={13} filled />
                </div>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8696B0' }}>
                <window.Avatar initials={l.initials} hue={l.hue} size={18} />
                {l.who} · {l.place}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { MarketplaceListScreen, MarketplaceDetailScreen, MarketplaceFavoritesScreen });
