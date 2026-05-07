"use client";

import { Award, MapPin, UserPlus, Loader2, Check } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { sendFriendRequest } from "@/app/(app)/friends/actions";
import type { ExplorePerson } from "@/lib/queries/explore";

type PersonCardProps = {
  person: ExplorePerson;
};

export function PersonCard({ person }: PersonCardProps) {
  const [requested, setRequested] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSend(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      const result = await sendFriendRequest(person.id);
      if (result.ok) {
        setRequested(true);
        toast.success("Demande envoyée.");
      } else {
        toast.error(result.error ?? "Demande impossible.");
      }
    });
  }

  const displayName =
    person.full_name ?? person.username ?? "Utilisateur DIVARC";

  return (
    <article className="shrink-0 w-56 sm:w-60 rounded-3xl bg-white border border-line p-5 flex flex-col gap-3 hover:border-night/30 hover:shadow-soft transition-all">
      <Link
        href={`/u/${person.username ?? ""}`}
        className="flex flex-col items-center gap-2 group"
      >
        <Avatar
          src={person.avatar_url}
          fullName={displayName}
          size="xl"
        />
        <div className="text-center">
          <p className="font-display text-lg text-night truncate max-w-full group-hover:text-night-soft">
            {displayName}
          </p>
          {person.username ? (
            <p className="text-xs text-muted truncate">@{person.username}</p>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-wrap justify-center gap-1.5 text-[10px] font-semibold">
        {person.founder_rank ? (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-gold/15 text-gold-deep uppercase tracking-widest">
            <Award className="w-2.5 h-2.5" aria-hidden />#{person.founder_rank}
          </span>
        ) : null}
        {person.location ? (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-night/5 text-night-muted">
            <MapPin className="w-2.5 h-2.5" aria-hidden />
            {person.location}
          </span>
        ) : null}
      </div>

      {person.bio ? (
        <p className="text-xs text-night-muted text-center line-clamp-2 leading-snug">
          {person.bio}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleSend}
        disabled={pending || requested}
        className={`mt-auto inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-full text-xs font-semibold transition-all ${
          requested
            ? "bg-emerald-50 text-emerald-700"
            : "bg-night text-cream hover:bg-night-soft"
        } disabled:opacity-70`}
      >
        {pending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
        ) : requested ? (
          <Check className="w-3.5 h-3.5" aria-hidden />
        ) : (
          <UserPlus className="w-3.5 h-3.5" aria-hidden />
        )}
        {requested ? "Envoyée" : "Demander"}
      </button>
    </article>
  );
}
