-- Chantier Cercles v4 — Sprint I : Webhooks sortants cercle
-- ============================================================
--
-- Permet aux admins de configurer 1 endpoint HTTP qui reçoit
-- des events JSON quand certains actions se produisent dans leur
-- cercle (post créé, member rejoint, signalement, etc.).
--
-- Usage : Zapier / Make / n8n / Slack webhooks / outils maison.
--
-- V1 :
--   - 1 endpoint actif par cercle (V2 = N endpoints, filtrage par event)
--   - HMAC SHA-256 sign avec secret unique par webhook
--   - Events souscrits (array, dans events_subscribed)
--   - Delivery best-effort via lib/webhooks/delivery.ts côté Server Action
--
-- IDEMPOTENT.

BEGIN;

CREATE TABLE IF NOT EXISTS public.circle_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  url text NOT NULL CHECK (url ~* '^https?://'),
  /* Secret HMAC pour signer les payloads. Généré côté code, jamais
     re-affiché en clair après création (V2 = rotation). */
  secret text NOT NULL,
  /* Liste d'events que ce webhook reçoit. Empty = aucun (désactivé). */
  events_subscribed text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  last_delivery_at TIMESTAMPTZ,
  last_delivery_status integer,
  failed_count integer NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  /* 1 webhook actif par cercle pour V1. */
  UNIQUE (circle_id)
);

CREATE INDEX IF NOT EXISTS circle_webhooks_active_idx
  ON public.circle_webhooks (circle_id) WHERE is_active = true;

ALTER TABLE public.circle_webhooks ENABLE ROW LEVEL SECURITY;

/* SELECT : admins du cercle uniquement (le secret est sensible). */
DROP POLICY IF EXISTS circle_webhooks_select ON public.circle_webhooks;
CREATE POLICY circle_webhooks_select
  ON public.circle_webhooks FOR SELECT
  USING (public.is_circle_admin(circle_id));

/* INSERT/UPDATE/DELETE : admins. */
DROP POLICY IF EXISTS circle_webhooks_admin ON public.circle_webhooks;
CREATE POLICY circle_webhooks_admin
  ON public.circle_webhooks FOR ALL
  USING (public.is_circle_admin(circle_id))
  WITH CHECK (public.is_circle_admin(circle_id));

COMMIT;
