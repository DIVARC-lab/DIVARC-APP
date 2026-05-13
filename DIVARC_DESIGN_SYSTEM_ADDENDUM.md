# DIVARC Design System — Addendum (mai 2026)

> **Statut** : Source de vérité pour appliquer le Design System DIVARC sur le code existant. Cet addendum complète et **prévaut sur** le document `DIVARC Design System — Documentation Maîtresse` quand il y a conflit, car il reflète la **réalité du code** au 14 mai 2026.

---

## 0. Pourquoi cet addendum existe

Le document DS Maître a été rédigé en référence à un projet React + Vite théorique. DIVARC est en réalité un projet **Next.js 16 App Router + Tailwind v4** avec **~80 % du DS déjà implémenté** sous d'autres noms. Appliquer le DS Maître à la lettre créerait un système parallèle et casserait l'existant.

Cet addendum est le **pont** entre les deux. Tout agent qui modifie l'UI doit lire **les deux documents** : le Maître pour la philosophie + scope visuel ; cet addendum pour les noms, classes et composants réels.

---

## 1. Stack obligatoire (remplace § « Stack technique obligatoire » du Maître)

- **Framework** : Next.js 16 App Router (RSC + Server Actions, `"use client"` / `"use server"` directives obligatoires).
- **Routing** : `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`, `redirect`, `notFound`). **Jamais** `react-router-dom`.
- **Liens** : `next/link`. **Jamais** `<a href>` interne.
- **Images** : `next/image` pour tout asset > 100×100. Lazy-load par défaut, AVIF/WebP automatique.
- **Styling** : Tailwind v4 via **`@theme inline` dans `app/globals.css`** (pas de `tailwind.config.js`).
- **Composants primitifs** : Réutiliser `components/ui/*` (voir § 5). **Pas de shadcn/ui** ajouté.
- **Icons** : Lucide React (déjà 403 imports en place).
- **Animations** : Tailwind (`animate-*`) pour simples, Framer Motion uniquement si chorégraphie complexe.
- **Forms** : React Hook Form + Zod.
- **State server** : Server Components + Server Actions (pas TanStack Query sauf cas spécifiques).
- **State client** : `useState` / `useReducer` ou Zustand pour cross-route (ex. `CreatorProvider`).
- **i18n** : pas de i18next pour V1 — FR hard-coded.
- **Auth** : `lib/supabase/server.ts` (server) et `lib/supabase/client.ts` (client). Toujours `await createClient()` côté server.

**Avant tout commit** : `pnpm build` (pas juste `pnpm exec tsc`) doit passer.

---

## 2. Tokens couleurs : mapping DS théorique → DIVARC réel

Le DS Maître nomme les tokens `navy-900`, `gold-500`, `cream-50`. **DIVARC utilise** : `night`, `gold`, `cream`. **Toujours utiliser les noms DIVARC**.

### 2.1 Palette canonique DIVARC

| Classe Tailwind DIVARC | HEX | Équivalent DS Maître | Usage |
|---|---|---|---|
| `text-night` / `bg-night` | `#0a1f44` | `navy-900` | Texte titres + corps + CTA principal |
| `text-night-soft` | `#142a55` | `navy-800` | Sous-titres |
| `text-night-muted` | `#2a3d6b` | `navy-700` | Texte tertiaire / hover navy |
| `text-night-dim` | `#4b5b87` | `text-secondary` | Hints, labels meta |
| `text-gold` / `bg-gold` | `#f4b942` | `gold-500` | Italiques titres, FAB, badges, CTA gold |
| `bg-gold-soft` | `#f8cd76` | `gold-400` | Hover gold |
| `text-gold-deep` | `#b88a2a` | `gold-700` | Kicker labels uppercase, accents fins |
| `bg-cream` / `text-cream` | `#fff8e8` | `cream-50` | Background ambient + texte sur navy |
| `bg-bg-soft` | `#f8f9fb` | `cream-100` / surface secondaire | Surfaces neutres |
| `bg-white` | `#ffffff` | `surface` | Cards principales |
| `border-line` | `#e6e9f0` | `border` | Border standard |
| `border-line-strong` | (≈ `#d4cdb8`) | `border-strong` | Border accentuée |
| `text-terra` | `#d97757` | accent rare | Avatars / accents spéciaux |
| `bg-online` | `#4caf50` | `success` | Dot en ligne |

### 2.2 Tokens manquants à compléter dans `globals.css`

Pour combler les trous du DS Maître, **ajouter** dans `@theme inline` :

```css
/* Status colors (manquent) */
--color-success: #4caf50;
--color-success-bg: #e8f5e9;
--color-warning: #ff9800;
--color-warning-bg: #fff3e0;
--color-error: #e53935;
--color-error-bg: #ffebee;
--color-info: #2196f3;

/* Avatars déterministes — hash username → couleur stable */
--color-avatar-teal: #7bb5b0;
--color-avatar-coral: #e8a294;
--color-avatar-yellow: #f0c76e;
--color-avatar-pink: #d4a3b0;
--color-avatar-sage: #a0b5a0;
--color-avatar-purple: #b5a8c9;
--color-avatar-navy: #4a5a7a;
--color-avatar-rust: #d4847c;
```

### 2.3 Règles couleurs absolues

- **Jamais** `#1877F2` ni `bg-blue-*` Tailwind par défaut. Si un agent en utilise → reject PR.
- Liens, mentions, hashtags : `text-gold-deep hover:text-gold`.
- Tab actif : `border-b-[3px] border-gold-deep` (jamais `border-blue-*`).
- Italiques `<em>` dans titres : `class="italic text-gold-deep"` ou `class="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent"` pour heros.
- Backgrounds principaux : `bg-bg-soft` (jamais `bg-white` sauf cards).

---

## 3. Fonts (remplace § « Typographie » côté noms)

DIVARC charge via `next/font/google` dans `app/layout.tsx` :

| Variable CSS | Font | Classe Tailwind | Usage |
|---|---|---|---|
| `--font-instrument` | **Instrument Serif** (400 + italic) | `font-display`, `font-serif` | **Titres, headings, italiques expressives** (remplace Cormorant du DS Maître) |
| `--font-geist-sans` | Geist Sans | `font-sans` (default) | UI, body, buttons |
| `--font-geist-mono` | Geist Mono | `font-mono` | Code, timestamps techniques |

**Cormorant Garamond du DS Maître = Instrument Serif chez DIVARC.** Même rôle éditorial, italiques marquées, contraste élevé. **Ne jamais charger Cormorant**.

### Scale typographique (compatible Tailwind v4)

Le DS Maître propose `text-xxs → text-8xl`. Tailwind v4 a `text-xs → text-9xl`. Utiliser :

| DS Maître | Classe Tailwind | Pixel | Usage |
|---|---|---|---|
| `--text-xxs` 11px | `text-[11px]` | 11px | Eyebrows micro |
| `--text-xs` 12px | `text-xs` | 12px | Labels |
| `--text-sm` 14px | `text-sm` | 14px | Body small |
| `--text-base` 16px | `text-base` | 16px | Body |
| `--text-2xl` 24px | `text-2xl` | 24px | Section title |
| `--text-4xl` 40px | `text-4xl` | 36px | H1 compact |
| `--text-5xl` 48px | `text-5xl` | 48px | H1 mobile |
| `--text-6xl` 64px | `text-6xl` | 60px | H1 desktop |
| `--text-7xl` 80px | `text-[80px]` | 80px | Hero géant |

**Règle italiques** : tout titre `font-display` doit avoir **1-2 mots en `<em class="italic text-gold-deep">`**. Sans italique gold, c'est interdit.

---

## 4. Radius scale DIVARC (remplace § « Cards radius » du Maître)

| Token | Classe Tailwind | Pixel | Usage |
|---|---|---|---|
| `--radius-sm` | `rounded-lg` | 8px | Tags, badges, code |
| `--radius-md` | `rounded-xl` | 12px | Inputs, chips, small cards |
| `--radius-lg` | `rounded-[20px]` | 20px | Cards standards (Variant 1) |
| `--radius-xl` | `rounded-[28px]` | 28px | Hero cards, premium, modals |
| `--radius-2xl` | `rounded-[36px]` | 36px | Sheets fullscreen mobile |
| `--radius-full` | `rounded-full` | 9999px | Pills, FAB, badges round |

**Pattern dominant existant** : `rounded-[28px]` pour les heros et posts ; `rounded-[18px]` pour les grids denses (cards Discover, Marketplace). Conserver.

---

## 5. Composants UI existants (à utiliser, pas à recréer)

Les 15 composants suivants existent dans `components/ui/`. **Toujours les réutiliser avant d'en créer un nouveau.**

| Composant | Path | Quand l'utiliser |
|---|---|---|
| `Avatar` | [components/ui/Avatar.tsx](components/ui/Avatar.tsx) | Toute photo de profil (8 tailles : sm 36 → xxl 168) |
| `Button` | [components/ui/Button.tsx](components/ui/Button.tsx) | CTA (variants primary/secondary/ghost/danger × sm/md/lg) |
| `DisplayHeading` | [components/ui/DisplayHeading.tsx](components/ui/DisplayHeading.tsx) | Titres Instrument Serif avec `<em>` italic intégré |
| `KickerLabel` | [components/ui/KickerLabel.tsx](components/ui/KickerLabel.tsx) | Eyebrows `· LABEL ·` gold uppercase |
| `EmptyState` | [components/ui/EmptyState.tsx](components/ui/EmptyState.tsx) | États vides (variants default/soft/navy) |
| `ErrorState` | [components/ui/ErrorState.tsx](components/ui/ErrorState.tsx) | États d'erreur avec CTA retry |
| `Input` | [components/ui/Input.tsx](components/ui/Input.tsx) | Champ texte (focus-visible gold) |
| `Field` | [components/ui/Field.tsx](components/ui/Field.tsx) | Wrapper label + hint + input |
| `Select` | [components/ui/Select.tsx](components/ui/Select.tsx) | Dropdown Radix |
| `Tabs` | [components/ui/Tabs.tsx](components/ui/Tabs.tsx) | Onglets (border-bottom gold actif) |
| `Switch` | [components/ui/Switch.tsx](components/ui/Switch.tsx) | Toggle ON/OFF |
| `PresenceDot` / `PresenceLabel` | [components/ui/PresenceDot.tsx](components/ui/PresenceDot.tsx) | Indicateurs online/offline |
| `ConfirmDialog` | [components/ui/ConfirmDialog.tsx](components/ui/ConfirmDialog.tsx) | Modal confirmation (avec variant destructive) |
| `Skeleton` | [components/ui/Skeleton.tsx](components/ui/Skeleton.tsx) | Loading shimmer |

**Composant décoratif signature** :
- `ArcDeco` ([components/marketing/ArcDeco.tsx](components/marketing/ArcDeco.tsx)) — implémente les « cercles dorés décoratifs » du DS Maître. Props : `size`, `tone` ("gold" / "navy" / "night"), `stroke`, `opacity`. **Ne jamais réimplémenter** ce SVG.

---

## 6. Composants à créer (manquants au DS Maître)

Le DS Maître liste 8 variants de cards et 6 layouts mais oublie les composants suivants. À ajouter quand le besoin se présente, en respectant les tokens ci-dessus :

### 6.1 Composants prioritaires
1. **Toast** — utiliser `sonner` (déjà installé). Position : `bottom-center` mobile, `top-right` desktop. Background `bg-night text-cream` succès / `bg-error-bg text-error` erreur.
2. **Modal/Dialog** — wrapper sur Radix Dialog. Overlay `bg-night/60 backdrop-blur-sm`. Container `rounded-[28px] bg-white shadow-xl`. Focus trap + Esc obligatoire.
3. **AvatarStack** — overlap `-space-x-2` ring `ring-2 ring-bg-soft`. Compteur `+N` en pill `bg-night text-cream`.
4. **FilterChip** — actif `bg-night text-cream` ; inactif `bg-white border-line text-night-dim`. `h-9 px-3 rounded-full`.
5. **SearchInput** — `h-11 rounded-full bg-bg-soft border-line` + icon Lucide gauche + clear button droite.
6. **Slider** — track `bg-line h-1` ; fill `bg-gold`. Thumb `w-5 h-5 rounded-full bg-night ring-2 ring-gold`.
7. **DatePicker** — wrapper sur Radix Popover + `react-day-picker`. Header gold.
8. **OTP / PhoneInput** — pour 2FA et signup. Inputs `w-11 h-12 rounded-xl bg-white border-line text-center text-2xl font-semibold`.

### 6.2 Patterns à formaliser
- **Reactions bar** (6 emoji) — déjà livrée dans [app/(app)/feed/_components/ReactionsBar.tsx](app/(app)/feed/_components/ReactionsBar.tsx).
- **PostCard** — déjà livrée dans [app/(app)/feed/_components/PostCard.tsx](app/(app)/feed/_components/PostCard.tsx).
- **CircleDiscoverCard** — déjà livrée dans [components/circles/CircleDiscoverCard.tsx](components/circles/CircleDiscoverCard.tsx).

---

## 7. Dark mode (oublié dans le Maître)

DIVARC supporte le dark mode via `[data-theme="dark"]` sur `<html>`, géré par [components/ThemeProvider.tsx](components/ThemeProvider.tsx). Storage : `localStorage["divarc-theme"]` (`light` / `dark` / `system`).

### Règles dark mode

- **Jamais de couleur hex hardcodée**. Toujours via classe Tailwind ou `var(--color-*)`.
- Les CSS vars sont **réassignées** automatiquement en dark : utiliser `bg-night` reste correct (devient clair en dark, foncé en light).
- Tester chaque page en dark mode avant merge.
- Les images sombres peuvent ajouter un voile : `dark:opacity-90 dark:hover:opacity-100`.
- Les images claires ne doivent **jamais** rester pures `#ffffff` sur fond dark. Encadrer avec `border-line` ou shadow.

---

## 8. Motion & accessibility (compléments)

### 8.1 Scale animations

| Token | Durée | Easing | Usage |
|---|---|---|---|
| `--ease-fast` | 150ms | `ease-out` | Hover, focus |
| `--ease-base` | 200ms | `var(--ease-out-expo)` | Boutons, cards |
| `--ease-slow` | 300ms | `var(--ease-spring)` | Modals, sheets |
| `--ease-page` | 400ms | `cubic-bezier(.16,1,.3,1)` | Transitions de page |

### 8.2 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Présent dans `globals.css` — **vérifier** et l'ajouter si absent.

### 8.3 Accessibility hard rules

- Tap targets : 44×44 mobile, 32×32 desktop **minimum**.
- Contraste : WCAG **AA** (4.5:1 body / 3:1 large text).
- Focus visible : `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2`.
- `aria-label` obligatoire sur tout bouton icon-only.
- Skip link en haut de chaque layout : « Aller au contenu principal » (`<a href="#main-content" className="sr-only focus:not-sr-only ..." />`) — déjà en place dans [app/(app)/layout.tsx](app/(app)/layout.tsx).
- Pas d'autoplay vidéo sans contrôle utilisateur visible.
- Tous les `<form>` doivent avoir `aria-invalid` + `aria-describedby` sur les inputs en erreur.

---

## 9. A/B testing & feature flags

DIVARC a des experiments actifs (cf. `lib/experiments`). Quand un agent crée un variant :

- Variant A doit rester pixel-identique à l'existant.
- Variant B doit être **gating par feature flag**, pas par condition de prop arbitraire.
- L'agent doit appeler `getExperimentVariant("nom-exp", userId)` + `trackExperimentExposure(...)` au premier render.

Tous les CTA importants doivent être trackés avec `trackEvent(EVENT_TYPES.X, { target_post_id, ... })` (cf. [lib/tracking/eventTypes.ts](lib/tracking/eventTypes.ts)).

---

## 10. Anti-patterns DIVARC-specific (à reject en review)

- ❌ `style={{}}` inline → toujours classes Tailwind.
- ❌ `as any` / `@ts-ignore` → fix le type.
- ❌ Composant > 500 lignes sans extraction → split.
- ❌ `useEffect` pour fetch initial → Server Component ou Server Action.
- ❌ `fetch("/api/...")` direct depuis client vers Supabase → passer par `lib/queries/*` server.
- ❌ Hex hardcodé `#0a1f44` → utiliser `text-night` / `var(--color-night)`.
- ❌ Emoji système comme icône UI → Lucide React (emojis OK seulement dans réactions explicites ou contenu user).
- ❌ `bg-white` partout en background page → `bg-bg-soft` ou `bg-cream`.
- ❌ Italic sans gold dans titre Instrument Serif → toujours `italic text-gold-deep`.
- ❌ Page nouvelle sans `loading.tsx` + `error.tsx` (Next.js App Router conventions).
- ❌ `<Link href>` sans `prefetch` désactivé sur les liens lourds.
- ❌ Images sans `next/image` + `alt`.

---

## 11. Definition of Done renforcée

Avant qu'une page / un composant soit considéré done :

### Niveau code
- [ ] `pnpm build` passe (pas juste `pnpm exec tsc`)
- [ ] Aucun `as any` ni `@ts-ignore` nouveau
- [ ] Aucune classe Tailwind inexistante (`bg-navy-900` ne marchera pas — utiliser `bg-night`)
- [ ] Bundle delta de la route < +15 KB (vérifier via `pnpm build` output)

### Niveau UX
- [ ] Loading state explicite (`<Skeleton>` ou `loading.tsx`)
- [ ] Empty state si liste vide (`<EmptyState>`)
- [ ] Error state si async fails (`<ErrorState>` + retry)
- [ ] Hover / active / focus-visible définis sur tout interactif
- [ ] Dark mode testé (toggle dans `/settings/algorithm` ou via DevTools `[data-theme="dark"]`)

### Niveau performance
- [ ] LCP mobile < 2.5s
- [ ] CLS < 0.1
- [ ] INP < 200ms
- [ ] Lighthouse mobile ≥ 90

### Niveau a11y
- [ ] WCAG AA contraste validé (DevTools accessibility tab)
- [ ] Navigation clavier complète (Tab cycle propre, Esc ferme modales)
- [ ] Tap targets 44×44 mobile / 32×32 desktop minimum
- [ ] `aria-label` sur icons-only

### Niveau cohérence DS
- [ ] Eyebrow `KickerLabel` gold présent en haut de section
- [ ] Titre `DisplayHeading` avec ≥ 1 `<em>` gold
- [ ] Aucune hex hardcodée
- [ ] Aucune classe Tailwind hors palette DIVARC (pas de `bg-blue-*`, `bg-gray-*` arbitraire)
- [ ] Composants `components/ui/*` réutilisés avant création neuve

---

## 12. Prompt à utiliser pour TOUTE création UI (remplace celui du Maître)

```
Tu travailles sur DIVARC, le réseau social français premium en beta privée.

STACK RÉELLE (NON NÉGOCIABLE)
- Next.js 16 App Router + RSC + Server Actions
- Tailwind v4 (config en @theme inline dans app/globals.css)
- TypeScript strict
- Supabase (lib/supabase/server.ts + client.ts)
- Pas de Vite, pas de React Router, pas de shadcn/ui

LECTURE OBLIGATOIRE AVANT CODE
1. AGENTS.md (à la racine — règles spécifiques Next.js 16)
2. DIVARC_DESIGN_SYSTEM_ADDENDUM.md (cet addendum — source de vérité)
3. Document DS Maître si besoin de philosophie + scope visuel

MISSION
[Décrire ici la page ou le composant spécifique]

CONTRAINTES INVIOLABLES
1. Tokens couleurs : noms DIVARC (text-night, bg-cream, text-gold-deep…)
   Jamais navy-900, gold-500, ni hex hardcodé.
2. Font display = font-display (Instrument Serif chargée par next/font).
   Jamais charger Cormorant.
3. Radius scale DIVARC : rounded-lg / rounded-xl / rounded-[20px] /
   rounded-[28px] / rounded-[36px] / rounded-full.
4. Composants ui existants (Avatar, Button, EmptyState, ErrorState,
   KickerLabel, DisplayHeading, Tabs, Switch, ConfirmDialog, etc.)
   sont utilisés EN PRIORITÉ.
5. ArcDeco pour les cercles dorés décoratifs (jamais réimplémenter).
6. Lucide React pour icons (jamais emoji UI).
7. Eyebrows KickerLabel + titres DisplayHeading italic gold systématiques.
8. Aucune couleur bleue Facebook.
9. Dark mode testé (toggle via [data-theme="dark"]).
10. Anti-patterns rejetés (cf. § 10 addendum).

LIVRABLE ATTENDU
- Code Next.js + TypeScript + Tailwind v4 conforme.
- Loading / Empty / Error states inclus.
- Hover / active / focus-visible explicites.
- Mobile 375 → Desktop 1280 testé.
- Definition of Done § 11 cochée.

WORKFLOW
1. Tu lis AGENTS.md + l'addendum + la philosophie du DS Maître.
2. Tu proposes un plan court (≤ 200 mots).
3. Tu attends ma validation.
4. Tu codes uniquement ce qui a été validé.
5. Tu commits après chaque étape (pnpm build doit passer).
6. Si contexte sature, tu écris un état dans memory puis demandes /clear.

Procède maintenant à [TÂCHE SPÉCIFIQUE].
```

---

## 13. Conflits explicites Maître ↔ Réel (résolution)

| Sujet | DS Maître | Réel DIVARC | Décision |
|---|---|---|---|
| Stack frontend | Vite + React Router | Next.js 16 App Router | **Next.js gagne** |
| Tailwind config | `tailwind.config.js` v3 | `@theme inline` v4 | **Tailwind v4 gagne** |
| Font display | Cormorant Garamond | Instrument Serif | **Instrument Serif gagne** |
| Token primaire navy | `navy-900` | `night` | **`night` gagne** |
| Token primaire gold | `gold-500` | `gold` / `gold-deep` | **`gold` / `gold-deep` gagne** |
| Radius | 4 / 8 / 12 / 16 / 20 | 8 / 12 / 20 / 28 / 36 | **DIVARC gagne** |
| Composants UI | À créer avec shadcn | `components/ui/*` existant | **Existant gagne** |
| Dark mode | Non mentionné | Implémenté | **Implémenté gagne (à respecter)** |
| Cercles dorés | À créer | `ArcDeco` existant | **`ArcDeco` gagne** |
| Library i18n | react-i18next | FR hard-coded V1 | **Hard-coded gagne V1** |
| State server | Zustand + TanStack Query | RSC + Server Actions | **RSC gagne** |

---

**Fin de l'addendum.** Toute mise à jour doit être mergée dans ce fichier et taggée dans le commit message (`docs(ds-addendum): ...`).
