import { Eye, Plus } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import type { StoryGroup } from "@/lib/database.types";

type StoriesRowProps = {
  groups: StoryGroup[];
  currentUserId: string;
  currentUserAvatarUrl: string | null;
  currentUserName: string | null;
};

/** Stories row — pattern Bold du proto handoff :
 *  - Anneau conic-gradient gold épais 70x70 (3px padding) avec
 *    shadow gold visible quand has_unviewed
 *  - "Toi" en card blanche border navy 2px + FAB plus gold 26px
 *    en chevauchement bas-droite (au lieu du dashed border subtil)
 *  - Avatars 56-58px à l'intérieur de l'anneau
 *  - Label sm font-semibold text-night (au lieu de night-muted) */
export function StoriesRow({
  groups,
  currentUserId,
  currentUserAvatarUrl,
  currentUserName,
}: StoriesRowProps) {
  const myGroup = groups.find((g) => g.author.id === currentUserId);
  const otherGroups = groups.filter((g) => g.author.id !== currentUserId);
  const hasMyStories = !!myGroup && myGroup.stories.length > 0;

  return (
    <div className="-mx-4 sm:mx-0 px-4 sm:px-0 py-1 overflow-x-auto">
      <ul className="flex items-start gap-3 min-w-max">
        <li className="flex flex-col items-center gap-1.5">
          <Link
            href={
              hasMyStories
                ? `/stories/${myGroup!.stories[0]!.id}`
                : "/stories/new"
            }
            aria-label={hasMyStories ? "Voir mes stories" : "Ajouter une story"}
            className="flex flex-col items-center gap-1.5 group"
          >
            <span className="relative w-[70px] h-[70px] rounded-full bg-white border-2 border-night flex items-center justify-center group-hover:scale-105 transition-transform">
              {hasMyStories ? (
                <Avatar
                  src={currentUserAvatarUrl}
                  fullName={currentUserName}
                  size="lg"
                  className="!w-[56px] !h-[56px]"
                />
              ) : (
                <span className="w-[56px] h-[56px] rounded-full bg-bg-deep flex items-center justify-center text-night-muted font-display italic text-2xl">
                  {currentUserName?.charAt(0).toUpperCase() ?? "?"}
                </span>
              )}
              <span className="absolute -bottom-1 -right-1 w-[26px] h-[26px] rounded-full bg-gold text-night flex items-center justify-center border-[2.5px] border-bg shadow-[0_4px_12px_rgba(244,185,66,0.5)]">
                <Plus className="w-3.5 h-3.5" aria-hidden strokeWidth={3} />
              </span>
            </span>
            <span className="text-[11px] font-semibold text-night max-w-[70px] truncate">
              Toi
            </span>
          </Link>
          {hasMyStories ? (
            <Link
              href="/stories/archive"
              className="text-[10px] font-semibold text-gold-deep hover:underline inline-flex items-center gap-1"
            >
              <Eye className="w-3 h-3" aria-hidden />
              Archive
            </Link>
          ) : null}
        </li>

        {otherGroups.map((group) => (
          <li key={group.author.id}>
            <StoryAvatarLink group={group} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function StoryAvatarLink({ group }: { group: StoryGroup }) {
  const firstStoryId = group.stories[0]?.id;
  const displayName =
    group.author.full_name?.split(" ")[0] ?? group.author.username ?? "—";

  if (!firstStoryId) return null;

  return (
    <Link
      href={`/stories/${firstStoryId}`}
      className="flex flex-col items-center gap-1.5 group"
    >
      <span
        className={cn(
          "relative w-[70px] h-[70px] rounded-full p-[3px] transition-transform group-hover:scale-105",
          group.has_unviewed
            ? "bg-[conic-gradient(from_200deg,_#F4B942,_#F8CD76,_#B88A2A,_#F4B942)] shadow-[0_6px_18px_-4px_rgba(244,185,66,0.45)]"
            : "bg-night/15",
        )}
      >
        <span className="block w-full h-full rounded-full p-[2px] bg-bg">
          <Avatar
            src={group.author.avatar_url}
            fullName={group.author.full_name ?? group.author.username}
            size="lg"
            className="!w-full !h-full"
          />
        </span>
      </span>
      <span className="text-[11px] font-semibold text-night truncate max-w-[70px]">
        {displayName}
      </span>
    </Link>
  );
}
