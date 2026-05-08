"use client";

import { usePresenceHeartbeat } from "@/lib/hooks/usePresenceHeartbeat";

/** Wrapper côté client à monter dans le layout authentifié pour maintenir
 * la présence du user courant (online / away / offline). */
export function PresenceHeartbeat() {
  usePresenceHeartbeat();
  return null;
}
