# Card — Guide d'usage DIVARC

> **Règle** : tout encart visuel avec un fond, un radius et une bordure
> DOIT utiliser `<Card>` (ou `<Surface>` si pas de contenu structuré).
> Pas de `<div className="bg-white border rounded-...">` ad-hoc.

## Anatomie standard

```tsx
import { Card } from "@/components/patterns/Card";
import { CardHeader, CardBody, CardFooter } from "@/components/patterns/CardParts";

<Card variant="default">
  <CardHeader
    title="Marc Dubois"
    subtitle="il y a 2h · Public"
    avatar={<Avatar size="md" src={...} />}
    trailing={<PostMenu />}
  />
  <CardBody>
    Bonjour à tous, je voulais partager…
  </CardBody>
  <CardFooter align="between">
    <ReactionsBar />
    <ShareButton />
  </CardFooter>
</Card>
```

## Les 8 variants — quand utiliser quoi

### `default` — 90% des cas
Posts dans le feed, items de liste, sections de page. Padding 16px,
border subtle, shadow xs. Si tu hésites, c'est celui-là.

### `feature` — Hero / mise en avant
Section "tendance du jour", premier post épinglé, CTA principal de
page. Padding 24px, shadow md. À utiliser parcimonieusement (1-2 par
page max, sinon perd son effet de hiérarchie).

### `compact` — Listes denses
Sidebar "Suggestions", "Membres récents", "Activité". Padding 12px,
shadow xs. Idéal quand on veut afficher 5-10 items dans peu d'espace.

### `media` — Image plein bord
Marketplace listings, reels previews, articles avec cover. Padding=0,
overflow:hidden, radius lg. Toujours associer avec `<CardMedia />`
pour l'image, puis padding manuel dans `<CardBody>`.

```tsx
<Card variant="media">
  <CardMedia src={listing.image} alt={listing.title} aspectRatio="4/5" />
  <div className="p-4">
    <h3>{listing.title}</h3>
    <p>{listing.price}€</p>
  </div>
</Card>
```

### `interactive` — Cliquable
Navigation cards (sélection de cercle, suggestion d'ami à ajouter),
options sélectionnables. Hover lift -2px + shadow md. Toujours fournir
`onClick` ou `href`.

```tsx
<Card variant="interactive" href={`/circles/${circle.slug}`}>
  <CardHeader title={circle.name} subtitle={`${circle.members} membres`} />
</Card>
```

### `highlight` — Mettre en valeur
Conseils, tips, notes importantes ("💡 Astuce", "ℹ️ Bon à savoir").
Background cream qui attire l'œil sans crier.

### `premium` — Cards DIVARC+
Beta privée, fondateurs, premium teaser. Background night + texte cream
auto. Réservé aux cas où on veut signaler "ceci est spécial".

### `outlined` — Discret
Settings sections, info secondaire, blocs de footer. Border-strong sans
shadow. Quand on a besoin d'une délimitation sans poids visuel.

## Sous-composants — règles

### `<CardHeader>`
- **title** : obligatoire. Toujours sémantique `<h3>` (la card est
  un sous-niveau dans la page).
- **subtitle** : optionnel. Auteur + timestamp, label métier, count.
- **avatar** : optionnel, shrink-0 automatique.
- **trailing** : menu kebab, badge, bouton primaire (rare).
- **divider** : sépare visuellement header et body sur cards longues.

### `<CardBody>`
- **paddingTop** : défaut `md` (12px). Mettre `none` si tu enchaînes
  directement après un `CardMedia`.

### `<CardFooter>`
- **divider** : `true` par défaut. Mettre `false` si le footer suit
  immédiatement le body sans transition visuelle nécessaire.
- **align** : `end` (CTA à droite, par défaut), `between` (boutons
  d'actions distribués), `start` (rare).

### `<CardMedia>`
- **aspectRatio** : toujours fournir un ratio pour éviter CLS.
  Standards DIVARC : "16/9" (vidéo), "1/1" (avatar/marketplace),
  "4/5" (post photo portrait), "9/16" (story/reel).
- **loading** : `lazy` par défaut. `eager` uniquement pour above-the-fold.
- **overlay** : badge prix, durée vidéo, gradient bottom.

## Anti-patterns à éviter

❌ **NE PAS** créer un 9ᵉ variant :
```tsx
// ❌ MAUVAIS
<div className="bg-white rounded-2xl border p-6 shadow-lg">…</div>

// ✅ BON
<Card variant="feature">…</Card>
```

❌ **NE PAS** override le padding via className :
```tsx
// ❌ MAUVAIS
<Card variant="default" className="!p-8">…</Card>

// ✅ BON — utilise un autre variant qui a le bon padding
<Card variant="feature">…</Card>
```

❌ **NE PAS** mélanger variant + style ad-hoc :
```tsx
// ❌ MAUVAIS
<Card variant="default" style={{ background: "#fff8e8" }}>…</Card>

// ✅ BON
<Card variant="highlight">…</Card>
```

❌ **NE PAS** imbriquer des cards :
```tsx
// ❌ MAUVAIS — double bordure, hiérarchie ambiguë
<Card variant="default">
  <Card variant="compact">…</Card>
</Card>

// ✅ BON — Surface ou simple Stack
<Card variant="default">
  <Stack gap="md">
    <Surface variant="bgSoft" padding="md" radius="md">…</Surface>
  </Stack>
</Card>
```

## Quand prendre `<Surface>` au lieu de `<Card>`

- **Card** = contenu structuré (header + body + footer, ou au moins
  un titre clair). Sémantique "ceci est une unité d'information".
- **Surface** = zone de fond paramétrable sans sémantique forte.
  Sidebar, hero, container coloré.

Si tu hésites, prends Card. Le risque est de mettre Surface là où
Card aurait clarifié la hiérarchie.
