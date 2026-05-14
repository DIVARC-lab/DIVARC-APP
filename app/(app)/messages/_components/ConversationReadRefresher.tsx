"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* ConversationReadRefresher — force un router.refresh() au mount de la
 * page conversation /messages/[id].
 *
 * Contexte : la page server fait `await supabase.rpc("mark_conversation_read")`
 * pour marquer la conversation comme lue, MAIS le layout parent (qui contient
 * le compteur unreadMessages dans TopBar / MobileBottomNav) est mis en
 * cache par Next.js et n'est pas re-fetched automatiquement.
 *
 * Conséquence : le badge affichait l'ancienne valeur tant que l'user ne
 * naviguait pas ailleurs ou ne cliquait "Tout marquer comme lu".
 *
 * Fix : router.refresh() au mount → re-fetch le segment layout + tous
 * les server components ancêtres → countUnreadMessages() est re-évalué
 * → badge à jour.
 */
export function ConversationReadRefresher() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [router]);
  return null;
}
