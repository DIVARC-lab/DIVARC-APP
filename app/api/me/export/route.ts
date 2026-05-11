import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* GET /api/me/export — export RGPD V1 (JSON brut, pas ZIP).
 *
 * Retourne toutes les données personnelles de l'utilisateur dans un
 * fichier JSON streamable. V2 : ZIP avec photos/médias inclus + email
 * de notification.
 *
 * RGPD art. 15 (droit d'accès). */

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* Fetch parallèle de toutes les données utilisateur. */
  const [
    profileRes,
    postsRes,
    reelsRes,
    storiesRes,
    friendshipsRes,
    followsOutRes,
    followsInRes,
    experiencesRes,
    educationRes,
    skillsRes,
    projectsRes,
    recommendationsRes,
    notificationsRes,
    badgesRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("posts").select("*").eq("author_id", user.id),
    supabase.from("reels").select("*").eq("author_id", user.id),
    supabase.from("stories").select("*").eq("author_id", user.id),
    supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`),
    supabase.from("user_follows").select("*").eq("follower_id", user.id),
    supabase.from("user_follows").select("*").eq("followed_id", user.id),
    supabase.from("profile_experiences").select("*").eq("user_id", user.id),
    supabase.from("profile_education").select("*").eq("user_id", user.id),
    supabase.from("profile_skills").select("*").eq("user_id", user.id),
    supabase.from("profile_projects").select("*").eq("user_id", user.id),
    supabase
      .from("profile_recommendations")
      .select("*")
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`),
    supabase.from("notifications").select("*").eq("user_id", user.id),
    supabase.from("user_badges").select("*").eq("user_id", user.id),
  ]);

  const exportPayload = {
    metadata: {
      user_id: user.id,
      email: user.email,
      generated_at: new Date().toISOString(),
      format_version: "1.0",
      notice:
        "Export RGPD art. 15 — données personnelles DIVARC. V2 = ZIP avec médias.",
    },
    profile: profileRes.data ?? null,
    posts: postsRes.data ?? [],
    reels: reelsRes.data ?? [],
    stories: storiesRes.data ?? [],
    relations: {
      friendships: friendshipsRes.data ?? [],
      follows_outgoing: followsOutRes.data ?? [],
      follows_incoming: followsInRes.data ?? [],
    },
    professional: {
      experiences: experiencesRes.data ?? [],
      education: educationRes.data ?? [],
      skills: skillsRes.data ?? [],
      projects: projectsRes.data ?? [],
    },
    recommendations: recommendationsRes.data ?? [],
    notifications: notificationsRes.data ?? [],
    badges: badgesRes.data ?? [],
  };

  const filename = `divarc-export-${user.id}-${Date.now()}.json`;
  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
