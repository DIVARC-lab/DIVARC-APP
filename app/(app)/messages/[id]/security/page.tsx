import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { getSecretStatus } from "@/app/(app)/messages/secret-actions";
import { createClient } from "@/lib/supabase/server";
import { SecretToggle } from "./SecretToggle";
import { Container } from "@/components/primitives/Container";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Sécurité de la conversation" };

/* Page /messages/[id]/security :
 *   - Réservée aux conv direct (V1)
 *   - Toggle "Conversation secrète" + statuts des 2 côtés
 *   - Lien vers /settings/security/encryption pour gérer le coffre */

export default async function ConversationSecurityPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  /* Vérifie membership + récupère le type de conv. */
  const { data: conv } = await supabase
    .from("conversations")
    .select("type")
    .eq("id", id)
    .maybeSingle();
  if (!conv) notFound();
  if (conv.type !== "direct") {
    /* V1 : pas de secret pour les groupes. */
    return (
      <div className="flex-1 overflow-y-auto bg-bg">
        <header className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-line bg-white sticky top-0 z-10">
          <Link
            href={`/messages/${id}`}
            aria-label="Retour"
            className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-night" aria-hidden />
          </Link>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-night" aria-hidden />
            <h1 className="font-semibold text-night">Sécurité</h1>
          </div>
        </header>
        <Container maxWidth="text" paddingX="lg" paddingY="3xl">
          <div className="rounded-2xl bg-white border border-line p-6 text-center">
            <p className="text-[13.5px] text-night-muted">
              Le mode secret n&apos;est disponible que pour les conversations
              1:1 en V1. Le chiffrement par groupe arrivera dans une mise à
              jour ultérieure (Double Ratchet par-sender).
            </p>
          </div>
        </Container>
      </div>
    );
  }

  /* Récupère le statut secret + peer info. */
  const status = await getSecretStatus(id);
  let peerDisplayName = "ton interlocuteur";
  let peerAvatarUrl: string | null = null;
  if (status.peerUserId) {
    const { data: peer } = await supabase
      .from("profiles")
      .select("full_name, username, avatar_url")
      .eq("id", status.peerUserId)
      .maybeSingle();
    if (peer) {
      peerDisplayName =
        (peer.full_name as string | null) ??
        (peer.username as string | null) ??
        "ton interlocuteur";
      peerAvatarUrl = (peer.avatar_url as string | null) ?? null;
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <header className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-line bg-white sticky top-0 z-10">
        <Link
          href={`/messages/${id}`}
          aria-label="Retour"
          className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-night" aria-hidden />
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar
            src={peerAvatarUrl}
            fullName={peerDisplayName}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-[14px] font-semibold text-night truncate">
              Sécurité — {peerDisplayName}
            </h1>
            <p className="text-[11.5px] text-night-muted">
              Conversation secrète E2E
            </p>
          </div>
        </div>
      </header>

      <Container maxWidth="text" paddingX="lg" paddingY="2xl">
        <SecretToggle
          conversationId={id}
          peerUserId={status.peerUserId}
          initialMyWantsSecret={status.myWantsSecret}
          initialPeerWantsSecret={status.peerWantsSecret}
          peerHasIdentity={status.peerHasIdentity}
          peerDisplayName={peerDisplayName}
        />
      </Container>
    </div>
  );
}
