"use client";

import {
  Check,
  Loader2,
  MapPin,
  MessageSquareText,
  Quote,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { FriendshipWithProfile } from "@/lib/database.types";
import { formatRelative } from "@/lib/utils/relativeTime";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  rejectFriendRequest,
} from "../actions";

type FriendCardProps = {
  friendship: FriendshipWithProfile;
  variant: "friend" | "incoming" | "outgoing";
};

export function FriendCard({ friendship, variant }: FriendCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const profile = friendship.other;
  const displayName =
    profile.full_name ?? profile.username ?? "Utilisateur";

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptFriendRequest(friendship.id);
      if (result.ok) {
        toast.success(`${displayName} fait partie de tes amis ✨`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Impossible d'accepter.");
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectFriendRequest(friendship.id);
      if (result.ok) {
        toast.success("Demande refusée.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Impossible de refuser.");
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelFriendRequest(friendship.id);
      if (result.ok) {
        toast.success("Demande annulée.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Impossible d'annuler.");
      }
    });
  }

  async function openConversation() {
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "get_or_create_direct_conversation",
        { other_user_id: profile.id },
      );
      if (error || !data) {
        toast.error("Impossible d'ouvrir la discussion.");
        return;
      }
      router.push(`/messages/${data}`);
    });
  }

  return (
    <article className="p-5 sm:p-6 rounded-3xl bg-white border border-line shadow-soft hover:shadow-[0_30px_60px_-30px_rgba(10,31,68,0.25)] transition-shadow">
      <div className="flex items-start gap-4">
        <Avatar
          src={profile.avatar_url}
          fullName={displayName}
          size="lg"
          priority
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-xl text-night truncate">
              {displayName}
            </h3>
            {variant === "incoming" ? (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gold/15 text-gold-deep">
                Demande reçue
              </span>
            ) : null}
            {variant === "outgoing" ? (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-night/5 text-night-muted">
                En attente
              </span>
            ) : null}
            {variant === "friend" ? (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                Ami
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted truncate">
            {profile.username ? `@${profile.username}` : "—"}
            {profile.location ? (
              <>
                {" · "}
                <MapPin className="inline w-3 h-3 mb-0.5" />{" "}
                {profile.location}
              </>
            ) : null}
          </p>

          {friendship.intro_message ? (
            <blockquote className="mt-4 p-3 rounded-2xl bg-night/[0.03] border border-line text-sm text-night-muted leading-relaxed">
              <Quote className="inline w-3.5 h-3.5 text-gold-deep mr-1 -mt-1" aria-hidden />
              {friendship.intro_message}
            </blockquote>
          ) : null}

          <p className="mt-3 text-[11px] text-muted">
            {variant === "friend"
              ? `Amis depuis ${formatRelative(friendship.responded_at ?? friendship.created_at)}`
              : variant === "incoming"
                ? `Reçu ${formatRelative(friendship.created_at)}`
                : `Envoyée ${formatRelative(friendship.created_at)}`}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 justify-end">
        {variant === "incoming" ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReject}
              disabled={pending}
            >
              <X className="w-4 h-4" aria-hidden />
              Refuser
            </Button>
            <Button onClick={handleAccept} loading={pending} size="sm">
              {!pending ? <Check className="w-4 h-4" aria-hidden /> : null}
              Accepter
            </Button>
          </>
        ) : null}

        {variant === "outgoing" ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCancel}
            disabled={pending}
          >
            <X className="w-4 h-4" aria-hidden />
            Annuler la demande
          </Button>
        ) : null}

        {variant === "friend" ? (
          <Button onClick={openConversation} loading={pending} size="sm" asChild={false}>
            {!pending ? <MessageSquareText className="w-4 h-4" aria-hidden /> : null}
            {pending ? "Ouverture..." : "Discuter"}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function FriendCardLoading() {
  return (
    <article className="p-5 sm:p-6 rounded-3xl bg-white border border-line">
      <div className="flex gap-4 animate-pulse">
        <div className="w-16 h-16 rounded-full bg-night/10" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-1/2 rounded bg-night/10" />
          <div className="h-3 w-1/3 rounded bg-night/5" />
          <div className="h-12 w-full rounded-xl bg-night/5" />
        </div>
      </div>
    </article>
  );
}
