/* Cron endpoint pour purger les messages éphémères.
 *
 * À configurer dans vercel.json :
 * {
 *   "crons": [{
 *     "path": "/api/cron/purge-disappearing-messages",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 *
 * Sécurité : Vercel ajoute le header Authorization: Bearer {CRON_SECRET}
 * automatiquement. On vérifie via process.env.CRON_SECRET. */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  /* Auth Vercel cron via Bearer secret. */
  const authHeader = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "cron_secret_missing" },
      { status: 503 },
    );
  }
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "admin_client_unavailable" },
      { status: 500 },
    );
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data, error } = await (admin as any).rpc(
    "purge_disappearing_messages",
  );

  if (error) {
    return NextResponse.json(
      { error: "rpc_failed", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    purged_count: data ?? 0,
    at: new Date().toISOString(),
  });
}
