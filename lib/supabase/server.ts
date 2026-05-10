import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

/* Admin client (service_role) — bypasse les RLS.
 *
 * À utiliser EXCLUSIVEMENT côté serveur, dans des contextes où l'on a
 * déjà vérifié les permissions applicatives (ex : modérateur avec
 * is_admin = true). Ne JAMAIS l'utiliser dans un Route Handler sans
 * guard explicite — ça créerait une élévation de privilèges silencieuse.
 *
 * Cas d'usage légitimes :
 *   - Decision flow modération : delete contenu d'un autre user
 *   - Cron jobs : refresh stats, profile updater
 *   - Workflows critiques : CSAM emergency protocol, legal data request
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "[supabase:admin] Missing SUPABASE_SERVICE_ROLE_KEY — admin client unavailable.",
    );
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have a proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
