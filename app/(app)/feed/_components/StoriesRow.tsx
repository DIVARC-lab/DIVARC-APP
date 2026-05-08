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
      <ul className="flex items-start gap-4 min-w-max">
        <li className="flex flex-col items-center gap-1">
          <Link
            href={hasMyStories ? `/stories/${myGroup!.stories[0]!.id}` : "/stories/new"}
            aria-label={hasMyStories ? "Voir mes stories" : "Ajouter une story"}
            className="flex flex-col items-center gap-1.5 group"
          >
            <span className="relative w-16 h-16 rounded-full bg-night/[0.04] border-2 border-dashed border-night/20 flex items-center justify-center group-hover:border-gold/50 transition-colors">
              {hasMyStories ? (
                <Avatar
                  src={currentUserAvatarUrl}
                  fullName={currentUserName}
                  size="lg"
                  className="!w-[52px] !h-[52px]"
                />
              ) : (
                <span className="w-10 h-10 rounded-full bg-night text-cream flex items-center justify-center">
                  <Plus className="w-5 h-5" aria-hidden />
                </span>
              )}
              <span className="absolute -bottom-1 -right-1 w-[22px] h-[22px] rounded-full bg-gold text-night flex items-center justify-center border-2 border-bg shadow-sm">
                <Plus className="w-3 h-3" aria-hidden strokeWidth={3} />
              </span>
            </span>
            <span className="text-[11px] font-medium text-night-muted">
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
          "relative w-16 h-16 rounded-full p-[2px] transition-transform group-hover:scale-105",
          group.has_unviewed
            ? "bg-[conic-gradient(from_200deg,_#F4B942,_#F8CD76,_#B88A2A,_#F4B942)] shadow-[0_4px_14px_-4px_rgba(244,185,66,0.45)]"
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
      <span className="text-[11px] font-medium text-night-muted truncate max-w-[64px]">
        {displayName}
      </span>
    </Link>
  );
}
