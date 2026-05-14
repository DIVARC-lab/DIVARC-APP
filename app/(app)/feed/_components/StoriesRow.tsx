/**
 * StoriesRow — refonte audit S2 polish (handoff feed-mobile-bold L32-55).
 *
 * Pixel-fixes :
 * - Container : marginTop -10 px (pour remonter dans le hero), padding 0/12 bottom
 * - Inner row : gap 12 padding 8/18
 * - FAB : border-[2.5px] border-bg-soft (= #F1F3F8 du proto, pas border-bg #fff)
 * - FAB icon Plus : w-[13px] h-[13px] (proto exact)
 * - Inner ring : bg-bg-soft (= #F1F3F8 du proto, pas bg-bg-deep cream)
 * - Self label color : text-night-soft (= #142A55 proto, pas text-night)
 */
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
    <div className="-mt-2.5 pb-3 overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]">
      <ul className="flex items-start gap-3 px-[18px] py-2 min-w-max">
        {/* Tile "Toi" — card blanche border navy + FAB gold pour ajouter */}
        <li className="flex flex-col items-center gap-1.5 shrink-0">
          <Link
            href={
              hasMyStories
                ? `/stories/${myGroup!.stories[0]!.id}`
                : "/stories/new"
            }
            aria-label={hasMyStories ? "Voir mes stories" : "Ajouter une story"}
            className="group flex flex-col items-center gap-1.5"
          >
            <span className="relative w-[70px] h-[70px] rounded-full bg-white border-2 border-night flex items-center justify-center transition-transform group-hover:scale-105">
              {hasMyStories ? (
                <Avatar
                  src={currentUserAvatarUrl}
                  fullName={currentUserName}
                  size="lg"
                  className="!w-[56px] !h-[56px]"
                />
              ) : (
                <span className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-bg-soft font-display italic text-2xl text-night-muted">
                  {currentUserName?.charAt(0).toUpperCase() ?? "+"}
                </span>
              )}
              <span
                aria-hidden
                className="absolute -bottom-[3px] -right-[3px] flex h-[26px] w-[26px] items-center justify-center rounded-full bg-gold text-night border-[2.5px] border-bg-soft shadow-[0_4px_12px_rgba(244,185,66,0.5)]"
              >
                <Plus
                  className="w-[13px] h-[13px]"
                  strokeWidth={3}
                  aria-hidden
                />
              </span>
            </span>
            <span className="text-[11px] font-semibold text-night-soft max-w-[70px] truncate">
              Toi
            </span>
          </Link>
          {hasMyStories ? (
            <Link
              href="/stories/archive"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-gold-deep hover:underline"
            >
              <Eye className="w-3 h-3" aria-hidden />
              Archive
            </Link>
          ) : null}
        </li>

        {/* Stories des autres */}
        {otherGroups.map((group) => (
          <li key={group.author.id} className="shrink-0">
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
      className="group flex flex-col items-center gap-1.5"
    >
      <span
        className={cn(
          "relative w-[70px] h-[70px] rounded-full p-[3px] transition-transform group-hover:scale-105",
          group.has_unviewed
            ? "bg-[conic-gradient(from_200deg,_#F4B942,_#F8CD76,_#B88A2A,_#F4B942)] shadow-[0_6px_18px_-4px_rgba(244,185,66,0.45)]"
            : "bg-night/15",
        )}
      >
        <span className="block w-full h-full rounded-full p-[2px] bg-bg-soft">
          <Avatar
            src={group.author.avatar_url}
            fullName={group.author.full_name ?? group.author.username}
            size="lg"
            className="!w-full !h-full"
          />
        </span>
      </span>
      <span className="text-[11px] font-semibold text-night-soft max-w-[70px] truncate">
        {displayName}
      </span>
    </Link>
  );
}
