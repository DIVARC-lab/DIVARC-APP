import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/* Client Supabase avec service_role key — bypass RLS, à n'utiliser QUE
 * dans les endpoints serveur protégés (cron, webhooks vérifiés, admin
 * back-office). JAMAIS exposé côté client.
 *
 * Variables requises côté serveur :
 *   NEXT_PUBLIC_SUPABASE_URL   (publique, OK)
 *   SUPABASE_SERVICE_ROLE_KEY  (SECRET, jamais préfixée NEXT_PUBLIC_) */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
