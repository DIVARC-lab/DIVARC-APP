/* Endpoint de secours : force onboarded_at sur le user courant et
 * redirige vers /dashboard. Utile pour debloquer les users dont le
 * wizard /welcome plante au render.
 *
 * Idempotent : si onboarded_at est deja set, ne fait rien et redirige
 * quand meme.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function handle(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  /* On force onboarded_at meme s'il existe deja : pas de risque, c'est
     idempotent. Si la query plante (RLS, profile inexistant), on log
     et on redirige quand meme — l'objectif est de debloquer l'user. */
  try {
    await supabase
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", user.id);
  } catch (err) {
    console.error("[divarc:onboarding-skip] update failed", err);
  }

  const dashboardUrl = new URL("/dashboard", req.url);
  return NextResponse.redirect(dashboardUrl, { status: 303 });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
