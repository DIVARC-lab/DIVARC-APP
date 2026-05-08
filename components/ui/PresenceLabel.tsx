"use client";

import { useEffect, useState } from "react";
import type {
  CustomStatus,
  PresenceInfo,
  PresenceStatus,
} from "@/lib/database.types";

type PresenceLabelProps = {
  presence: PresenceInfo | null;
  /** Texte affiché si la présence est masquée pour le viewer. */
  fallback?: string;
  className?: string;
};

export function PresenceLabel({
  presence,
  fallback = "",
  className,
}: PresenceLabelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!presence) {
    return fallback ? <span className={className}>{fallback}</span> : null;
  }

  const text = formatPresence(presence.presence_status, presence.last_seen_at, presence.custom_status, now);
  return <span className={className}>{text}</span>;
}

function formatPresence(
  status: PresenceStatus,
  lastSeenAt: string | null,
  customStatus: CustomStatus,
  now: number,
): string {
  if (status === "online") {
    if (customStatus === "dnd") return "Ne pas déranger";
    if (customStatus === "busy") return "Occupé";
    return "En ligne";
  }
  if (status === "away") {
    if (customStatus === "dnd") return "Ne pas déranger · absent";
    return "Absent";
  }
  // offline
  if (!lastSeenAt) return "Hors ligne";
  const diffMs = now - new Date(lastSeenAt).getTime();
  return `Vu ${formatRelative(diffMs)}`;
}

function formatRelative(diffMs: number): string {
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem`;
  return `il y a longtemps`;
}
