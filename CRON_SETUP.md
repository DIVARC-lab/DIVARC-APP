# Configuration des cron jobs DIVARC

Ce projet a 3 cron endpoints qui doivent être déclenchés régulièrement
pour fonctionner pleinement :

| Endpoint | Fréquence recommandée | Usage |
|---|---|---|
| `/api/cron/event-reminders` | toutes les heures | Push notifications J-1 / H-1 avant événements de cercle |
| `/api/cron/profile-updater` | toutes les 15 min | Mise à jour des profils d'intérêts (recsys) |
| `/api/cron/refresh-engagement-stats` | toutes les 5 min | Refresh vue matérialisée engagement |
| `/api/cron/sanctions-decay` | toutes les heures | Décay sanctions modération + recalcul trust_score |
| `/api/cron/csam-pharos-ncmec` | toutes les 5 min | Soumission NCMEC + flag Pharos manuel pour incidents CSAM |

Tous les endpoints vérifient le header `Authorization: Bearer ${CRON_SECRET}`
(env var Vercel — voir [PUSH_NOTIFICATIONS.md](PUSH_NOTIFICATIONS.md) pour
la génération du secret).

## Option A — Vercel Pro (recommandé si tu peux)

Décommenter le bloc dans `vercel.json` :

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    { "path": "/api/cron/event-reminders", "schedule": "0 * * * *" },
    { "path": "/api/cron/profile-updater", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/refresh-engagement-stats", "schedule": "*/5 * * * *" }
  ]
}
```

Vercel s'occupe de tout, signe les requêtes avec `CRON_SECRET` automatiquement.

## Option B — Plan Hobby (gratuit)

Vercel Hobby limite à **2 cron jobs max + 1×/jour chacun** — incompatible
avec nos schedules `*/15 min` et `*/5 min`. Solution : déclencher les
crons depuis Supabase via `pg_cron` + `pg_net` (gratuit, granularité
minute).

### Setup Supabase pg_cron

Dans le SQL Editor Supabase :

```sql
-- Active les extensions (si pas déjà actives)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 1. Event reminders — toutes les heures à la minute 0
select cron.schedule(
  'divarc-event-reminders',
  '0 * * * *',
  $$
  select net.http_get(
    url := 'https://divarc.app/api/cron/event-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_CRON_SECRET'
    )
  );
  $$
);

-- 2. Profile updater — toutes les 15 min
select cron.schedule(
  'divarc-profile-updater',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://divarc.app/api/cron/profile-updater',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_CRON_SECRET'
    )
  );
  $$
);

-- 3. Refresh engagement stats — toutes les 5 min
-- (Alternative : appeler directement la RPC sans passer par HTTP)
select cron.schedule(
  'divarc-refresh-engagement-stats',
  '*/5 * * * *',
  'select public.refresh_post_engagement_stats();'
);
```

**⚠️ Remplace `YOUR_CRON_SECRET`** par la vraie valeur de ton env var
Vercel `CRON_SECRET`.

### Vérifier que les crons tournent

```sql
-- Lister tous les crons actifs
select * from cron.job;

-- Voir les 10 dernières exécutions
select * from cron.job_run_details
order by start_time desc
limit 10;
```

### Désactiver un cron

```sql
select cron.unschedule('divarc-event-reminders');
```

## Option C — Service externe (cron-job.org, EasyCron, etc.)

Si tu ne veux ni Vercel Pro ni pg_cron, tu peux configurer un cron
externe gratuit qui hit les endpoints toutes les X minutes avec le
header `Authorization: Bearer YOUR_CRON_SECRET`.

Limite : moins fiable, dépend d'un service tiers, peut être bloqué par
les firewalls Vercel sur usage abusif.

## En résumé

- **Plan Pro** : décommenter `vercel.json` → fini
- **Plan Hobby** : pg_cron Supabase → 3 commandes SQL → fini
- **Si rien configuré** : l'app fonctionne quand même, mais :
  - Pas de rappels d'événements (push J-1/H-1 inactifs)
  - Le profil d'intérêts ne se met pas à jour automatiquement (mais le
    feed perso fonctionne quand même sur les heuristiques fresh+network+
    creator affinity)
  - Vue matérialisée engagement devient stale (refresh manuelle nécessaire)
