# DIVARC — Audit UX (W7)

**Date** : 2026-05-09
**Périmètre** : routes principales `/feed`, `/messages`, `/marketplace`,
`/network`, `/profile`, `/wallet`, `/stories`, `/circles`
**Méthode** : revue heuristique Nielsen + WCAG 2.2 + UX patterns mobile-first
spécifiques aux super-apps sociales (parcours d'attention, friction, dead-ends)

---

## Score global UX : 7.4 / 10

| Dimension | Score | Détail |
|-----------|-------|--------|
| Découverte (premier feed) | 8/10 | Hero clair, kicker date, CTAs visibles |
| Navigation (sidebar + bottom) | 8/10 | Active states OK, labels FR cohérents |
| Création (post / story / listing) | 7/10 | Modals corrects, mais composer post lourd sur mobile |
| Lecture (feed / thread / listing) | 8/10 | Hiérarchie visuelle Bold cohérente |
| Friction transactionnelle (offres, payout, paiement) | 6/10 | Manque feedback intermédiaire (loading states longs) |
| Accessibilité (a11y) | 7/10 | Touch targets bumpés, contraste OK, **lecteurs d'écran à valider** |
| Performance perçue | 7/10 | Pas de skeleton sur certaines listes longues |
| Erreurs / dead-ends | 8/10 | EmptyStates riches, mais erreurs réseau silencieuses |

---

## P0 — Bloquant UX (à fixer rapidement)

### 1. Message hover actions inaccessibles tactile
**Localisation** : `app/(app)/messages/_components/MessageBubble.tsx:128-150`
**Problème** : les boutons Reply / Trash sur les bulles de messages sont en
`opacity-0 group-hover:opacity-100`. Sur mobile (pas de hover), ils sont
invisibles ET inutilisables.
**Impact** : sur mobile, un user ne peut pas répondre ni supprimer un message
sans connaître un geste caché.
**Fix proposé** : ajouter un long-press handler qui révèle une bottom sheet
avec les actions (pattern Telegram / WhatsApp). Ou afficher un menu kebab
permanent sur mobile (`sm:hidden`).

### 2. Loading states absents sur lookups longs
**Localisation** : `app/(app)/feed/page.tsx`, `app/(app)/marketplace/page.tsx`,
`app/(app)/messages/page.tsx`
**Problème** : sur connexions lentes (3G, edge cases), les pages server-rendered
prennent 2-5s sans aucun feedback visuel pendant le SSR. L'utilisateur croit
que l'app est gelée.
**Fix proposé** : ajouter des `loading.tsx` Next.js dans chaque route group
avec des skeletons cohérents avec la grammaire Bold (ArcDeco animé + cards
gray skeleton).

### 3. Erreurs réseau silencieuses dans les server actions
**Localisation** : multiple actions (sendOffer, requestPayout, sendMoney…)
**Problème** : quand le réseau coupe pendant un `startTransition`, certaines
actions se résolvent sans feedback. Exemple : `sendOffer` qui timeout n'affiche
ni toast d'erreur ni retry.
**Fix proposé** : envelopper toutes les actions client dans un wrapper
`withErrorHandling` qui catch les network errors et toast un message générique
"Connexion interrompue, réessaie".

---

## P1 — À traiter avant scale

### 4. Composer post mobile encombrant
**Localisation** : `app/(app)/feed/_components/PostComposer.tsx`
**Problème** : la modal full-screen mobile prend toute la hauteur, mais le
clavier mobile écrase le bouton "Publier" sous lui. L'utilisateur doit scroll
le composer pour le voir.
**Fix proposé** : sticky-bottom toolbar avec le bouton "Publier" qui flotte
au-dessus du clavier (CSS `bottom: env(keyboard-inset-height, 0px)` + JS
`visualViewport.height`).

### 5. Sidebar profil bottom disparait après scroll
**Note** : déjà fixé (commit dec6b4f) avec `min-h-0 overflow-y-auto` sur la nav.
**Reste à valider** : tester sur safari iOS qui a des bugs `min-h-0` historiques.

### 6. Pas de feedback "envoi en cours" sur les boutons d'action longs
**Localisation** : sendMoney, requestPayout, applyToJob, sendOffer
**Problème** : les boutons utilisent `useTransition` mais beaucoup ne montrent
pas d'état pending visuel (pas de spinner). L'utilisateur peut double-cliquer.
**Fix proposé** : audit systématique de tous les `<Button>` derrière une
action — s'assurer que `loading={pending}` est passé partout. Variable globale
`useTransition` doit toujours bloquer le double-clic.

### 7. Recherche globale ferme sur Escape mais pas sur scroll
**Localisation** : `components/GlobalSearch.tsx`
**Problème** : sur mobile, scroller la liste de résultats ne ferme pas la
modale, mais cliquer en dehors la ferme. Inconsistance UX (Telegram/WhatsApp
ferment au scroll-down).
**Fix proposé** : pas critique, mais à considérer pour V2.

### 8. Story progress bar saute lors du paused/resumed
**Localisation** : `app/(app)/stories/_components/StoryViewer.tsx`
**Problème** : quand l'utilisateur tap-and-hold pour pause, la progress bar
freeze, mais quand il release, elle saute en avant (effet de "rattrapage").
**Fix proposé** : tracker le temps écoulé en pausing dans `pausedDurationRef`
et soustraire au next tick pour lisser.

---

## P2 — Polish

### 9. Pas de "deep linking" sur les filtres marketplace
**Problème** : sélectionner une catégorie reset l'URL (`?category=meubles`),
mais la barre de recherche, elle, n'est pas dans l'URL.
**Fix** : passer `q=...` dans l'URL pour pouvoir bookmarker / share.

### 10. EmptyStates avec CTA secondaire sous-utilisés
**Localisation** : `components/ui/EmptyState.tsx` — la prop `secondaryHref`
est définie mais utilisée dans seulement 2 endroits.
**Fix** : audit des 14 EmptyStates pour identifier ceux où une 2e action
améliorerait le parcours (ex : "Aucun ami → trouve des amis OU explore les
suggestions").

### 11. Confirmation destructive en `confirm()` natif
**Localisation** : `cancelPayout`, `deleteStory`, `deleteListing`
**Problème** : `confirm("Annuler la demande ?")` casse le design Bold —
modal système OS au lieu d'un dialog custom cohérent.
**Fix** : créer un composant `<ConfirmDialog>` réutilisable utilisant le même
style que MakeOfferDialog.

### 12. Notifications non groupées
**Localisation** : `app/(app)/notifications/page.tsx`
**Problème** : 5 likes successifs créent 5 notifications. Devrait grouper
en "Alice + 4 autres ont aimé ton post".
**Fix** : query niveau DB qui groupe par (target_id, type) sur les dernières
24h.

### 13. Calendrier événement sans rappel
**Problème** : les `circle_events` n'envoient pas de notification J-1 ou H-1.
**Fix** : cron Supabase Edge Function ou webhook scheduler.

---

## A11y — Conformité WCAG 2.2

### À auditer plus en profondeur (lecteur d'écran)
- [ ] Tester avec VoiceOver (iOS) sur les routes principales
- [ ] Vérifier les `aria-live` polite sur les toasts (sonner devrait gérer)
- [ ] Tester la navigation clavier sur les modales (focus trap, escape, tab)
- [ ] Contrast ratio sur `#B88A2A` sur fond `bg-soft` (gold-deep / bg) —
      rapport ~4.6 attendu, à mesurer
- [ ] Labels manquants sur certains icon-buttons (audit en cours)

### Fait
- ✅ Touch targets ≥ 44px sur les zones critiques (commits 0517f93, 3cbea18)
- ✅ Toutes les images non décoratives ont alt
- ✅ Tous les `<button>` ont aria-label si pas de texte
- ✅ Skip-to-content links via Next.js semantic landmarks

---

## Performance perçue

### À implémenter (P1)
- [ ] `loading.tsx` skeletons sur les routes server-rendered lourdes
- [ ] `<Suspense>` boundaries autour des sections indépendantes (right rail)
- [ ] Image preloading sur hero photos (Next.js `priority` déjà en place sur
      story viewer, à étendre au feed)
- [ ] Bundle analyzer pour identifier les composants lourds (mapLibre, motion)

### Mesuré
- LCP cible : < 2.5s sur 4G — non mesuré
- INP cible : < 200ms — non mesuré
- CLS cible : < 0.1 — visuellement OK

---

## Recommandations stratégiques

1. **Prioriser P0 #1 et #3** avant la prochaine release publique. La
   non-accessibilité tactile des actions message + le silence des erreurs
   réseau créent un sentiment de "app cassée" disproportionné par rapport
   à leur ampleur technique.

2. **Loading skeletons** : impact UX énorme pour ~3h de travail. À faire en
   priorité absolue post-P0.

3. **Audit a11y avec VoiceOver** : mobiliser un user externe pour 30 min de
   navigation. Coûte peu, révèle énormément.

4. **Tests E2E Playwright** sur les golden paths : créer compte → poster →
   liker → DM → faire offre marketplace → demander payout. Couvre 80%
   des régressions UX.
