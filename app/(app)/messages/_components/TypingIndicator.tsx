"use client";

import { Avatar } from "@/components/ui/Avatar";

type TyperProfile = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type TypingIndicatorProps = {
  typerIds: string[];
  memberMap: Record<string, TyperProfile>;
  isGroup: boolean;
};

export function TypingIndicator({
  typerIds,
  memberMap,
  isGroup,
}: TypingIndicatorProps) {
  if (typerIds.length === 0) return null;

  const profiles = typerIds
    .map((id) => memberMap[id])
    .filter((profile): profile is TyperProfile => profile !== undefined);

  const firstName = (profile: TyperProfile) =>
    profile.full_name?.split(" ")[0] ?? profile.username ?? "Quelqu'un";

  let label: string;
  if (profiles.length === 0) {
    label = "écrit…";
  } else if (profiles.length === 1) {
    label = isGroup
      ? `${firstName(profiles[0]!)} écrit…`
      : "écrit…";
  } else if (profiles.length === 2) {
    label = `${firstName(profiles[0]!)} et ${firstName(profiles[1]!)} écrivent…`;
  } else {
    label = "Plusieurs personnes écrivent…";
  }

  return (
    <div className="flex items-center gap-2 px-4 sm:px-6 py-2">
      <div className="flex -space-x-1.5">
        {profiles.slice(0, 2).map((profile) => (
          <Avatar
            key={profile.user_id}
            src={profile.avatar_url}
            fullName={profile.full_name ?? profile.username}
            size="sm"
            className="!w-5 !h-5 ring-2 ring-bg"
          />
        ))}
      </div>
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-night/5 text-xs text-night-muted">
        <span className="flex items-center gap-1">
          <Dot delay="0ms" />
          <Dot delay="150ms" />
          <Dot delay="300ms" />
        </span>
        <span>{label}</span>
      </span>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      aria-hidden
      className="w-1 h-1 rounded-full bg-night-muted animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
