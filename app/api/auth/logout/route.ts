/* Endpoint déconnexion : POST /api/auth/logout
 *
 * Appelé via form POST depuis ProfileDropdown et MobileMenuSheet.
 * Sign out Supabase côté serveur (revoque cookies session) puis
 * redirige vers la page d'accueil.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function handleLogout(req: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut().catch(() => undefined);

  /* Redirige vers la page d'accueil. */
  const url = new URL("/", req.url);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: NextRequest) {
  return handleLogout(req);
}

/* Aussi accessible en GET pour les fallback nav directs (ex: liens
 * « Déconnexion » qui font un GET au lieu d'un form POST). */
export async function GET(req: NextRequest) {
  return handleLogout(req);
}
