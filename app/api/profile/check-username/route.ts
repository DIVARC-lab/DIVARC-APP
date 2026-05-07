import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { usernameSchema } from "@/lib/validations/profile";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = request.nextUrl.searchParams.get("username") ?? "";
  const parsed = usernameSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({
      available: false,
      reason: "invalid",
      message: parsed.error.issues[0]?.message ?? "Pseudo invalide.",
    });
  }

  const username = parsed.data;

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "lookup_failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      available: data === null,
      reason: data === null ? null : "taken",
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
