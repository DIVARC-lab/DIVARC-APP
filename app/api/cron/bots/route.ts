/* /api/cron/bots — Endpoint Vercel Cron pour les bots récurrents.
 *
 * Configuration Vercel (vercel.json) :
 *   {
 *     "crons": [
 *       { "path": "/api/cron/bots", "schedule": "* * * * *" }
 *     ]
 *   }
 *
 * Auth : Vercel inclut un header `Authorization: Bearer ${CRON_SECRET}`
 * via la variable d'environnement CRON_SECRET. On vérifie qu'elle
 * matche celle stockée côté env Vercel pour bloquer les appels
 * externes non autorisés.
 *
 * Comportement :
 *  - Récupère tous les triggers schedule actifs
 *  - Pour chacun, évalue si l'expression cron matche la minute
 *    courante (UTC)
 *  - Si match, exécute toutes les actions du bot
 *  - Log dans circle_bot_executions
 *
 * Note : le service_role key est requis pour bypasser RLS (le cron
 * tourne sans contexte utilisateur). Stocké dans SUPABASE_SERVICE_ROLE_KEY. */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { executeBotsForSchedule } from "@/lib/bots/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  /* Auth check : Vercel Cron envoie Bearer CRON_SECRET. */
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase env not configured" },
      { status: 500 },
    );
  }

  /* Client admin (service role) pour bypass RLS. */
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const results = await executeBotsForSchedule(supabase);
    return NextResponse.json({
      ok: true,
      bots_triggered: results.filter((r) => r.triggered).length,
      total_actions: results.reduce((sum, r) => sum + r.actions_executed, 0),
      errors: results.flatMap((r) => r.errors),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
