import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* POST /api/me/delete — initie la suppression avec grâce 30j.
 * DELETE /api/me/delete — annule la suppression (réactive).
 *
 * RGPD art. 17. La purge réelle est faite par un cron quotidien V2. */

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase.rpc("request_account_deletion");
  if (error) {
    console.error("[delete:request]", error);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, scheduled_deletion_at: data });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { error } = await supabase.rpc("cancel_account_deletion");
  if (error) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
