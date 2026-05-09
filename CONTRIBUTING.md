# Contribuer à DIVARC

Guide rapide pour développer, tester et déployer sur DIVARC.

## Stack

- **Framework** : Next.js 16 (App Router, Turbopack, React 19)
- **Backend** : Supabase (Postgres + Auth + Storage + Realtime + RLS)
- **Style** : Tailwind v4 + tokens CSS dans [`app/globals.css`](app/globals.css)
- **Validation** : Zod (côté server actions + API routes)
- **Tests** : Vitest (logique métier) + Playwright (smoke visuels)
- **Push** : web-push + VAPID + Service Worker
- **Déploiement** : Vercel (auto sur push main)

## Architecture

```mermaid
graph TB
    subgraph Client["Browser"]
        UI[React Server Components]
        SW[Service Worker<br/>public/sw.js]
        UI -.subscribe.-> SW
    end

    subgraph Edge["Vercel Edge / Serverless"]
        SSR[Server Components<br/>SSR + RSC]
        Actions[Server Actions<br/>app/**/actions.ts]
        API[Route Handlers<br/>app/api/**]
    end

    subgraph Supabase["Supabase"]
        Auth[Auth + RLS]
        DB[(Postgres<br/>+ triggers + RPC)]
        Storage[Storage buckets<br/>stories / posts / avatars]
        Realtime[Realtime channels<br/>messages / notifs]
    end

    subgraph External["Third-party"]
        Push[Push services<br/>FCM / Mozilla / Apple]
    end

    UI <-->|fetch / mutate| SSR
    UI <-->|invoke| Actions
    UI <-->|fetch JSON| API
    SSR <-->|RLS-scoped| DB
    Actions <-->|RLS-scoped| DB
    Actions <-->|upload| Storage
    API <-->|service role| DB
    UI <-.realtime.->|subscribe| Realtime
    Realtime --> DB

    Actions -.send push.-> Push
    Push -.deliver.-> SW
    SW -.notification.-> Client
```

## Conventions de code

### Server vs Client components

- Par défaut, **server component** (RSC). Exécutés au server, peuvent
  faire des queries Supabase directement (`createClient` from
  `lib/supabase/server`).
- Ajoute `"use client"` UNIQUEMENT si tu as besoin de :
  hooks (`useState`, `useEffect`), event handlers, ou browser APIs.

### Server actions

Toutes les mutations passent par des server actions. Pattern :

```ts
"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({...});

export type ActionResult =
  | { ok: true; ... }
  | { ok: false; error: string };

export async function myAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const parsed = schema.safeParse({...});
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  // ... mutation
  // ... revalidatePath ou redirect
}
```

Côté client, utilise [`runAction`](lib/utils/clientAction.ts) pour
gérer uniformément les toasts + erreurs réseau.

### Confirmations destructives

N'utilise PAS `confirm()` natif. Le hook `useConfirm()` Promise-based
existe :

```tsx
import { useConfirm } from "@/components/ui/ConfirmDialog";

const confirm = useConfirm();
const ok = await confirm({
  title: "Supprimer ?",
  variant: "destructive",
});
if (!ok) return;
```

### Tokens design

Toujours utiliser les tokens Tailwind `bg-night`, `text-gold-deep`,
`border-line`, etc. — voir
[`app/globals.css`](app/globals.css) pour la liste complète.
**Pas** de hex hardcodés (`bg-[#0A1F44]`).

### Touch targets ≥ 44px

Sur les éléments interactifs visibles mobile, garantir 44×44 minimum
(WCAG 2.2 + Apple HIG). Utilise `h-11`/`min-h-[44px]` quand nécessaire.

## Setup local

```bash
git clone <repo>
cd divarc
pnpm install

# Copie .env.example → .env.local et remplis :
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY,
# VAPID_PRIVATE_KEY, VAPID_SUBJECT

pnpm dev
```

L'app tourne sur `http://localhost:3000`.

## Migrations Supabase

Les migrations SQL sont dans `supabase/migrations/` (numérotées
`000X_description.sql`). Pour appliquer en local ou en prod :

- **Local** : `supabase migration up` (CLI Supabase)
- **Prod** : copier le SQL dans le SQL Editor du dashboard Supabase

Toujours respecter :
- `create table if not exists`
- RLS strict (`alter table ... enable row level security` + policies)
- Index sur les colonnes filtrées
- `comment on table/column` pour documenter

## Tests

```bash
pnpm test              # Vitest one-shot
pnpm test:watch        # Mode watch
pnpm test:coverage     # Avec coverage
```

Convention : tests unitaires pour la **logique pure** (validations Zod,
helpers, hooks isolés). Pour les tests d'intégration Supabase ou E2E
Playwright, voir [`tests/`](tests/).

## Lint + typecheck

```bash
pnpm lint              # ESLint (0 errors required)
pnpm build             # Type check + build prod
```

CI bloque le merge si ESLint ou build échouent.

## CI

- **Vercel** : déploiement auto sur push `main`. Preview deploy sur PRs.
- **Lighthouse CI** : workflow [`.github/workflows/lighthouse.yml`](.github/workflows/lighthouse.yml)
  audite Core Web Vitals + a11y + SEO sur prod après chaque push main.
  Les seuils sont en mode `warn` (non-bloquant) — voir
  [`lighthouserc.json`](lighthouserc.json).

## Push notifications

Voir [`PUSH_NOTIFICATIONS.md`](PUSH_NOTIFICATIONS.md) pour le setup
VAPID complet + l'usage côté code.

## Audits qualité

- [`AUDIT_REPORT.md`](AUDIT_REPORT.md) — audit qualité code (ESLint, TS,
  hex tokens, PWA, SEO, a11y, perf)
- [`UX_AUDIT.md`](UX_AUDIT.md) — audit UX heuristique (P0/P1/P2)

## Workflow git

- Branches : `feat/`, `fix/`, `refonte/`, `chore/`, `test/`, `docs/`
- Commits : conventional commits (`feat:`, `fix:`, etc.) en français
- Co-author Claude obligatoire si l'IA a participé :
  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```
- Push direct sur main pour les fixes triviaux et features W-numérotées
- PR + review pour les refactors larges ou changements de stack

## Décisions architecturales notables

1. **Pas de Redis / cache externe** — on utilise les capabilities Next.js
   (revalidate, ISR) + Supabase Realtime
2. **Pas d'ORM** — Supabase JS client typé avec `Database` types fait le
   job, et le RLS est plus simple à raisonner que des permissions
   applicatives
3. **Server actions plutôt qu'API routes REST** — sauf pour les endpoints
   appelés par des SDK externes (push subscriptions browser API)
4. **Pas de Stripe Connect direct pour l'instant** — payouts en mode
   manuel (table `payout_requests` + back-office), Stripe viendra quand
   le volume justifiera la complexité KYC

## Aide / questions

Issues GitHub ou contact direct mainteneurs.
