"use client";

import {
  Check,
  Clock,
  MessageSquareText,
  Settings,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  rejectFriendRequest,
  sendFriendRequest,
} from "@/app/(app)/friends/actions";

export type FriendshipState =
  | { status: "self" }
  | { status: "none" }
  | { status: "outgoing"; friendshipId: string }
  | { status: "incoming"; friendshipId: string }
  | { status: "friends"; friendshipId: string };

type UserActionBarProps = {
  targetUserId: string;
  initialState: FriendshipState;
};

export function UserActionBar({
  targetUserId,
  initialState,
}: UserActionBarProps) {
  const router = useRouter();
  const [state, setState] = useState<FriendshipState>(initialState);
  const [pending, startTransition] = useTransition();

  if (state.status === "self") {
    return (
      <Button asChild variant="secondary" size="md">
        <Link href="/profile">
          <Settings className="w-4 h-4" aria-hidden />
          Modifier mon profil
        </Link>
      </Button>
    );
  }

  function refresh() {
    router.refresh();
  }

  function handleSend() {
    startTransition(async () => {
      const result = await sendFriendRequest(targetUserId);
      if (result.ok) {
        toast.success("Demande envoyée.");
        setState({ status: "outgoing", friendshipId: "" });
        refresh();
      } else {
        toast.error(result.error ?? "Demande impossible.");
      }
    });
  }

  function handleCancel() {
    if (state.status !== "outgoing") return;
    startTransition(async () => {
      const result = await cancelFriendRequest(state.friendshipId);
      if (result.ok) {
        toast.success("Demande annulée.");
        setState({ status: "none" });
        refresh();
      } else {
        toast.error(result.error ?? "Annulation impossible.");
      }
    });
  }

  function handleAccept() {
    if (state.status !== "incoming") return;
    startTransition(async () => {
      const result = await acceptFriendRequest(state.friendshipId);
      if (result.ok) {
        toast.success("Demande acceptée. La discussion est ouverte.");
        setState({ status: "friends", friendshipId: state.friendshipId });
        refresh();
      } else {
        toast.error(result.error ?? "Acceptation impossible.");
      }
    });
  }

  function handleReject() {
    if (state.status !== "incoming") return;
    startTransition(async () => {
      const result = await rejectFriendRequest(state.friendshipId);
      if (result.ok) {
        toast.success("Demande refusée.");
        setState({ status: "none" });
        refresh();
      } else {
        toast.error(result.error ?? "Refus impossible.");
      }
    });
  }

  function handleOpenChat() {
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "get_or_create_direct_conversation",
        { other_user_id: targetUserId },
      );
      if (error || !data) {
        toast.error("Impossible d'ouvrir la conversation.");
        return;
      }
      router.push(`/messages/${data}`);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {state.status === "none" ? (
        <Button onClick={handleSend} loading={pending} size="md">
          {!pending ? <UserPlus className="w-4 h-4" aria-hidden /> : null}
          Demander en ami
        </Button>
      ) : null}

      {state.status === "outgoing" ? (
        <Button
          onClick={handleCancel}
          loading={pending}
          variant="secondary"
          size="md"
        >
          <Clock className="w-4 h-4" aria-hidden />
          Annuler la demande
        </Button>
      ) : null}

      {state.status === "incoming" ? (
        <>
          <Button onClick={handleAccept} loading={pending} size="md">
            {!pending ? <Check className="w-4 h-4" aria-hidden /> : null}
            Accepter
          </Button>
          <Button
            onClick={handleReject}
            loading={pending}
            variant="secondary"
            size="md"
          >
            <X className="w-4 h-4" aria-hidden />
            Refuser
          </Button>
        </>
      ) : null}

      {state.status === "friends" ? (
        <Button onClick={handleOpenChat} loading={pending} size="md">
          {!pending ? (
            <MessageSquareText className="w-4 h-4" aria-hidden />
          ) : null}
          Discuter
        </Button>
      ) : null}
    </div>
  );
}
