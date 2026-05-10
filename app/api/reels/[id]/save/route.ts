import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* POST/DELETE /api/reels/[id]/save — toggle bookmark. */

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
  const { error } = await supabase
    .from("reel_saves")
    .upsert(
      { reel_id: id, user_id: user.id },
      { onConflict: "reel_id,user_id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("[reels:save:insert]", error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
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
    .from("reel_saves")
    .delete()
    .eq("reel_id", id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "Unsave failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
