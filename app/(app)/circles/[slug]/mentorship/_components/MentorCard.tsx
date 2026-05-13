"use client";

import { Loader2, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { contactSeller } from "@/app/(app)/marketplace/actions";
import type { CircleMentorOffer } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

type Props = {
  offer: CircleMentorOffer;
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  circleSlug: string;
};

export function MentorCard({ offer, profile, circleSlug }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const name = profile?.full_name ?? profile?.username ?? "Mentor";
  const isFull =
    typeof offer.capacity === "number" &&
    offer.current_mentees >= offer.capacity;
  const disabled = !offer.is_open || isFull;

  function contact() {
    /* Réutilise le système de messagerie marketplace : on ouvre une conv
     * via /messages/<user> standard. */
    startTransition(() => {
      router.push(
        profile?.username
          ? `/u/${profile.username}`
          : `/circles/${circleSlug}/members`,
      );
    });
    void contactSeller;
  }

  return (
    <article
      className={cn(
        "rounded-2xl bg-white border border-line p-4",
        disabled && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar
          src={profile?.avatar_url ?? null}
          fullName={name}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-[14px] font-bold text-night">{name}</p>
            {profile?.username ? (
              <p className="text-[11px] text-night-dim">
                @{profile.username}
              </p>
            ) : null}
            {!offer.is_open ? (
              <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-bg-soft text-night-dim text-[9px] font-extrabold uppercase tracking-wider">
                Fermé
              </span>
            ) : isFull ? (
              <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase tracking-wider">
                Complet
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase tracking-wider">
                Disponible
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] font-semibold text-night leading-snug">
            {offer.headline}
          </p>
          {offer.bio ? (
            <p className="mt-1 text-[12px] text-night-soft leading-snug line-clamp-3">
              {offer.bio}
            </p>
          ) : null}
          {offer.expertise.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {offer.expertise.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-1.5 h-4.5 rounded-md bg-bg-soft text-[10px] font-bold text-night-dim"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] text-night-dim">
              {offer.availability ?? "Dispo libre"}
              {offer.capacity
                ? ` · ${offer.current_mentees}/${offer.capacity} mentees`
                : ""}
            </span>
            <button
              type="button"
              onClick={contact}
              disabled={disabled || pending}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-night text-cream text-[11px] font-extrabold hover:bg-night-soft transition-colors disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
              ) : (
                <MessageCircle className="w-3 h-3" aria-hidden />
              )}
              Contacter
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
