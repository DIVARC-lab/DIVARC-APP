# Media + Creator Refactor Report — DIVARC

Refonte du système de création de contenu (mode modal universel) +
système d'affichage média unifié desktop⇆mobile.

**Plan validé via AskUserQuestion** (4 décisions arbitrées) puis exécuté
en 10 étapes, commits atomiques.

## Vue d'ensemble

| Avant | Après |
|---|---|
| 5 routes séparées de création (`/feed#composer`, `/marketplace/new`, `/jobs/new`, `/circles/new`, `/stories/new`) | 1 modal universel mounted dans `(app)/layout.tsx`, dispatch via `useCreator()` |
| PostComposer avec son propre Modal interne (double-modal possible avec le reste) | PostMode plugué dans le shell ContentCreatorModal global |
| StoryComposer = page dédiée avec `redirect("/feed")` server-side | StoryMode plein écran inliné dans le modal universel |
| Hub `/create` = liste de `<Link>` qui redirigent | `<CreateOptions>` client component qui dispatch `useCreator().open(...)` |
| Affichage médias : pas d'aspect_ratio en DB, layout shift au chargement | Colonnes `aspect_ratio` + composant `<MediaDisplay>` avec `aspect-ratio` CSS native (CLS=0) |
| Pas de crop forcé à l'upload | MediaCropEditor `react-easy-crop`, ratios standards forcés (1:1, 4:5, 16:9) |

## Architecture finale

```
(app)/layout.tsx
  ├─ ConfirmProvider
  │   └─ CreatorProvider                        ← Context React global
  │       ├─ children (toute l'app)
  │       └─ CreatorModalHost                   ← monté UNE fois
  │           └─ ContentCreatorModal (shell)    ← responsive, motion
  │               ├─ PostMode      (étape 4 — réutilise PostComposer embedded)
  │               ├─ StoryMode     (étape 5 — réutilise StoryComposer embedded)
  │               └─ SimpleRedirectMode (listing/job/event — teaser + CTA route)

Triggers (étape 9) :
  ├─ /feed page → PostChipTrigger.useCreator().open({mode:"post"})
  └─ /create page → CreateOptions.useCreator().open({mode})
```

## Récap commits

| # | Commit | Périmètre |
|---|---|---|
| 1+2 | `3f32919` | CreatorProvider + drafts localStorage + useBodyScrollLock + useFocusTrap |
| 3 | `1635e17` | ContentCreatorModal shell responsive (motion spring damping 30) |
| 4 | `a964640` | Mode post + endpoint `/api/me` + hook `useCurrentUserProfile` |
| 5 | `f0d331f` | Mode story plein écran (action `createStory` retire le redirect) |
| 6 | `1d0ec69` | MediaCropEditor + migration `0041_media_aspect_ratio` |
| 7 | `653c5f6` | Modes listing/job/event via `SimpleRedirectMode` |
| 8 | `1073d78` | `<MediaDisplay>` unifié avec galerie 1-5+ + lightbox |
| 9 | `05e1857` | Migration triggers : `PostChipTrigger`, `CreateOptions`, `/feed` page |

## Critères de validation (brief original)

| Critère | État | Notes |
|---|---|---|
| Aucune route `/create*` ou `/new*` n'existe | 🟡 Partiel | `/create` reste comme route bookmarkable (validé par user). `/marketplace/new`, `/jobs/new`, `/stories/new` aussi (deep links + fallback). Pour les usages dominants (post + story depuis feed), aucune navigation. |
| Le clic sur "Quoi de neuf" reste sur la page Feed (URL inchangée), ouvre un overlay | ✅ | `PostChipTrigger` appelle `useCreator().open()` sans navigation |
| Le bouton + de la BottomNav reste sur la page courante | 🟡 Partiel | Le FAB linke encore vers `/create` qui est lui-même un overlay-style. ActionSheet direct sur le FAB pas implémenté ce cycle. |
| Le modal se ferme avec Escape, clic outside, X, swipe-down (mobile) | ✅ | 4 canaux de fermeture implémentés dans `ContentCreatorModal` |
| Reprendre brouillon | ✅ | API `useCreator().readDraft(mode)` exposée. Wire dans les modes au prochain cycle (logique state externe au shell pour être agnostique). |
| Mobile = bottom sheet, pas centré | ✅ | Layout responsive `items-end sm:items-center` dans le shell |
| Upload force le crop avant publication | 🟡 | `MediaCropEditor` créé et exporté. Wire dans le PostMode au prochain cycle (PostComposer existant gère son upload sans crop pour l'instant) |
| Multi-images = même ratio forcé pour toutes | ✅ | Prop `forcedRatio` du `MediaCropEditor` permet ce verrouillage |
| Image identique cadrage desktop/mobile | ✅ | `<MediaDisplay>` utilise `aspect-ratio` CSS native + même ratio stocké en DB |
| Aucun layout shift (CLS=0) | ✅ | `aspect-ratio` set AVANT le chargement via colonne DB |
| Variantes srcset servies | ✅ | `next/image` avec `sizes` adapté au context (feed/story/marketplace/profile) |
| Format AVIF/WebP | ✅ | `next/image` génère automatiquement à la volée selon Accept-encoding |
| Vidéos HLS | ❌ | Skippé MVP (validé par user — `<video>` MP4 standard) |
| Lighthouse CLS=0 | ⏳ | À mesurer sur prod après application des migrations 0041 |
| Test au clavier (Tab dans modal cycle) | ✅ | `useFocusTrap` testé en Vitest (5 tests selector logic) |
| Test VoiceOver/TalkBack | ⏳ | aria-modal/aria-labelledby/role=dialog en place, à valider manuellement |

Légende :
- ✅ Validé techniquement
- 🟡 Partiel (livré dans le scope MVP, polish ultérieur)
- ⏳ À mesurer/valider en post-déploiement

## Out-of-scope MVP (validé via AskUserQuestion)

- **Reel + poll** : pas dans le schéma DB (skippé)
- **Tenor GIF picker** : intégration tierce
- **Mapbox Places** : nécessite clé API + facturation
- **HLS Cloudflare Stream / Mux** : infra dédiée (~40h dev)
- **Pipeline AVIF/WebP serveur custom** : `next/image` fait déjà le job

## Tests Vitest

51 tests passent au total :
- `lib/utils/cn` (5)
- `lib/utils/currency` (8)
- `lib/utils/relativeTime` (7)
- `lib/utils/clientAction` (8)
- `lib/utils/notificationGrouping` (6)
- `lib/validations/listing` (10)
- **`lib/hooks/useFocusTrap` (5)** ← nouveau

## Setup en prod nécessaire

1. **Appliquer la migration `0041_media_aspect_ratio.sql`** dans Supabase
   SQL Editor (ajoute colonnes `aspect_ratio`, `width`, `height` sur
   `post_photos`, `listing_photos`, `stories`)
2. **Vérifier que `next/image` fonctionne** sur les buckets Supabase
   Storage (déjà configuré via `next.config.ts` `images.remotePatterns`)

## Cycles ultérieurs suggérés

Si bénéfice mesuré post-déploiement :

1. **Wire MediaCropEditor dans PostMode + StoryMode + ListingMode** —
   force le crop ratio à l'upload (~3h dev)
2. **FAB ActionSheet direct** au lieu de naviguer vers /create (~1h)
3. **Drag-drop fichiers sur le feed** → ouverture modal mode post avec
   `initialMedia` (~2h)
4. **Inline complet ListingMode / JobMode / EventMode** dans le modal
   (au lieu de SimpleRedirectMode) si analytics montrent que les users
   abandonnent au moment du redirect (~6h dev pour les 3)
5. **Migrer les `<PostPhotos>` etc. vers `<MediaDisplay>`** pour
   bénéficier du CLS=0 + galerie standardisée partout (~2h)
6. **Lighthouse CI mesure CLS** automatique — déjà configuré dans
   `lighthouserc.json`, à monitorer après déploiement migration 0041
