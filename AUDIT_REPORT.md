# DIVARC — Audit Report

**Date** : 2026-05-09
**Commit base** : `a4adc96`
**Stack auditée** : Next.js 16 + Supabase + Tailwind v4 + Instrument Serif (≠ Constitution Vite + FastAPI + Cormorant)

---

## Score global

| Dimension | Score | Note |
|---|---|---|
| TypeScript strict | **9/10** | 0 `any`, build clean |
| Console hygiene | **10/10** | 0 `console.log`, 4 `error/warn` légitimes |
| TODO debt | **10/10** | 0 TODO/FIXME/HACK |
| ESLint | **6/10** | 69 issues (41 erreurs, 28 warnings) après ignore handoff |
| PWA | **8/10** | Manifest + SW (cache v5) en place, push pas encore activé |
| SEO baseline | **7/10** | Metadata + OG + Twitter cards ✓, sitemap absent, pas de JSON-LD |
| A11y baseline | **7/10** | aria-label majoritaire, focus-visible ring gold via globals.css ✓ |
| Tokens cohérence | **6/10** | Plein de `bg-[#XXX]` arbitraires alors que les tokens existent |
| Tests | **3/10** | Vitest absent, Playwright spec créée mais 0 test écrit |
| Doc / README | **5/10** | README minimal, pas de CONTRIBUTING ni schéma archi |

**Moyenne pondérée : 7.1/10** — base saine, polish nécessaire.

---

## 1. TypeScript

```
grep -rn ": any\|as any\|<any>" app/ components/ lib/ → 0 résultat
npx next build → ✓ type check passed
```

✅ **Aucune action requise.**

## 2. Console hygiene

```
grep -rn "console\." → 4 hits :
  app/error.tsx:17                 → console.error error boundary (légitime)
  app/(app)/profile/_components/VideoRecorder.tsx:110 → camera denied (légitime)
  app/(app)/profile/_components/VideoRecorder.tsx:156 → thumbnail failed (légitime)
  lib/queries/profile.ts:56        → getCurrentProfile error (légitime)
```

✅ **Aucune action requise.**

## 3. ESLint

**Avant ignore handoff** : 274 problèmes (238 erreurs, 36 warnings)
**Après ignore `design_handoff_divarc_refonte/**`** : **69 problèmes** (41 erreurs, 28 warnings)

Les 163 erreurs `react/jsx-no-undef` venaient des `.jsx` prototypes du handoff (utilisent `Avatar`/`Icon`/`ArcDeco` en globals window). Pas du code source applicatif → ajouté à `globalIgnores` dans `eslint.config.mjs`.

**Reste à fixer** :

| Règle | Count | Fix |
|---|---|---|
| `typescript-eslint/no-unused-vars` | 27 | Auto-fixable, juste retirer les imports orphelins |
| `react/no-unescaped-entities` | 18 | Wrap `'` en `&apos;` ou `’` (apostrophe typo) dans JSX text |
| `react-hooks/set-state-in-effect` | 17 | React 19 strict sur le pattern `useEffect(() => setX(...), [state])`. Commun avec `useActionState` côté forms. À refactor avec `use()` ou hooks dédiés |
| `react-hooks/Cannot call impure function during render` | 10 | Réel, à fixer (ex: `Date.now()` dans le render) |
| `react-hooks/exhaustive-deps` | 1 | Ajouter dep manquante |

## 4. Hardcoded hex (cohérence design system)

50+ instances de `bg-[#XXX]` / `text-[#XXX]` / `border-[#XXX]` dans les composants. Distribution :

- `#B88A2A` → existe en token `--gold-deep`, peut être remplacé par `text-gold-deep` (~15 instances)
- `#0A1F44` → existe en token `--night`, peut être remplacé par `text-night` (~10 instances)
- `#F4B942` → existe en token `--gold`, peut être remplacé par `text-gold` (~5 instances)
- `#8696B0` → ~10 instances, **pas de token** — soit créer `--night-dim-2`, soit accepter
- `#142A55` → existe en `--night-soft`, ~5 instances à remplacer
- `#4B5B87` → existe en `--night-muted`, ~5 instances
- `#1F3563` → 1 instance (gradient navy hover circles), pas de token

**~50 hex codes au total**, dont **~40 remplaçables** par tokens existants. **2-3h de refactor systématique** si tu veux atteindre 0 hex hardcodé.

## 5. PWA

✅ `public/manifest.webmanifest` présent
✅ `public/sw.js` présent (cache `divarc-v5`)
❌ Push notifications : VAPID config absent
❌ Workbox : pas utilisé (SW custom)
⚠️ Stratégies cache : network-first HTML + cache-first static (pattern OK pour MVP)

## 6. SEO

✅ `app/layout.tsx` : `metadata` + `openGraph` + `twitter` cards présents
✅ Title template `%s · DIVARC`
❌ Pas de `app/sitemap.ts` ou `public/sitemap.xml`
❌ Pas de JSON-LD structured data (profils, listings, jobs)
❌ Pas de `app/robots.ts`

## 7. A11y

✅ `*:focus-visible` ring gold dans `globals.css` ✓
✅ `prefers-reduced-motion` respecté dans `globals.css` ✓
⚠️ Touch targets : audit mobile à faire — beaucoup de `h-9 w-9` (36px) qui sont **sous les 44px** du HIG Apple. Concernés : icon buttons header, FAB navy, etc.
⚠️ aria-label : 152 boutons, audit visuel nécessaire pour confirmer 100%
❌ Pas de tests axe-core automatisés

## 8. Performance (non mesuré)

Ne peux pas lancer Lighthouse depuis ici (besoin d'un browser + URL). À faire :
- `npx @lhci/cli autorun` sur `localhost:3000` après `next build && next start`
- `next/bundle-analyzer` pour identifier les chunks > 100 KB

## 9. Tests

❌ Vitest absent du `package.json`
✅ `@playwright/test` installé (commit `5322add`)
❌ `tests/visual-check.spec.ts` créé mais 0 capture exploitable (besoin seed user)
❌ Aucun test unitaire de logique métier

## 10. Documentation

⚠️ `README.md` minimal (pas vérifié)
❌ Pas de `CONTRIBUTING.md`
❌ Pas de schéma architecture (Mermaid)
❌ Pas de doc API (server actions par feature, mais pas centralisé)
✅ `CLAUDE.md` + handoff `README.md` présents

---

## Corrections appliquées dans ce commit

1. **`eslint.config.mjs`** : ignore `design_handoff_divarc_refonte/**` (réduit 274 → 69 problèmes)
2. (suite à venir : fix unused vars + unescaped entities)

---

## TODO résiduels priorisés

### P0 (bloquant qualité prod)

- [ ] Fixer les **10 `Cannot call impure function during render`** — bug potentiel
- [ ] **Touch targets ≥ 44×44px** sur tous les boutons actifs mobile (accessibilité, conformité Apple HIG)

### P1 (avant scale)

- [ ] **Sitemap** + JSON-LD structured data sur profils + jobs + listings
- [ ] **Tests** : Vitest pour logique métier critique (queries, server actions)
- [ ] **Push notifications** : VAPID + register subscriptions
- [ ] Refactor `react-hooks/set-state-in-effect` (React 19 strict)

### P2 (polish)

- [ ] Remplacer ~40 `bg-[#XXX]` / `text-[#XXX]` par tokens existants
- [ ] Fix les 18 entités JSX non-échappées (auto-fixable)
- [ ] Documentation : `CONTRIBUTING.md` + schéma archi Mermaid
- [ ] Lighthouse CI sur prod

---

## Recommandations phase suivante

1. **Décisions stack** (Constitution vs Réalité) :
   - Si on garde Next + Supabase : ignorer toutes les sections Constitution qui réfèrent à Vite/FastAPI/MongoDB/Cloudflare R2/libsignal
   - Si on migre : projet greenfield 3-6 mois, à chiffrer séparément

2. **Cohérence tokens** : choisir entre `#F4B942` (Bold proto) et `#C9A961` (Constitution mat). Les utiliser exclusivement via les classes Tailwind (`bg-gold`, `text-gold-deep`) au lieu de `bg-[#XXX]`.

3. **Tests d'abord** : avant chaque nouvelle feature, écrire le test attendu. Pas l'inverse.

4. **Une feature à la fois** : refonte messages OU profile OU marketplace, jamais les 3 en parallèle.

---

*Rapport généré par audit automatique. Pour audit visuel (Lighthouse, axe, screenshots), voir `tests/visual-check.spec.ts`.*
