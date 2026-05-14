import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* GET /api/debug/last-message?conv=<id> — retourne le dernier message
 * brut de la conversation avec TOUS ses champs. Pour debug : permet de
 * voir exactement quelles colonnes sont stockées et avec quelles valeurs.
 *
 * Pour trouver le conv id : ouvre une conversation, regarde l'URL :
 *   /messages/<UUID> ← c'est ça
 *
 * Visite : /api/debug/last-message?conv=<UUID>
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conv");
  if (!conversationId) {
    return NextResponse.json({ error: "missing ?conv=<UUID>" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json(
    {
      conversation_id: conversationId,
      user_id: user.id,
      last_5_messages: messages,
      messages_error: msgError,
      hint: "Cherche dans le JSON ci-dessus si attachment_url et attachment_type sont présents pour les messages photo. Si absents → migration 0012 pas appliquée. Si présents mais URL bizarre → autre cause.",
    },
    { status: 200 },
  );
}
