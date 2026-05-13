"use client";

import {
  Calendar,
  Check,
  ExternalLink,
  HelpCircle,
  MapPin,
  Users2,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { cn } from "@/lib/utils/cn";
import type {
  CircleEventAttendanceStatus,
  CircleEventCategory,
  CircleEventWithRsvp,
} from "@/lib/database.types";
import { attendCircleEvent, cancelEventRsvp } from "../actions";

type CircleEventsSectionProps = {
  circleSlug: string;
  events: CircleEventWithRsvp[];
  isMember: boolean;
};

const CATEGORY_BADGE: Record<CircleEventCategory, string> = {
  community: "bg-emerald-50 text-emerald-700 border-emerald-200",
  social: "bg-gold/10 text-gold-deep border-gold/30",
  cultural: "bg-violet-50 text-violet-700 border-violet-200",
};

const CATEGORY_LABEL: Record<CircleEventCategory, string> = {
  community: "Communauté",
  social: "Social",
  cultural: "Culturel",
};

export function CircleEventsSection({
  circleSlug,
  events,
  isMember,
}: CircleEventsSectionProps) {
  return (
    <section aria-label="Événements">
      {events.length === 0 ? (
        <p className="text-sm text-night-dim text-center py-8 rounded-2xl border border-dashed border-line">
          Pas d&apos;événement à venir.{" "}
          {isMember ? (
            <Link
              href={`/circles/${circleSlug}/events/new`}
              className="italic font-display text-night hover:text-gold-deep"
            >
              Sois la première personne à en créer un.
            </Link>
          ) : (
            <span className="italic font-display text-night">À suivre.</span>
          )}
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} canRsvp={isMember} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EventCard({
  event,
  canRsvp,
}: {
  event: CircleEventWithRsvp;
  canRsvp: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [myStatus, setMyStatus] = useState<
    CircleEventAttendanceStatus | null
  >(event.my_status);

  const date = new Date(event.starts_at);
  const day = date.toLocaleDateString("fr-FR", { weekday: "short" });
  const dayNum = date.getDate();
  const month = date.toLocaleDateString("fr-FR", { month: "short" });
  const time = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const onRsvp = (status: CircleEventAttendanceStatus) => {
    /* Toggle : cliquer le bouton actif → annule. */
    const optimisticNext = myStatus === status ? null : status;
    const previousStatus = myStatus;
    setMyStatus(optimisticNext);

    startTransition(async () => {
      const result =
        optimisticNext === null
          ? await cancelEventRsvp(event.id)
          : await attendCircleEvent(event.id, optimisticNext);
      if (!result.ok) {
        setMyStatus(previousStatus);
        toast.error(result.error ?? "Action impossible.");
        return;
      }
      if (optimisticNext === "going") toast.success("On y compte sur toi !");
      else if (optimisticNext === "maybe") toast.success("Peut-être — OK.");
      else if (optimisticNext === "not_going")
        toast.success("Marqué comme indisponible.");
      else toast.success("RSVP annulé.");
    });
  };

  /* Type icon + label. */
  const typeIcon =
    event.event_type === "online" ? (
      <Video className="w-3 h-3" aria-hidden />
    ) : event.event_type === "hybrid" ? (
      <>
        <MapPin className="w-3 h-3" aria-hidden />
        <Video className="w-3 h-3" aria-hidden />
      </>
    ) : (
      <MapPin className="w-3 h-3" aria-hidden />
    );
  const typeLabel =
    event.event_type === "online"
      ? "En ligne"
      : event.event_type === "hybrid"
        ? "Hybride"
        : "En présentiel";

  const isCancelled = event.status === "cancelled";

  return (
    <article
      className={cn(
        "flex gap-4 p-4 rounded-2xl bg-white border border-line",
        isCancelled && "opacity-60",
      )}
    >
      {/* Date pill */}
      <div className="shrink-0 w-16 rounded-xl bg-night text-cream py-2 text-center shadow-soft overflow-hidden">
        <p className="text-[9px] tracking-[0.14em] uppercase font-extrabold text-gold">
          {day}
        </p>
        <p className="font-display italic text-2xl leading-none">{dayNum}</p>
        <p className="text-[9px] uppercase tracking-wide text-cream/70 mt-0.5">
          {month}
        </p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
              CATEGORY_BADGE[event.category],
            )}
          >
            {CATEGORY_LABEL[event.category]}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-night-dim">
            {typeIcon}
            {typeLabel}
          </span>
          <span className="text-[11px] text-night-dim">{time}</span>
          {isCancelled ? (
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
              Annulé
            </span>
          ) : null}
        </div>

        <h3 className="font-semibold text-night mt-1 leading-tight truncate">
          {event.title}
        </h3>

        {event.event_type !== "in_person" && event.online_url ? (
          <a
            href={event.online_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[12px] text-gold-deep font-bold hover:underline"
          >
            <ExternalLink className="w-3 h-3" aria-hidden />
            {event.online_platform ?? "Lien de connexion"}
          </a>
        ) : null}
        {event.location && event.event_type !== "online" ? (
          <p className="text-xs text-night-dim mt-1 inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" aria-hidden />
            {event.location}
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-night-dim inline-flex items-center gap-1">
            <Users2 className="w-3 h-3" aria-hidden />
            <span className="tabular-nums">{event.attendance_count}</span>{" "}
            {event.attendance_count > 1 ? "personnes" : "personne"} y vont
            {event.capacity ? ` · ${event.capacity} max` : ""}
          </p>

          {canRsvp && !isCancelled ? (
            <div className="inline-flex items-center gap-1">
              <RsvpButton
                label="J'y vais"
                icon={Check}
                active={myStatus === "going"}
                tone="going"
                onClick={() => onRsvp("going")}
                disabled={pending}
              />
              <RsvpButton
                label="Peut-être"
                icon={HelpCircle}
                active={myStatus === "maybe"}
                tone="maybe"
                onClick={() => onRsvp("maybe")}
                disabled={pending}
              />
              <RsvpButton
                label="Indispo"
                icon={X}
                active={myStatus === "not_going"}
                tone="notgoing"
                onClick={() => onRsvp("not_going")}
                disabled={pending}
              />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RsvpButton({
  label,
  icon: Icon,
  active,
  tone,
  onClick,
  disabled,
}: {
  label: string;
  icon: typeof Calendar;
  active: boolean;
  tone: "going" | "maybe" | "notgoing";
  onClick: () => void;
  disabled?: boolean;
}) {
  const activeClass = {
    going: "bg-gold text-night",
    maybe: "bg-amber-100 text-amber-700",
    notgoing: "bg-night/10 text-night-dim",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1 h-7 px-2 rounded-full text-[10.5px] font-extrabold transition-colors disabled:opacity-50",
        active
          ? activeClass
          : "bg-bg-soft text-night-dim hover:bg-line",
      )}
    >
      <Icon className="w-3 h-3" aria-hidden />
      {label}
    </button>
  );
}
