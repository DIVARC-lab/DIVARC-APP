/* Chantier 5 — Constantes paiements DIVARC.
 *
 * APP_FEE_BPS : commission DIVARC en basis points (500 = 5%). Appliquée
 *   via `application_fee_amount` sur le PaymentIntent (Stripe Connect).
 *   Cette commission est retenue par DIVARC ; le reste va au vendeur via
 *   `transfer_data.destination`.
 *
 * BUYER_PROTECTION_FLAT_CENTS : frais fixes de protection acheteur,
 *   ajoutés au total à payer. (V1 : pas appliqué, géré par order.buyer_protection_fee.)
 *
 * SHIPPING_FLAT_CENTS_DEFAULT : tarif par défaut quand le vendeur n'a pas
 *   spécifié de méthode de livraison. */

export const APP_FEE_BPS = 500;
export const BUYER_PROTECTION_FLAT_CENTS = 0;
export const SHIPPING_FLAT_CENTS_DEFAULT = 0;

/* Devises supportées par Stripe pour le SEPA / cards en EUR.
 * Stripe accepte d'autres devises mais nous limitons V1 à EUR pour les
 * orders. Les listings non-EUR sont convertis (ou refusés) côté checkout. */
export const STRIPE_SUPPORTED_CURRENCIES = ["EUR"] as const;
export type StripeSupportedCurrency = (typeof STRIPE_SUPPORTED_CURRENCIES)[number];

/* Convertit une devise listing en devise Stripe utilisable. */
export function toStripeCurrency(
  raw: string,
): StripeSupportedCurrency | null {
  const up = raw.toUpperCase();
  if ((STRIPE_SUPPORTED_CURRENCIES as readonly string[]).includes(up)) {
    return up as StripeSupportedCurrency;
  }
  return null;
}

/* Convertit un montant numeric(12,2) en cents pour l'API Stripe. */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}

/* Calcule la commission DIVARC en cents. */
export function applicationFeeCents(totalCents: number): number {
  return Math.round((totalCents * APP_FEE_BPS) / 10_000);
}
