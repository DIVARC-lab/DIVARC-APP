import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* POST/DELETE /api/reels/comments/[id]/like — toggle like sur un
 * commentaire de reel.
 *
 * Auth : authenticated.
 */

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
    .from("reel_comment_likes")
    .upsert(
      { comment_id: id, user_id: user.id },
      { onConflict: "comment_id,user_id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("[reels:comments:like:insert]", error);
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
    .from("reel_comment_likes")
    .delete()
    .eq("comment_id", id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "Unlike failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
