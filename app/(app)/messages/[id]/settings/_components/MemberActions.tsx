"use client";

import { UserMinus } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { removeMember } from "../../../group-actions";

type MemberActionsProps = {
  conversationId: string;
  targetUserId: string;
  targetName: string;
  /* Affiche le bouton uniquement si l'utilisateur courant est owner. */
  isOwner: boolean;
};

/* Bouton "Retirer" affiché à droite de chaque membre dans /settings.
 * Seul l'owner du groupe peut kick. Le créateur ne peut pas être kick
 * (côté RPC remove_group_member). */
export function KickMemberButton({
  conversationId,
  targetUserId,
  targetName,
  isOwner,
}: MemberActionsProps) {
  const [pending, startTransition] = useTransition();

  if (!isOwner) return null;

  function handleKick() {
    if (!confirm(`Retirer ${targetName} du groupe ?`)) return;
    startTransition(async () => {
      const result = await removeMember(conversationId, targetUserId);
      if (result.ok) {
        toast.success(`${targetName} retiré.`);
      } else {
        toast.error("Action impossible.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleKick}
      disabled={pending}
      aria-label={`Retirer ${targetName}`}
      title="Retirer du groupe"
      className="shrink-0 w-9 h-9 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-40"
    >
      <UserMinus className="w-4 h-4" aria-hidden />
    </button>
  );
}
