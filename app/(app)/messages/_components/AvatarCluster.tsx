"use client";

import { Avatar } from "@/components/ui/Avatar";

type Member = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type AvatarClusterProps = {
  members: Member[];
  /** Combien d'avatars visibles maximum (les autres deviennent +N). */
  max?: number;
  size?: "sm" | "md";
};

/* Affichage compact pour les groupes : empile les avatars des membres
 * avec un décalage négatif. Si > max membres, affiche un badge +N. */
export function AvatarCluster({
  members,
  max = 3,
  size = "sm",
}: AvatarClusterProps) {
  const visible = members.slice(0, max);
  const extra = members.length - visible.length;
  const sizeClass = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  const overlapClass = size === "sm" ? "-ml-2 first:ml-0" : "-ml-3 first:ml-0";

  return (
    <div className="inline-flex items-center">
      {visible.map((m) => {
        const name = m.full_name ?? m.username ?? "Membre";
        return (
          <div
            key={m.user_id}
            className={`${overlapClass} ring-2 ring-white rounded-full`}
            title={name}
          >
            <Avatar src={m.avatar_url} fullName={name} size={size} />
          </div>
        );
      })}
      {extra > 0 ? (
        <div
          className={`${overlapClass} ${sizeClass} ring-2 ring-white rounded-full bg-night/10 text-night-soft font-bold inline-flex items-center justify-center`}
          aria-label={`+${extra} autres membres`}
        >
          +{extra}
        </div>
      ) : null}
    </div>
  );
}
