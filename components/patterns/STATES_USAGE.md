# États standards — Empty / Loading / Error

> **Règle** : toute page DOIT exposer ces 3 états quand elle fetch des
> données. Aucune page ne doit "rester vide en silence" si le fetch
> rate, ni afficher un loader maison.

## EmptyState — bloc vide

Composant existant : `components/ui/EmptyState.tsx`. Grammaire DIVARC
intégrée (KickerLabel gold + DisplayHeading italic + body muted +
CTA pill).

```tsx
import { EmptyState } from "@/components/ui/EmptyState";
import { Compass } from "lucide-react";

<EmptyState
  icon={Compass}
  kicker="Découverte"
  title="Pas encore de posts publics."
  body="Les posts apparaîtront ici dès que tes amis ou les cercles que tu suis publient."
  ctaHref="/circles"
  ctaLabel="Découvrir des cercles"
  tone="default"
/>
```

3 tones : `default` (white card), `soft` (gradient cream→gold/10),
`navy` (cream-on-night pour onboarding hero).

## LoadingState — skeleton pendant fetch

Composant : `components/patterns/LoadingState.tsx`. 5 variants pour
les contextes les plus courants.

```tsx
import { LoadingState } from "@/components/patterns/LoadingState";

// Dans un loading.tsx Next.js sous /feed/
export default function FeedLoading() {
  return <LoadingState variant="cards" count={4} />;
}

// Inline dans un composant client pendant un transition
{pending ? <LoadingState variant="inline" /> : null}
```

Variants :
- **`cards`** (défaut) : feed posts (avatar + texte + image). count = 3.
- **`list`** : liste verticale (DM, friends, search results).
- **`profile`** : page profil (cover + avatar + bio).
- **`inline`** : `⟳ Chargement…` pour suspense inline.
- **`page`** : spinner centré plein écran.

## ErrorState — fetch ou render qui pète

Composant existant : `components/ui/ErrorState.tsx`. Conçu pour les
`error.tsx` boundaries Next.js MAIS aussi utilisable inline avec
`variant="inline"`.

```tsx
"use client";
import { ErrorState } from "@/components/ui/ErrorState";

// app/(app)/feed/error.tsx
export default function FeedError({ error, reset }: ErrorBoundaryProps) {
  return (
    <ErrorState
      code="500"
      title="Le feed ne répond pas."
      body="Réessaie dans quelques instants. Si ça persiste, dis-le-nous."
      onReset={reset}
      digest={error.digest}
    />
  );
}
```

## Anti-patterns

❌ **NE PAS** afficher un `<div>Loading...</div>` brut :
```tsx
// ❌ MAUVAIS
{loading ? <div>Loading...</div> : <Feed />}

// ✅ BON
{loading ? <LoadingState variant="cards" /> : <Feed />}
```

❌ **NE PAS** laisser une page vide quand un fetch retourne 0 résultat :
```tsx
// ❌ MAUVAIS — l'user croit que c'est cassé
{posts.length === 0 ? null : <PostsList posts={posts} />}

// ✅ BON
{posts.length === 0
  ? <EmptyState icon={...} title="..." body="..." />
  : <PostsList posts={posts} />}
```

❌ **NE PAS** rethrow sans error.tsx boundary :
```tsx
// ❌ MAUVAIS — l'user voit le crash brut
{error && <p style={{color: 'red'}}>{error.message}</p>}

// ✅ BON
// Côté page : laisse remonter au error.tsx boundary
// Côté composant client : <ErrorState variant="inline" />
```
