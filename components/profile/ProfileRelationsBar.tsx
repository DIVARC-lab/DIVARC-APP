import {
  getFollowState,
  getMutualFollowers,
  isCloseFriend,
} from "@/app/(app)/profile/relations-actions";
import { CloseFriendToggle } from "./CloseFriendToggle";
import { FollowButton } from "./FollowButton";
import { MutualFollowersBadge } from "./MutualFollowersBadge";

/* ProfileRelationsBar (server component) — barre d'actions relations
 * affichée sur le profil tiers (pas own).
 *
 * Fait 3 fetch parallèles : follow state, mutual followers, close friend.
 * Affiche : FollowButton + CloseFriendToggle (si déjà follow) + mutuals. */

type Props = {
  targetUserId: string;
  isOwn: boolean;
};

export async function ProfileRelationsBar({ targetUserId, isOwn }: Props) {
  if (isOwn) return null;

  const [followState, mutuals, closeFriend] = await Promise.all([
    getFollowState(targetUserId),
    getMutualFollowers(targetUserId, 6),
    isCloseFriend(targetUserId),
  ]);

  return (
    <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2">
        <FollowButton
          targetUserId={targetUserId}
          initialFollowing={followState.isFollowing}
        />
        {followState.isFollowing ? (
          <CloseFriendToggle
            targetUserId={targetUserId}
            initial={closeFriend}
          />
        ) : null}
        {followState.isFollower && !followState.isFollowing ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-bg-soft text-night-muted text-[11px] font-semibold">
            Te suit
          </span>
        ) : null}
      </div>
      {mutuals.length > 0 ? <MutualFollowersBadge mutuals={mutuals} /> : null}
    </div>
  );
}
