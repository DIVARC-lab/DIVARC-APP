import { NextResponse } from "next/server";
import { sendPushToUser } from "@/lib/push/sender";
import { createClient } from "@/lib/supabase/server";

/* Endpoint /api/push/test — déclenche une notification de test à
 * l'utilisateur courant. Utilisé depuis les paramètres pour valider la
 * configuration après opt-in. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendPushToUser(user.id, {
    title: "Bienvenue sur DIVARC ✨",
    body: "Tu recevras désormais les notifications importantes ici.",
    url: "/feed",
    tag: "divarc-test",
  });

  if (result.delivered === 0 && result.removedStale === 0 && result.failed === 0) {
    /* Aucune subscription enregistrée — VAPID pas configuré ou pas d'opt-in. */
    return NextResponse.json(
      {
        error:
          "Aucune subscription active. Active les notifications dans tes réglages.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, ...result });
}
