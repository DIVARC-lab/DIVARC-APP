# Handoff Claude Design · DIVARC refonte

> Référence des prototypes Claude Design, transposés dans le repo Next 16.
> Les `feed-*.jsx` originaux ne sont **pas** dans le repo — ils servent juste de
> référence visuelle. Les patterns ci-dessous sont la source de vérité pour la
> refonte UI.

## Sections livrées par la design team

| # | Section | Écrans | Statut repo |
|---|---|---|---|
| 1 | Mobile · Sage | 4 | feed déjà aligné |
| 2 | Mobile · Audacieux | 4 | variante visuelle (option) |
| 3 | Flow étendu | 8 | onboarding, profils, notifs, search, messages, settings — la plupart en place |
| 4 | Marketplace | 3 | TODO routes new |
| 5 | Jobs | 5 | refonte cosmétique (les routes existent) |
| 6 | Profil public | 3 | hero refait |
| 7 | Création | 3 | TODO sheet global |
| 8 | Wallet | 4 | hero refait, autres routes en place |
| 9 | Admin · modération | 4 | refonte cosmétique |
| 10 | États vides + erreurs | 5 | composant `EmptyState` existe |
| 11 | Stories | 4 | TODO new feature |
| 12 | Cercles · groupes | 4 | TODO new feature |
| 13 | Onboarding multi-step | 5 | TODO refonte |
| 14 | Carte · géo | 4 | route /map en place, refonte à faire |
| 15 | Desktop | 2 | layout 3 cols livré |

## Tokens (alignés sur `app/globals.css`)

```css
--gold: #F4B942
--gold-deep: #B88A2A   /* texte accent sur fond clair */
--gold-soft: rgba(244,185,66,0.08)
--cream: #FFF8E8       /* texte sur navy */
--fg: #0A1F44 (navy)
--fg-muted: #4B5B87
--fg-faint: #8993A8
--line: #E6E9F0
--bg: #FFFFFF
--bg-deep: #F8F9FB
```

## Typo

- `font-display` = Instrument Serif italic 400 (déjà chargé via `next/font`)
- `font-sans` = Geist
- Hero display : 38–54px italic, leading-[1.05], tracking-[-0.02em]
- Kicker : 11px font-extrabold tracking-[0.18em] uppercase text-gold-deep préfixé "·"

## Patterns signature (à appliquer partout)

### Header de page
```tsx
<KickerLabel>· Section</KickerLabel>
<DisplayHeading size="lg" className="mt-2">
  Titre <em className="italic text-gold-deep">accent</em>.
</DisplayHeading>
<p className="mt-2 text-night-muted text-sm">Sous-titre.</p>
```

### ArcDeco (signature graphique)
- `components/marketing/ArcDeco.tsx`
- Toujours `absolute pointer-events-none aria-hidden`
- opacity 0.18–0.55, débordant d'un côté
- Sur les hero navy : 2 ArcDeco (un grand top-right + un petit bottom-left)

### Card élevée
- Background `#FFF`, `border border-line`, `rounded-2xl`/`rounded-3xl`
- Padding 12–18px
- Pas de shadow par défaut — la border suffit

### FAB (bouton flottant +)
- 54×54px, `bg-gold text-night`, `rounded-full`
- Position `absolute bottom-7 right-4.5`
- Shadow `0 8px 22px rgba(244,185,66,0.5)`
- Icon Plus lucide 22×22 strokeWidth 2.6

### Date pill (événements)
```tsx
<div className="w-14 py-2.5 rounded-xl bg-bg-deep border border-line text-center">
  <div className="text-[9.5px] tracking-[0.14em] uppercase text-gold-deep font-extrabold">SAM</div>
  <div className="font-display italic text-2xl leading-none mt-0.5">11</div>
  <div className="text-[9.5px] opacity-70 mt-px">mai</div>
</div>
```

### Stat tile
- Chiffre en `font-display italic text-2xl text-night`
- Label dessous : `text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted`

### Filter chip (scrollable)
- Sélectionné : `bg-night text-cream`
- Non : `bg-bg-deep border border-line text-night-muted`
- 999px radius, 12px padding-x, 32px height

### Tab bar (in-page)
- Border-bottom `1px solid var(--line)`
- Tab actif : `font-extrabold text-night border-b-2 border-gold pb-2.5`
- Inactif : `font-semibold text-muted-strong`

### Bottom nav app (mobile)
- 5 items (Accueil · Marché · + central · Emploi · Profil)
- Le + central = FAB gold 50×50, marginTop -8px
- Hauteur barre 78px, `bg-white border-t`

### Hero card navy (avec ArcDeco)
- `bg-night text-cream rounded-3xl p-5 relative overflow-hidden`
- ArcDeco gold absolute -right-12 -top-16
- Kicker gold "· Wallet DIVARC"
- Display italic gros chiffre/titre

### Card épinglée (post pin)
- `bg-gold/[0.08] border border-gold/30 rounded-xl p-3.5`
- Kicker "· ÉPINGLÉ" gold-deep avec icône pin

## Plan d'attaque restant

D'après les screenshots + ce qui est déjà en place :

1. ✅ Phase 0 — Tokens + KickerLabel + DisplayHeading + ArcDeco + EmptyState
2. ✅ Phase 1 — Feed (hero XL, composer FAB gold, TON ARC card right rail)
3. ⏳ Phase 2 — Profil + Jobs cosmétique (profil public + toi déjà refaits)
4. ⏳ Phase 3 — Marketplace + Wallet + Stories + Cercles (routes à créer)
5. ⏳ Phase 4 — États vides partout
6. ⏳ Phase 5 — Polish desktop layout (sidebar curée + TON ARC card livrées)

## Mapping écran → page

Voir le tableau du README original. Les routes principales :
- `app/(app)/feed/` — refonte ✅
- `app/(app)/u/[username]/` — refonte ✅
- `app/(app)/profile/` — refonte ✅
- `app/(app)/wallet/` — refonte ✅
- `app/(app)/settings/` — refonte ✅
- `app/(app)/notifications/` — déjà aligné
- `app/(app)/jobs/` — cosmétique à pousser
- `app/(app)/marketplace/` — cosmétique à pousser
- `app/(app)/circles/` — TODO new
- `app/(app)/stories/` — TODO new (capture/edit/viewer)
- `app/(app)/map/` — V1 livrée (OSM iframe), refonte UI à faire
- `app/(welcome)/` — onboarding multi-step à refaire
- `app/(app)/admin/` — refonte cosmétique
