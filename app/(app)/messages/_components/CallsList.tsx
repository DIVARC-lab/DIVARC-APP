"use client";

import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { formatCallDuration, callStatusLabel } from "@/lib/calls/types";
import type { CallListItem } from "@/lib/queries/calls";
import { formatRelative } from "@/lib/utils/relativeTime";

type CallsListProps = {
  calls: CallListItem[];
};

/* Liste des appels récents. Item : avatar peer + nom + icone direction
 * (PhoneIncoming/Outgoing/Missed) + statut/durée + horodatage. Tap →
 * ouvre la conversation. */
export function CallsList({ calls }: CallsListProps) {
  if (calls.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div
          aria-hidden
          className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cream to-gold/20 border border-gold/30 flex items-center justify-center mb-4"
        >
          <Phone className="w-6 h-6 text-gold-deep" aria-hidden />
        </div>
        <h3 className="font-display text-lg text-night">Aucun appel</h3>
        <p className="mt-1 text-xs text-muted leading-relaxed max-w-[240px] mx-auto">
          Lance ton premier appel depuis une conversation directe en cliquant
          sur 📞 dans l&apos;en-tête.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {calls.map((call) => (
        <li key={call.id}>
          <CallRow call={call} />
        </li>
      ))}
    </ul>
  );
}

function CallRow({ call }: { call: CallListItem }) {
  const peerName =
    call.peer?.full_name ?? call.peer?.username ?? "Inconnu";
  const isMissed = call.is_missed;
  const isInbound = !call.is_outgoing;

  /* Couleur de l'icône direction + badge. */
  const Icon = isMissed
    ? PhoneMissed
    : call.kind === "video"
      ? Video
      : isInbound
        ? PhoneIncoming
        : PhoneOutgoing;
  const iconClass = isMissed
    ? "text-red-500"
    : call.is_outgoing
      ? "text-emerald-500"
      : "text-night-muted";

  const subLabel =
    call.status === "ended" && call.duration_ms
      ? formatCallDuration(call.duration_ms)
      : callStatusLabel(call.status, call.is_outgoing);

  return (
    <Link
      href={`/messages/${call.conversation_id}`}
      className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border border-line bg-white hover:border-night/30 hover:bg-night/[0.02] transition-colors overflow-hidden"
    >
      <Avatar
        src={call.peer?.avatar_url ?? null}
        fullName={peerName}
        size="md"
        className="shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
          <p
            className={`min-w-0 text-sm font-semibold truncate ${
              isMissed ? "text-red-600" : "text-night"
            }`}
          >
            {peerName}
          </p>
          <span className="text-[10px] text-muted shrink-0 whitespace-nowrap">
            {formatRelative(call.started_at)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Icon className={`w-3 h-3 shrink-0 ${iconClass}`} aria-hidden />
          <span className="text-xs text-night-muted truncate">{subLabel}</span>
        </div>
      </div>
    </Link>
  );
}
