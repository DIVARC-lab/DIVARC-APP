import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Endpoint feedback négatif explicite : "Voir moins de ce type",
 * "Masquer cet auteur", etc.
 *
 * Effet immédiat :
 *  1. Insère un event recsys_events de type post.see_less / post.hide /
 *     user.hide selon la `reason`
 *  2. Met à jour user_algorithm_settings.hidden_users si reason="user.hide"
 *  3. (V2) Ajoute le topic du post dans hidden_topics
 *
 * Le profile_updater intègrera ce signal au prochain run (15min). */

const feedbackSchema = z.object({
  reason: z.enum(["see_less", "hide_post", "hide_author"]),
  post_id: z.string().uuid().optional(),
  author_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { reason, post_id, author_id } = parsed.data;

  /* Mapping reason → event_type (cohérent avec EVENT_WEIGHTS). */
  const eventTypeMap = {
    see_less: "post.see_less",
    hide_post: "post.hide",
    hide_author: "user.hide",
  };
  const eventType = eventTypeMap[reason];

  /* Insert event de feedback négatif (idempotence côté client via UUID). */
  await supabase.from("recsys_events").insert({
    event_id: crypto.randomUUID(),
    user_id: user.id,
    session_id: "feedback",
    event_type: eventType,
    target_post_id: post_id ?? null,
    target_user_id: author_id ?? null,
    properties: { source: "feedback_button" },
  });

  /* Si l'user veut masquer un auteur, on l'ajoute dans hidden_users.
     Upsert + array_append dans une transaction simulée (lecture +
     écriture séquentielles, l'array est court et la concurrence faible). */
  if (reason === "hide_author" && author_id) {
    const { data: existing } = await supabase
      .from("user_algorithm_settings")
      .select("hidden_users")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentHidden = existing?.hidden_users ?? [];
    if (!currentHidden.includes(author_id)) {
      const nextHidden = [...currentHidden, author_id];
      await supabase
        .from("user_algorithm_settings")
        .upsert(
          {
            user_id: user.id,
            hidden_users: nextHidden,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
    }
  }

  return NextResponse.json({ ok: true, applied: reason });
}
