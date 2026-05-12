import "server-only";
import Stripe from "stripe";

/* Chantier 5 — Client Stripe (server-only).
 *
 * Init paresseuse : ne crash pas si STRIPE_SECRET_KEY est absent au build,
 * mais throw clean si on tente un call sans clé configurée. Utile en
 * preview / staging où Stripe n'est pas encore branché. */

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY non configuré. Renseigne la variable d'environnement avant d'utiliser Stripe.",
    );
  }
  _stripe = new Stripe(key, {
    /* Version d'API verrouillée — toute migration future doit être
     * délibérée (cf. release notes Stripe). */
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
    appInfo: {
      name: "DIVARC Marketplace",
      version: "1.0.0",
    },
  });
  return _stripe;
}

/* Retourne true si Stripe est configuré (utilisable pour disable des
 * bouts d'UI en preview). */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
