# Push notifications VAPID — DIVARC

Setup et fonctionnement des notifications push web (Web Push API + VAPID).

## Architecture

```
Browser (client)
  └─ Service Worker (public/sw.js)
       ├─ "push" event   → showNotification()
       └─ "notificationclick" → focus / openWindow(url)

Backend (server)
  └─ lib/push/sender.ts (sendPushToUser)
       └─ web-push lib (signe avec VAPID privée)
            └─ POST → endpoint browser (FCM / Mozilla / Apple)

Storage
  └─ Supabase table public.push_subscriptions
       (user_id, endpoint UNIQUE, p256dh, auth, user_agent)
```

## Setup une fois

### 1. Générer les clés VAPID

```bash
npx web-push generate-vapid-keys
```

Sortie :
```
=======================================
Public Key:
BAk...

Private Key:
xxx...
=======================================
```

### 2. Ajouter les variables d'environnement

**Local** (`.env.local`) :
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BAk...
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:contact@divarc.app
```

**Vercel** : `Project Settings → Environment Variables`. Cocher
Production + Preview + Development pour les 3 variables. La publique
DOIT commencer par `NEXT_PUBLIC_` pour être exposée côté client.

### 3. Appliquer la migration Supabase

```bash
# Via Supabase Dashboard → SQL Editor ou la CLI :
supabase migration up
```

Migration : `supabase/migrations/0039_push_subscriptions.sql`.

### 4. Déployer

Le service worker est déjà à jour (`divarc-v6` cache). Pas d'autre étape.

## Vérifier que ça marche

1. Ouvrir `/settings` (mobile ou desktop)
2. Section **Notifications** → activer le toggle
3. Le browser demande la permission → accepter
4. Le toggle passe à on et un bouton **"Envoyer un test"** apparaît
5. Cliquer dessus → une notification arrive sur le device

Si le toggle reste off ou le test échoue :
- DevTools → Application → Service Workers : SW actif ?
- DevTools → Application → Push Messaging : permissions ?
- Server logs Vercel : la route `/api/push/test` répond-elle 200 ?

## Déclencher un push depuis le code

```ts
import { sendPushToUser } from "@/lib/push/sender";

await sendPushToUser(recipientUserId, {
  title: "Nouveau message",
  body: "Alice t'a envoyé un message",
  url: "/messages/conv-id",
  tag: "msg-conv-id", // remplace les notifs précédentes du même tag
});
```

Le helper est sûr — no-op silencieux si VAPID non configuré ou si
l'utilisateur n'a pas opt-in.

## Cycle de vie des subscriptions

- **Inscription** : `usePushSubscription().subscribe()` → POST `/api/push/subscribe`
- **Désinscription** : `unsubscribe()` → POST `/api/push/unsubscribe`
- **Auto-cleanup** : `sendPushToUser` supprime les subscriptions qui
  renvoient 404/410 (browser désinstallé, perm révoquée)
- **last_success_at** mis à jour à chaque livraison réussie

## Sécurité

- RLS strict : un user ne lit / supprime que ses propres subscriptions
- Insert par user authentifié uniquement (`auth.uid() = user_id`)
- VAPID privée jamais exposée côté client (uniquement `NEXT_PUBLIC_VAPID_PUBLIC_KEY` est public)
- Endpoint browser unique → upsert empêche les doublons par device
