# Instructions Claude Code · DIVARC refonte

> Pose ce dossier à la racine du repo `DIVARC-APP` (ou n'importe où dans le repo).
> Lis **README.md** dans ce même dossier en premier — il contient le brief complet, les tokens, les patterns, et le mapping écran → fichier Next.js.

## Règles de travail

1. **Le repo source fait foi.** Avant de créer un nouveau composant, vérifie qu'il n'existe pas déjà dans `components/ui/` ou `components/`. Réutilise `Avatar`, `Button`, `Logo`, `ArcMark`, etc.

2. **Pattern Next 16 du repo** :
   - Server Components par défaut. `"use client"` seulement si interactif.
   - Toute mutation passe par une **server action** dans le fichier `actions.ts` du dossier feature.
   - Données via `createClient()` de `lib/supabase/server.ts` ou `client.ts`.
   - Auth : `lib/auth/getCurrentUser.ts` (à vérifier dans le repo).

3. **Styling** :
   - Tailwind v4 avec les CSS vars de `app/globals.css` (déjà à jour). N'utilise **pas** de styles inline (les protos en utilisent uniquement par commodité).
   - Police display : `Instrument Serif` italic — à charger via `next/font/google` dans `app/layout.tsx` si pas déjà fait.
   - Classes utilitaires custom à créer si répétées : `.text-kicker`, `.text-display`, `.card-elev`, `.chip`, `.chip-active`.

4. **Icônes** : `lucide-react` uniquement, jamais d'inline SVG (les protos en utilisent par contrainte du sandbox).

5. **Images** : `next/image` toujours. Les placeholders à gradient des protos doivent être remplacés par de vraies sources Supabase Storage.

6. **Validation forms** : utilise les patterns `useActionState` du repo (visible dans `ApplyDialog.tsx`, `PostComposer.tsx`).

7. **Tests** : si le repo a une suite (jest/vitest/playwright), ajoute des tests pour chaque nouveau écran. Sinon, n'en ajoute pas.

## Ordre d'implémentation

Suis l'ordre du `## Plan d'attaque suggéré` du README. Ne pas tout faire d'un coup — fais une PR par section.

## Si quelque chose n'est pas clair

Cherche d'abord dans le repo (le pattern existe presque toujours). Sinon, pose une question dans le PR description plutôt que d'inventer.
