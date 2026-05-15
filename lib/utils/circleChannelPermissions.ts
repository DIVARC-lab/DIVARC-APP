/* Sprint B.5 — Helpers permissions channels cercle.
 *
 * Source de vérité partagée entre :
 *  - queries (listCircleChannels filtre view)
 *  - server actions (createCirclePost check post)
 *  - UI (compose locked si pas autorisé)
 *
 * Logique : null/undefined dans permissions[action] = hérite des
 * defaults par channel_type. Sinon, le rôle doit figurer dans la liste. */

import type {
  CircleChannelPermissions,
  CircleChannelSummary,
  CircleChannelType,
  CircleRole,
} from "@/lib/database.types";

const MODERATOR_ROLES: ReadonlyArray<CircleRole> = [
  "owner",
  "admin",
  "moderator",
  "mod",
];

const ALL_ROLES: ReadonlyArray<CircleRole> = [
  "owner",
  "admin",
  "moderator",
  "mod",
  "ambassador",
  "contributor",
  "member",
];

function defaultsFor(
  channelType: CircleChannelType,
  action: "view" | "post",
): ReadonlyArray<CircleRole> {
  if (action === "view") return ALL_ROLES;
  /* action = "post" */
  if (channelType === "announcement") return MODERATOR_ROLES;
  return ALL_ROLES;
}

/* Resolve la liste effective de rôles autorisés pour cette action,
 * en mergeant les defaults par type avec l'override permissions. */
export function resolveAllowedRoles(
  channelType: CircleChannelType,
  permissions: CircleChannelPermissions | null | undefined,
  action: "view" | "post",
): ReadonlyArray<CircleRole> {
  const override = permissions?.[action];
  if (override !== undefined) {
    /* Override explicite — même un tableau vide est respecté
       (= personne ne peut effectuer l'action). */
    return override;
  }
  return defaultsFor(channelType, action);
}

/* true si le rôle donné peut effectuer l'action sur ce channel.
 * Null role = user non-membre (rare ici, RLS filtre en amont). */
function canDo(
  channel: Pick<CircleChannelSummary, "channel_type" | "permissions">,
  role: CircleRole | null,
  action: "view" | "post",
): boolean {
  if (!role) return false;
  const allowed = resolveAllowedRoles(
    channel.channel_type,
    channel.permissions ?? null,
    action,
  );
  return allowed.includes(role);
}

export function canViewChannel(
  channel: Pick<CircleChannelSummary, "channel_type" | "permissions">,
  role: CircleRole | null,
): boolean {
  return canDo(channel, role, "view");
}

export function canPostInChannel(
  channel: Pick<CircleChannelSummary, "channel_type" | "permissions">,
  role: CircleRole | null,
): boolean {
  return canDo(channel, role, "post");
}
