import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* POST /api/reels/[id]/like — toggle like ON
 * DELETE /api/reels/[id]/like — toggle like OFF */

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  /* Upsert idempotent : si déjà liké, no-op. */
  const { error } = await supabase
    .from("reel_likes")
    .upsert(
      { reel_id: id, user_id: user.id },
      { onConflict: "reel_id,user_id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("[reels:like:insert]", error);
    return NextResponse.json({ error: "Like failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { error } = await supabase
    .from("reel_likes")
    .delete()
    .eq("reel_id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("[reels:like:delete]", error);
    return NextResponse.json({ error: "Unlike failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
