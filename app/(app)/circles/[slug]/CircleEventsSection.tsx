"use client";

import { Calendar, MapPin, Users2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { cn } from "@/lib/utils/cn";
import type {
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
    <section className="mt-10" aria-label="Événements">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gold-deep" aria-hidden />
          <KickerLabel>Événements</KickerLabel>
        </div>
        {isMember ? (
          <Link
            href={`/circles/${circleSlug}/events/new`}
            className="text-xs font-semibold text-gold-deep hover:text-night transition-colors"
          >
            + Nouvel événement
          </Link>
        ) : null}
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted text-center py-8 rounded-2xl border border-dashed border-line">
          Pas d'événement à venir.{" "}
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
  const date = new Date(event.starts_at);
  const day = date.toLocaleDateString("fr-FR", { weekday: "short" });
  const dayNum = date.getDate();
  const month = date.toLocaleDateString("fr-FR", { month: "short" });
  const time = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const going = event.my_status === "going";

  const onRsvp = () => {
    startTransition(async () => {
      if (going) {
        const result = await cancelEventRsvp(event.id);
        if (!result.ok) toast.error(result.error ?? "Action impossible.");
        else toast.success("RSVP annulé.");
      } else {
        const result = await attendCircleEvent(event.id, "going");
        if (!result.ok) toast.error(result.error ?? "Action impossible.");
        else toast.success("On y compte sur toi !");
      }
    });
  };

  return (
    <article className="flex gap-4 p-4 rounded-2xl bg-white border border-line">
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
          <span className="text-[11px] text-muted">{time}</span>
        </div>
        <h3 className="font-semibold text-night mt-1 leading-tight truncate">
          {event.title}
        </h3>
        {event.location ? (
          <p className="text-xs text-muted-strong mt-1 inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" aria-hidden />
            {event.location}
          </p>
        ) : null}
        <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-muted inline-flex items-center gap-1">
            <Users2 className="w-3 h-3" aria-hidden />
            {event.attendance_count}{" "}
            {event.attendance_count > 1 ? "personnes" : "personne"} y va
            {event.capacity ? ` · ${event.capacity} max` : ""}
          </p>
          {canRsvp ? (
            <button
              type="button"
              onClick={onRsvp}
              disabled={pending}
              className={cn(
                "px-3 h-8 rounded-full text-xs font-semibold transition-colors disabled:opacity-50",
                going
                  ? "bg-gold text-night hover:bg-gold-soft"
                  : "bg-night text-cream hover:bg-night-soft",
              )}
            >
              {going ? "✓ J'y vais" : "+ Y aller"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
