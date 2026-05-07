import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const sanitized = query.replace(/[%,]/g, "").slice(0, 40);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, location")
    .eq("discoverable", true)
    .neq("id", user.id)
    .or(`full_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%`)
    .limit(10);

  if (error) {
    return NextResponse.json({ results: [] }, { status: 500 });
  }

  return NextResponse.json(
    { results: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
