# Handoff Claude Code · Refonte DIVARC

## TL;DR pour Claude Code

Tu vas implémenter cette refonte **dans le repo Next.js existant** (`DIVARC-lab/DIVARC-APP`), en remplaçant écran par écran les pages `app/(app)/**/page.tsx` actuelles. Les fichiers `feed-*.jsx` joints sont des **prototypes HTML/React standalone** — ce sont des **références de design**, pas du code à copier-coller. Tu dois recréer le look et les interactions dans le vrai codebase Next 16 + React 19 + Tailwind v4 + Supabase, en respectant ses patterns (Server Components par défaut, server actions, `lib/supabase/`, `components/ui/`).

Le design system est **déjà partiellement présent dans le repo** : `app/globals.css` définit déjà les tokens navy/gold/cream. La refonte les pousse plus loin avec **Instrument Serif italique** comme accent display et un usage plus prononcé du gold.

## Vue d'ensemble

15 sections, 48 écrans mobile + 2 desktop. Couvre l'intégralité du produit DIVARC :

| # | Section | Écrans | Statut repo |
|---|---|---|---|
| 1 | Brief & système | 1 | (doc) |
| 2 | Mobile · Sage | 4 | refonte de `app/(app)/feed/` |
| 3 | Mobile · Audacieux | 4 | variante visuelle |
| 4 | Prototype cliquable | 1 | (doc) |
| 5 | Flow étendu | 8 | onboarding, profil, notifs, recherche, messages, paramètres |
| 6 | Marketplace | 3 | nouvelle section |
| 7 | Jobs | 5 | refonte `app/(app)/jobs/` |
| 8 | Profil public | 3 | refonte `app/(app)/u/[username]/` |
| 9 | Création | 3 | nouveau flow `+` |
| 10 | Wallet | 4 | nouvelle section |
| 11 | Admin · modération | 4 | refonte `app/(app)/admin/` |
| 12 | États vides + erreurs | 5 | à appliquer partout |
| 13 | Stories | 4 | nouvelle feature |
| 14 | Cercles · groupes | 4 | nouvelle feature |
| 15 | Onboarding multi-step | 5 | refonte `app/(welcome)/` |
| 16 | Carte · géo | 4 | nouvelle feature `app/(app)/map/` |
| 17 | Desktop | 2 | layout 3 colonnes |

## Fidélité

**High-fidelity** : couleurs, typo, spacing, interactions sont définitifs. Tu dois reproduire au pixel près en utilisant les libs déjà présentes dans le repo (`lucide-react`, `@radix-ui/react-slot`, `clsx`, server actions). N'invente pas de nouveau composant si un existe déjà dans `components/ui/`.

---

## Design tokens

### Couleurs (déjà dans `app/globals.css`)

```css
--bg: #FFFFFF
--bg-deep: #F8F9FB        /* surfaces secondaires */
--fg: #0A1F44             /* navy — texte principal */
--fg-muted: #4B5B87       /* navy clair — texte secondaire */
--fg-faint: #8993A8       /* gris-bleu — labels, hints */
--line: #E6E9F0           /* borders standards */
--line-faint: #F0F2F7     /* dividers très légers */
--gold: #F4B942           /* accent principal */
--gold-deep: #B88A2A      /* gold foncé pour textes accent */
--gold-soft: rgba(244, 185, 66, 0.08)  /* fonds tintés */
--cream: #FFF8E8          /* texte sur navy + petits highlights */

/* États système */
--success: #6FB89F
--warning: #F4B942
--danger: #D4574E
--info: #2C4D8C

/* Catégories cercles */
--circle-comm: #6FB89F
--circle-social: #F4B942
--circle-cult: #8B7AB8
```

### Typographie

| Token | Famille | Usage |
|---|---|---|
| `font-sans` | **Geist** (déjà dans le repo, `next/font`) | UI, body, boutons, labels |
| `font-display` | **Instrument Serif** italic, 400 | titres, hero, prix, gros chiffres — **toujours italique** |
| `font-mono` | **Geist Mono** | codes incidents admin, montants |

**Échelle utilisée :**
- Hero display : 38–54px Instrument Serif italic, line-height 1.05, letter-spacing -0.02em
- H1 page : 28–32px Instrument Serif italic
- H2 carte : 22px Instrument Serif italic
- Body : 13.5–14.5px Geist 400/500
- Label kicker : 11px Geist 800, letter-spacing 0.16–0.18em, UPPERCASE, couleur `gold-deep`, préfixé d'un `·`
- Caption : 11–12px Geist 600/700

### Spacing

Échelle 4 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 24px. Padding standard cards : 12–16px. Padding section : 16–18px horizontal.

### Radius

| Usage | Valeur |
|---|---|
| Cards principales | 14px |
| Cards secondaires | 12px |
| Pills / chips / boutons | 999px (full) |
| Avatars carrés / tiles | 14–18px |
| FAB / bouton circulaire | 50% |
| Cover image | 18px |
| Inputs | 999px (search) ou 12px (textarea) |

### Shadows

```css
/* Cards élevées */
box-shadow: 0 4px 14px rgba(10, 31, 68, 0.06);
/* FAB / éléments flottants */
box-shadow: 0 8px 22px rgba(244, 185, 66, 0.5);
/* Hero / event card highlight */
box-shadow: 0 12px 28px rgba(10, 31, 68, 0.12);
/* Dialog / modal */
box-shadow: 0 16px 40px rgba(0, 0, 0, 0.14);
```

---

## Patterns récurrents (à extraire en composants `components/ui/`)

### `<KickerLabel>` — préfixe section
Présent partout en haut de page/section.
```tsx
<div className="text-[11px] tracking-[0.18em] uppercase text-[var(--gold-deep)] font-extrabold">
  · Cercles
</div>
```

### `<DisplayHeading>` — h1 italique
Avec accent gold sur un mot clé.
```tsx
<h1 className="font-display italic text-[32px] leading-[1.05] tracking-[-0.02em]">
  Tes <span className="text-[var(--gold-deep)]">5 cercles</span>
</h1>
```

### `<ArcDeco>` — élément graphique signature
Arc concentriques navy/gold. Présent dans le repo : `components/marketing/ArcMark.tsx`. Utilisé en watermark sur les heros, covers, tiles. Toujours en absolute, opacity 0.18–0.55, débordant d'un côté.

### `<Avatar>` — déjà dans `components/ui/Avatar.tsx`
4 tailles (sm/md/lg/xl), fallback initials sur fond pastel (`#C8D2E5`, `#F4B942`, `#6FB89F`, `#D97757`, `#8B7AB8`).

### Pattern "date pill" (événements)
```tsx
<div className="w-14 py-2.5 rounded-xl bg-[var(--bg-deep)] border border-[var(--line)] text-center">
  <div className="text-[9.5px] tracking-[0.14em] uppercase text-[var(--gold-deep)] font-extrabold">SAM</div>
  <div className="font-display italic text-[26px] leading-none mt-0.5">11</div>
  <div className="text-[9.5px] opacity-70 mt-px">mai</div>
</div>
```

### Pattern "stat tile"
3-4 stats côte à côte en grid. Chiffre en Instrument Serif italic 22–28px, label dessous en Geist 800 10–11px UPPERCASE.

### Pattern "filter chip row"
Chips horizontales scrollables. Chip sélectionné : fond navy `#0A1F44`, texte cream `#FFF8E8`. Non sélectionné : fond `#F8F9FB`, border `#E6E9F0`, texte `#4B5B87`.

### Pattern "post épinglé"
Card sur fond `gold-soft` avec border `rgba(244,185,66,0.3)` et kicker "ÉPINGLÉ" gold avec icône.

### Pattern "header de page"
1. Kicker label (gold)
2. Display heading italique (28–38px)
3. Sous-titre Geist 13px `text-fg-muted`
Padding `6–8px 18px 14px`.

### Pattern "écran sombre" (capture, viewer story, hors ligne)
Fond `#0A1F44` avec gradient `linear-gradient(180deg, #1F3563 0%, #0A1F44 60%, #050E22 100%)`. ArcDeco en watermark à 0.35–0.55. Status bar en cream.

### Pattern "card élévée"
Background `#FFF`, border `1px solid var(--line)`, radius 14px, padding 12–16px. Pas de shadow par défaut — la border suffit.

### Pattern "FAB"
54×54px, fond `var(--gold)`, position absolute bottom-right (28px, 18px), shadow `0 8px 22px rgba(244,185,66,0.5)`. Icône `Plus` lucide 22×22 strokeWidth 2.6.

### Pattern "tab bar (in-page)"
Border-bottom `1px solid var(--line)`. Tab actif : font-weight 800, color `var(--fg)`, border-bottom `2px solid var(--gold)`. Inactif : font 600, color `var(--fg-faint)`.

### Pattern "bottom nav app"
5 icônes (Home, Compass, Plus central, Briefcase, User). Plus est gold 50×50px FAB. Hauteur barre : 78px. Background blanc avec border-top.

---

## Mapping écran → page Next.js du repo

| Écran proto | Fichier ref | Page Next.js cible |
|---|---|---|
| Mobile Sage / Bold Feed | `feed-mobile-sage.jsx`, `feed-mobile-bold.jsx` | `app/(app)/feed/page.tsx` (variantes via tweak ou A/B) |
| Détail post | `feed-mobile-sage.jsx#SageDetailScreen` | `app/(app)/feed/[id]/page.tsx` |
| Composer | `feed-mobile-sage.jsx#SageComposerScreen` | `app/(app)/feed/_components/PostComposer.tsx` |
| Onboarding | `feed-extra-screens.jsx#OnboardingScreen` | `app/(welcome)/onboarding/page.tsx` (à créer) |
| Profil (toi) | `feed-extra-screens.jsx#MyProfileScreen` | `app/(app)/profile/page.tsx` |
| Profil public | `feed-profile.jsx` (3 onglets) | `app/(app)/u/[username]/page.tsx` |
| Notifications | `feed-extra-screens.jsx#NotificationsScreen` | `app/(app)/notifications/page.tsx` |
| Recherche | `feed-extra-screens.jsx#SearchScreen` | `app/(app)/search/page.tsx` |
| Messages liste | `feed-extra-screens.jsx#MessagesListScreen` | `app/(app)/messages/page.tsx` |
| Messages chat | `feed-extra-screens.jsx#ChatScreen` | `app/(app)/messages/[id]/page.tsx` |
| Paramètres | `feed-extra-screens.jsx#SettingsScreen` | `app/(app)/settings/page.tsx` |
| Marketplace browse | `feed-marketplace.jsx#MarketplaceListScreen` | `app/(app)/marketplace/page.tsx` (à créer) |
| Listing détail | `feed-marketplace.jsx#MarketplaceDetailScreen` | `app/(app)/marketplace/[id]/page.tsx` |
| Favoris marketplace | `feed-marketplace.jsx#MarketplaceFavoritesScreen` | `app/(app)/marketplace/favorites/page.tsx` |
| Jobs liste | `feed-jobs.jsx#JobsListScreen` | `app/(app)/jobs/page.tsx` |
| Jobs détail | `feed-jobs.jsx#JobDetailScreen` | `app/(app)/jobs/[id]/page.tsx` |
| Apply dialog | `feed-jobs.jsx#JobApplyScreen` | `app/(app)/jobs/[id]/_components/ApplyDialog.tsx` |
| Mes candidatures | `feed-jobs-mine.jsx#JobsAppliedScreen` | `app/(app)/jobs/applied/page.tsx` |
| Mes offres | `feed-jobs-mine.jsx#JobsMineScreen` | `app/(app)/jobs/mine/page.tsx` |
| Création (sheet) | `feed-create.jsx#CreateChooseScreen` | `app/(app)/_components/CreateSheet.tsx` (modal global) |
| Créer annonce | `feed-create.jsx#CreateListingScreen` | `app/(app)/marketplace/new/page.tsx` |
| Créer offre job | `feed-create.jsx#CreateJobScreen` | `app/(app)/jobs/new/page.tsx` |
| Wallet | `feed-wallet.jsx` (4 écrans) | `app/(app)/wallet/**` (à créer) |
| Admin | `feed-admin.jsx` (4 écrans) | `app/(app)/admin/**` (refonte) |
| États vides | `feed-empty.jsx` (5 écrans) | composants partagés `components/empty-states/` |
| Stories capture/edit | `feed-stories.jsx` (4 écrans) | `app/(app)/stories/**` (à créer) |
| Cercles | `feed-circles.jsx` (4 écrans) | `app/(app)/circles/**` (à créer) |
| Desktop | `feed-desktop.jsx` | layout 3 cols dans `app/(app)/layout.tsx` à `lg:` breakpoint |

---

## Comment lire les fichiers `feed-*.jsx`

Chaque fichier est un module **standalone** qui :
1. Définit des composants React (sans imports — JSX inline transpilé par Babel-standalone)
2. Utilise des **styles inline** (pas de CSS modules, pas de Tailwind dans les protos) — c'est volontaire pour la prototypage rapide
3. Expose ses screens via `Object.assign(window, {...})`
4. Mocke les données : voir `feed-shared.jsx` pour les tableaux `STORIES`, `POSTS`, etc.

**Quand tu portes vers le repo :**
- Remplace les styles inline par Tailwind (les couleurs sont déjà des CSS vars dans `globals.css`)
- Remplace les SVG inline par les icônes lucide-react équivalentes (voir `Icon = {...}` dans `feed-shared.jsx`)
- Remplace les `Avatar` proto par `<Avatar />` du repo (`components/ui/Avatar.tsx`)
- Utilise `next/image` pour les vraies images, pas les placeholders à gradient
- Branche les data sur Supabase via les server actions existantes (`actions.ts` dans chaque dossier feature)
- Toutes les interactions doivent passer par des **server actions** (pattern actuel du repo) sauf interactions purement client (drag carousel, toggle filtre)

---

## Tweaks intégrés au prototype

Le prototype expose un panneau de tweaks (bottom-right) qui permet de basculer :
- **Thème** : light / dark / auto — implémenter via `next-themes`, classe `dark:` Tailwind. Le mode dark = fond `#050E22`, surfaces `#0A1F44`, texte `#FFF8E8`.
- **Densité** : compact / regular / comfy — variable CSS `--density-y: 4px | 8px | 12px` qui affecte le padding vertical des cards
- **Gold intensity** : discret / standard / poussé — multiplicateur d'opacité sur tous les éléments gold, et présence/absence des ArcDeco watermarks
- **Cards** : flat / bordered / elevated — toggle entre 0 shadow / border seule / shadow

**Pas obligatoire** d'implémenter ces tweaks en prod — c'était pour la review design. Choisir UNE config par défaut : `regular` densité, `standard` gold, `bordered` cards, light theme avec dark auto.

---

## Interactions clés à reproduire

### Feed
- **Pull-to-refresh** : iOS-style, charge nouveaux posts avec optimistic update
- **Like** : optimistic, server action, animation cœur 200ms ease-out scale 1 → 1.3 → 1
- **Stories tap** : ouvre viewer plein écran, progression auto 5s/story, tap droite/gauche pour naviguer
- **Composer** : sheet bottom-up, image picker, tag de cercle, audience (Public / Cercles / Privé)

### Marketplace
- **Favori** : toggle gold heart, optimistic, persisté sur user
- **Carousel galerie** : swipe horizontal, indicateurs en bas, image fullscreen au tap
- **Catégories** : chips scrollables, multi-select pas obligatoire (single pour v1)

### Jobs
- **Apply** : ouvre `ApplyDialog` (déjà existant), pré-remplit avec profil DIVARC, message custom optionnel
- **Salaire slider** dans création : range 25k-150k€, step 5k

### Cercles
- **Join public** : 1 clic, optimistic
- **Join privé** : doit avoir une invitation, ou demande au modo
- **Événement Y aller** : toggle, badge "X y vont" mis à jour

### Stories
- **Capture** : passe par `getUserMedia` (caméra), 4 modes (Texte / Photo / Vidéo / Boomerang)
- **Édition** : drag stickers, tap pour les déplacer, pinch pour redimensionner
- **Filtres** : 6 presets via CSS `filter: ...` — Original, Doré (warmth +20, sat +10), Crème (sépia 30%), Nuit (brightness 0.7, contrast 1.2), Pellicule (saturate 0.7, hue-rotate 8deg), Argent (greyscale 1, contrast 1.1)
- **Stickers** : sticker question = textarea inline avec couleur fond éditable

### Wallet
- **KYC flow** : multi-step (identité, RIB, vérification), bloque les retraits tant que non validé
- **Frais 2,5%** : afficher décomposition à chaque transaction
- **SEPA gratuit** : 1-3 jours ouvrés, badge "Gratuit"

### Admin
- **File de signalements** : tri par sévérité (haute → basse), action quick (Avertir / Retirer / Bannir)
- **Preview du contenu signalé** dans le détail
- **Audit log** : chaque action admin loggée avec actor + target + timestamp

---

## Responsive

Mobile = base. Breakpoints à appliquer :
- `sm: 640px` — étirement des cards en pleine largeur
- `md: 768px` — tablet, max-width 720px centré, ajout d'un drawer latéral
- `lg: 1024px` — layout 3 colonnes desktop : nav gauche (260px) · feed (640px) · suggestions (340px)
- `xl: 1280px` — voir `feed-desktop.jsx`

---

## États vides — à appliquer partout

Voir `feed-empty.jsx`. 5 patterns à extraire en composants partagés `components/empty-states/` :

1. **EmptyFeedState** — premier login ou pas de follows
2. **EmptySearchState** — query sans résultat (passer query + suggestions en props)
3. **OfflineState** — détection via `navigator.onLine` + service worker (`public/sw.js` existe déjà)
4. **NotFoundState** — 404 page (`app/not-found.tsx`)
5. **ServerErrorState** — 503 / `app/error.tsx`

Chaque empty state doit :
- Avoir une illustration (ArcDeco + satellites ou icône lucide grande)
- Un titre Instrument Serif italic
- 2-3 lignes d'explication
- Un CTA primaire (bouton gold) + lien secondaire texte

---

## Accessibilité

- Tous les boutons/icônes : `aria-label`
- Tabs : `role="tablist"`, `role="tab"`, `aria-selected`
- Carousel galerie : `aria-roledescription="carousel"`, navigation clavier ←/→
- Stories viewer : escape pour fermer, espace pour pause, ←/→ pour naviguer
- Contraste : navy `#0A1F44` sur cream `#FFF8E8` = AAA. Gold `#F4B942` sur navy = AAA. Gold sur blanc → ne **jamais** mettre de texte gold sur blanc, utiliser `gold-deep #B88A2A` qui est AA.
- Focus rings : `outline: 2px solid var(--gold)` + `outline-offset: 2px`
- Reduce motion : honorer `prefers-reduced-motion` pour les ArcDeco animées (Logo.tsx anime déjà)

---

## Fichiers livrés (références)

```
design_handoff_divarc_refonte/
├── README.md                       ← ce fichier
├── DIVARC Feed Redesign.html       ← prototype maître (charge tous les feed-*.jsx)
├── feed-shared.jsx                 ← données mockées + Icon + Avatar + ArcDeco
├── feed-mobile-sage.jsx            ← 4 écrans direction sage
├── feed-mobile-bold.jsx            ← 4 écrans direction audacieuse
├── feed-desktop.jsx                ← desktop sage + bold (3 colonnes)
├── feed-prototype.jsx              ← mini-app cliquable
├── feed-extra-screens.jsx          ← 8 écrans (onboarding, profil, notifs, search, messages, settings)
├── feed-marketplace.jsx            ← 3 écrans marketplace
├── feed-jobs.jsx                   ← 3 écrans jobs
├── feed-jobs-mine.jsx              ← 2 écrans (mes candidatures, mes offres)
├── feed-profile.jsx                ← 3 écrans profil public /u/[username]
├── feed-create.jsx                 ← 3 écrans création
├── feed-wallet.jsx                 ← 4 écrans wallet
├── feed-admin.jsx                  ← 4 écrans admin
├── feed-empty.jsx                  ← 5 écrans états vides
├── feed-stories.jsx                ← 4 écrans stories
├── feed-circles.jsx                ← 4 écrans cercles
├── feed-onboarding.jsx             ← 5 écrans onboarding multi-step
├── feed-map.jsx                    ← 4 écrans carte / géo
├── feed-tweaks.jsx                 ← panneau de tweaks (à ne PAS porter en prod)
├── tweaks-panel.jsx                ← shell tweaks (à ne PAS porter)
├── design-canvas.jsx               ← canvas de présentation (à ne PAS porter)
└── ios-frame.jsx                   ← bezel iPhone (à ne PAS porter)
```

**Pour ouvrir le prototype localement** : ouvrir `DIVARC Feed Redesign.html` dans un navigateur. Tous les `feed-*.jsx` doivent être au même niveau.

---

## Plan d'attaque suggéré

1. **Phase 0 — Tokens** : confirme que `app/globals.css` matche bien le tableau des couleurs ci-dessus. Ajoute Instrument Serif via `next/font/google`. Crée `components/ui/KickerLabel.tsx`, `DisplayHeading.tsx`, `ArcDeco.tsx` (existe déjà), `EmptyState.tsx`.
2. **Phase 1 — Feed** : refonte `app/(app)/feed/page.tsx` + composants `_components/`. C'est le cœur.
3. **Phase 2 — Profil & Jobs** : ils existent déjà dans le repo, refonte cosmétique uniquement.
4. **Phase 3 — Marketplace & Wallet & Stories & Cercles** : nouvelles features. Créer routes, schémas Supabase (voir `lib/database.types.ts` pour le pattern), server actions.
5. **Phase 4 — États vides + 404 + 503** : composants partagés.
6. **Phase 5 — Desktop layout** : breakpoint `lg:` dans `app/(app)/layout.tsx`, sidebar + suggestions.

---

## Questions pour le PM/designer si bloqué

- Confirmation du naming Wallet (DIVARC Wallet ? Pay ? Cagnotte ?)
- Politique de modération admin : suspension automatique > X signalements ?
- Stories : conservation 24h comme convention, ou archive permanente ?
- Cercles privés : modèle d'invitation (par lien, par membre seulement, par modo) ?
