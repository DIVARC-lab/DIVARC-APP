// Création — 3 mobile screens : choisir type, créer annonce (marketplace), créer offre emploi.

const C_I = window.Icon;

// 01 · Choix de type (sheet style)
function CreateChooseScreen() {
  const opts = [
    { id: 'post', l: 'Publier un post', s: 'Texte, photo, sondage', i: 'sparkle', c: '#0A1F44' },
    { id: 'listing', l: 'Vendre un objet', s: 'Mise en ligne en 30 sec.', i: 'shop', c: '#B88A2A', hot: true },
    { id: 'job', l: 'Publier une offre', s: 'CDI, freelance, mission', i: 'brief', c: '#142A55' },
    { id: 'event', l: 'Organiser un événement', s: 'Atelier, meetup, soirée', i: 'sparkles', c: '#0A1F44' },
    { id: 'story', l: 'Story', s: 'Visible 24 h', i: 'image', c: '#B88A2A' },
  ];
  return (
    <div style={{ background: 'rgba(10,31,68,0.4)', minHeight: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.3, padding: 20 }}>
        <div style={{ marginTop: 60, height: 30, width: '60%', borderRadius: 8, background: '#fff' }} />
        <div style={{ marginTop: 12, height: 100, borderRadius: 18, background: '#fff' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#F8F9FB', borderRadius: '28px 28px 0 0', boxShadow: '0 -30px 80px -20px rgba(10,31,68,0.5)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E6E9F0' }} />
        </div>
        <div style={{ padding: '14px 24px 6px' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Que veux-tu créer ?</div>
          <div style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 26, color: '#0A1F44', lineHeight: 1.1, marginTop: 4, fontWeight: 400 }}>
            Choisis un <em style={{ fontStyle: 'italic' }}>format</em>.
          </div>
        </div>
        <div style={{ padding: '14px 16px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {opts.map(o => {
            const Ic = C_I[o.i] || C_I.sparkle;
            return (
              <div key={o.id} style={{ padding: 14, borderRadius: 18, background: '#fff', border: o.hot ? '1.5px solid rgba(244,185,66,0.45)' : '1px solid #E6E9F0', display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: o.c, color: o.id === 'listing' ? '#FFF8E8' : '#FFF8E8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Ic width={18} height={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, color: '#0A1F44', fontWeight: 700 }}>{o.l}</span>
                    {o.hot ? <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 5, background: '#FFF8E8', color: '#B88A2A', fontWeight: 800, letterSpacing: '0.06em' }}>POPULAIRE</span> : null}
                  </div>
                  <div style={{ fontSize: 12, color: '#8696B0', marginTop: 2 }}>{o.s}</div>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: 14, background: '#F1F3F8', color: '#4B5B87', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>›</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 02 · Annonce marketplace
function CreateListingScreen() {
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 100, position: 'relative' }}>
      <div style={{ padding: '56px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><C_I.arrowLeft width={15} height={15} /></button>
        <div style={{ fontSize: 12, color: '#8696B0', fontWeight: 600 }}>Étape 1/2</div>
        <button style={{ height: 30, padding: '0 12px', borderRadius: 15, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', fontSize: 12, fontWeight: 700 }}>Brouillon</button>
      </div>

      <div style={{ padding: '8px 24px 0' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Nouvelle annonce</div>
        <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 28, color: '#0A1F44', margin: '4px 0 0', fontWeight: 400, lineHeight: 1.05 }}>
          Vends en <em style={{ fontStyle: 'italic' }}>30 secondes</em>.
        </h1>
      </div>

      {/* progress */}
      <div style={{ padding: '14px 24px 0' }}>
        <div style={{ height: 4, borderRadius: 2, background: '#E6E9F0', overflow: 'hidden' }}>
          <div style={{ width: '50%', height: '100%', background: 'linear-gradient(90deg, #F4B942, #B88A2A)' }} />
        </div>
      </div>

      <div style={{ padding: '18px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* photos */}
        <div>
          <div style={{ fontSize: 11, color: '#0A1F44', fontWeight: 700, padding: '0 8px 8px' }}>Photos · 2/8</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={{ aspectRatio: '1', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
              <window.PhotoBlock a="#F4B942" b="#B88A2A" c="#0A1F44" aspect="1/1" radius={0} />
              <div style={{ position: 'absolute', top: 6, left: 6, fontSize: 9, padding: '3px 7px', borderRadius: 6, background: 'rgba(10,31,68,0.7)', color: '#FFF8E8', fontWeight: 800 }}>★ COUV</div>
            </div>
            <div style={{ aspectRatio: '1', borderRadius: 14, overflow: 'hidden' }}>
              <window.PhotoBlock a="#0A1F44" b="#142A55" c="#F4B942" aspect="1/1" radius={0} />
            </div>
            <div style={{ aspectRatio: '1', borderRadius: 14, background: '#fff', border: '1.5px dashed #B0BACA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#4B5B87' }}>
              <C_I.plus width={18} height={18} />
              <span style={{ fontSize: 10, fontWeight: 700 }}>Ajouter</span>
            </div>
          </div>
        </div>

        {/* title */}
        <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1.5px solid #F4B942', boxShadow: '0 0 0 4px rgba(244,185,66,0.12)' }}>
          <div style={{ fontSize: 10, color: '#B88A2A', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Titre</div>
          <div style={{ fontSize: 16, color: '#0A1F44', fontWeight: 600, marginTop: 4 }}>Olympus OM-2 + 50mm f/1.8<span style={{ display: 'inline-block', width: 1, height: 16, background: '#F4B942', marginLeft: 1, verticalAlign: 'middle' }}>{'\u200B'}</span></div>
        </div>

        {/* price + cat */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #E6E9F0' }}>
            <div style={{ fontSize: 10, color: '#8696B0', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Prix</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <span style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 24, color: '#0A1F44' }}>185</span>
              <span style={{ fontSize: 13, color: '#8696B0', fontWeight: 700 }}>€</span>
            </div>
          </div>
          <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #E6E9F0' }}>
            <div style={{ fontSize: 10, color: '#8696B0', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Catégorie</div>
            <div style={{ fontSize: 14, color: '#0A1F44', fontWeight: 700, marginTop: 4 }}>Photo ›</div>
          </div>
        </div>

        {/* condition */}
        <div>
          <div style={{ fontSize: 11, color: '#0A1F44', fontWeight: 700, padding: '0 8px 8px' }}>État</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Neuf', 'Comme neuf', 'Très bon état', 'Bon état', 'État correct'].map((s, i) => (
              <span key={s} style={{ height: 32, padding: '0 12px', borderRadius: 16, background: i === 2 ? '#0A1F44' : '#fff', color: i === 2 ? '#FFF8E8' : '#4B5B87', fontWeight: i === 2 ? 700 : 500, fontSize: 12, display: 'inline-flex', alignItems: 'center', border: i === 2 ? 'none' : '1px solid #E6E9F0' }}>{s}</span>
            ))}
          </div>
        </div>

        {/* description */}
        <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #E6E9F0' }}>
          <div style={{ fontSize: 10, color: '#8696B0', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Description</div>
          <div style={{ fontSize: 13, color: '#8696B0', marginTop: 6, lineHeight: 1.4 }}>Décris l'objet, son histoire, ses petits défauts…</div>
        </div>

        {/* lieu */}
        <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: '#F1F3F8', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><C_I.compass width={14} height={14} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#8696B0', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Lieu</div>
            <div style={{ fontSize: 13, color: '#0A1F44', fontWeight: 700, marginTop: 1 }}>Dakar · Plateau</div>
          </div>
          <span style={{ fontSize: 18, color: '#4B5B87' }}>›</span>
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px 28px', background: 'rgba(248,249,251,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid #E6E9F0', display: 'flex', gap: 10 }}>
        <button style={{ width: 48, height: 48, borderRadius: 24, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><C_I.image width={17} height={17} /></button>
        <button style={{ flex: 1, height: 48, borderRadius: 24, background: 'linear-gradient(135deg, #F4B942, #B88A2A)', border: 'none', color: '#0A1F44', fontWeight: 800, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 12px 24px -10px rgba(244,185,66,0.6)' }}>
          Continuer · Aperçu
        </button>
      </div>
    </div>
  );
}

// 03 · Offre emploi
function CreateJobScreen() {
  return (
    <div style={{ background: '#F8F9FB', minHeight: '100%', paddingBottom: 100, position: 'relative' }}>
      <div style={{ padding: '56px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={{ width: 36, height: 36, borderRadius: 18, background: '#fff', border: '1px solid #E6E9F0', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><C_I.arrowLeft width={15} height={15} /></button>
        <div style={{ fontSize: 12, color: '#8696B0', fontWeight: 600 }}>Étape 2/3</div>
        <button style={{ height: 30, padding: '0 12px', borderRadius: 15, background: '#FFF8E8', border: '1px solid rgba(244,185,66,0.4)', color: '#B88A2A', fontSize: 12, fontWeight: 700 }}>Aperçu</button>
      </div>

      <div style={{ padding: '8px 24px 0' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#B88A2A', fontWeight: 800 }}>· Nouvelle offre</div>
        <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 28, color: '#0A1F44', margin: '4px 0 0', fontWeight: 400, lineHeight: 1.05 }}>
          Recrute en <em style={{ fontStyle: 'italic' }}>confiance</em>.
        </h1>
      </div>

      {/* progress */}
      <div style={{ padding: '14px 24px 0', display: 'flex', gap: 6 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= 2 ? '#0A1F44' : '#E6E9F0' }} />
        ))}
      </div>

      <div style={{ padding: '18px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* title */}
        <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #E6E9F0' }}>
          <div style={{ fontSize: 10, color: '#8696B0', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Intitulé du poste</div>
          <div style={{ fontSize: 15, color: '#0A1F44', fontWeight: 600, marginTop: 4 }}>Designer Produit Senior</div>
        </div>

        {/* type + cat */}
        <div>
          <div style={{ fontSize: 11, color: '#0A1F44', fontWeight: 700, padding: '0 8px 8px' }}>Type de contrat</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ l: 'CDI', e: '💼' }, { l: 'CDD', e: '📋' }, { l: 'Freelance', e: '🌍' }, { l: 'Stage', e: '🎓' }, { l: 'Mission', e: '⚡' }].map((t, i) => (
              <span key={t.l} style={{ height: 36, padding: '0 14px', borderRadius: 18, background: i === 0 ? '#0A1F44' : '#fff', color: i === 0 ? '#FFF8E8' : '#4B5B87', fontWeight: i === 0 ? 700 : 500, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, border: i === 0 ? 'none' : '1px solid #E6E9F0' }}>{t.e} {t.l}</span>
            ))}
          </div>
        </div>

        {/* mode + lieu */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #E6E9F0' }}>
            <div style={{ fontSize: 10, color: '#8696B0', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Mode</div>
            <div style={{ fontSize: 14, color: '#0A1F44', fontWeight: 700, marginTop: 4 }}>🏠 Hybride ›</div>
          </div>
          <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1px solid #E6E9F0' }}>
            <div style={{ fontSize: 10, color: '#8696B0', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Lieu</div>
            <div style={{ fontSize: 14, color: '#0A1F44', fontWeight: 700, marginTop: 4 }}>Dakar ›</div>
          </div>
        </div>

        {/* salary */}
        <div style={{ padding: 14, borderRadius: 16, background: 'linear-gradient(135deg, #FFF8E8, #fff)', border: '1px solid rgba(244,185,66,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 10, color: '#B88A2A', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Rémunération</div>
            <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, background: 'rgba(34,197,94,0.15)', color: '#16A34A', fontWeight: 800 }}>● Affichée</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            <span style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 24, color: '#0A1F44' }}>1800–2400 €</span>
            <span style={{ fontSize: 12, color: '#8696B0', fontWeight: 700 }}>/ mois</span>
          </div>
          {/* slider */}
          <div style={{ marginTop: 10, height: 24, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 11, height: 3, borderRadius: 2, background: '#E6E9F0' }} />
            <div style={{ position: 'absolute', left: '20%', right: '15%', top: 11, height: 3, borderRadius: 2, background: 'linear-gradient(90deg, #F4B942, #B88A2A)' }} />
            <div style={{ position: 'absolute', left: '20%', top: 6, width: 14, height: 14, borderRadius: 7, background: '#fff', border: '2px solid #B88A2A', transform: 'translateX(-50%)' }} />
            <div style={{ position: 'absolute', left: '85%', top: 6, width: 14, height: 14, borderRadius: 7, background: '#fff', border: '2px solid #B88A2A', transform: 'translateX(-50%)' }} />
          </div>
        </div>

        {/* description */}
        <div style={{ padding: 14, borderRadius: 16, background: '#fff', border: '1.5px solid #F4B942', boxShadow: '0 0 0 4px rgba(244,185,66,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, color: '#B88A2A', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Description</div>
            <span style={{ fontSize: 10, color: '#8696B0' }}>438 / 2000</span>
          </div>
          <div style={{ fontSize: 13, color: '#2A3D6B', lineHeight: 1.5, marginTop: 6 }}>
            On cherche un·e Designer Produit Senior pour porter la vision de notre app mobile. Tu travailleras avec le PM, l&rsquo;eng et le research…
            <span style={{ display: 'inline-block', width: 1, height: 14, background: '#F4B942', marginLeft: 1, verticalAlign: 'middle' }}>{'\u200B'}</span>
          </div>
        </div>

        {/* AI assist */}
        <div style={{ padding: 12, borderRadius: 14, background: 'rgba(10,31,68,0.04)', border: '1px solid #E6E9F0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg, #F4B942, #B88A2A)', color: '#0A1F44', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><C_I.sparkles width={14} height={14} /></div>
          <div style={{ flex: 1, fontSize: 12, color: '#0A1F44', fontWeight: 600 }}>
            Améliore mon offre <span style={{ color: '#8696B0', fontWeight: 500 }}>· suggestions IA</span>
          </div>
          <span style={{ fontSize: 18, color: '#4B5B87' }}>›</span>
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px 28px', background: 'rgba(248,249,251,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid #E6E9F0', display: 'flex', gap: 10 }}>
        <button style={{ flex: '0 0 auto', height: 48, padding: '0 18px', borderRadius: 24, background: '#fff', border: '1px solid #E6E9F0', color: '#4B5B87', fontWeight: 700, fontSize: 13 }}>Précédent</button>
        <button style={{ flex: 1, height: 48, borderRadius: 24, background: '#0A1F44', border: 'none', color: '#FFF8E8', fontWeight: 800, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 12px 24px -10px rgba(10,31,68,0.5)' }}>
          Continuer · Aperçu
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { CreateChooseScreen, CreateListingScreen, CreateJobScreen });
