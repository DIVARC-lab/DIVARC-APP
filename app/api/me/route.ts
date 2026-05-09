import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Endpoint /api/me — retourne le user authentifié + son profil minimal,
 * utilisé côté client par les composants qui ont besoin de ces données
 * sans pouvoir les recevoir en props (ex : ContentCreatorModal monté
 * globalement dans le layout). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile: profile ?? null,
  });
}
