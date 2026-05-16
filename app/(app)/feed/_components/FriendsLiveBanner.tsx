/* Étape 10 — Banner "Tes amis sont en direct" dans le feed.
 *
 * Component server qui :
 *  - Lit list_live_now() avec filtrage côté server par following + friends
 *  - Affiche les 1-3 lives prioritaires (suivis avant amis)
 *  - Layout horizontal compact, distinct du carrousel global "En direct"
 *  - Retourne null si aucun live de suivi
 *
 * Différence vs LivesNowCarousel : ici c'est personnel (tes connexions),
 * pas la découverte globale. */

import { CircleDot, Users } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/server";
import { listLiveNow } from "@/lib/queries/liveStreams";

type Props = {
  userId: string;
};

export async function FriendsLiveBanner({ userId }: Props) {
  const supabase = await createClient();

  /* Récup follows + friends pour matcher les host_id. */
  const [followsRes, friendsRes] = await Promise.all([
    supabase
      .from("user_follows")
      .select("followed_id")
      .eq("follower_id", userId),
    supabase
      .from("friendships")
      .select("requester_id, recipient_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`),
  ]);

  const followedIds = new Set(
    ((followsRes.data ?? []) as Array<{ followed_id: string }>).map(
      (f) => f.followed_id,
    ),
  );
  const friendIds = new Set<string>();
  for (const f of (friendsRes.data ?? []) as Array<{
    requester_id: string;
    recipient_id: string;
  }>) {
    friendIds.add(f.requester_id === userId ? f.recipient_id : f.requester_id);
  }

  if (followedIds.size === 0 && friendIds.size === 0) return null;

  /* Lit les lives en cours (RLS filtre par visibility). On filtre
     ensuite par host_id ∈ follows∪friends. */
  const allLives = await listLiveNow(userId, { limit: 50 });
  const personalLives = allLives
    .filter(
      (l) => followedIds.has(l.host_id) || friendIds.has(l.host_id),
    )
    .slice(0, 3);

  if (personalLives.length === 0) return null;

  return (
    <section
      aria-label="Tes amis en direct"
      className="px-4 sm:px-6 mb-4"
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-rose-600 mb-2 flex items-center gap-1.5">
        <CircleDot
          className="w-2.5 h-2.5 text-rose-600 animate-pulse"
          aria-hidden
        />
        Tes amis sont en direct
      </p>
      <ul className="space-y-2">
        {personalLives.map((live) => {
          const isFollowed = followedIds.has(live.host_id);
          const isFriend = friendIds.has(live.host_id);
          return (
            <li key={live.id}>
              <Link
                href={`/lives/${live.id}`}
                className="group flex items-center gap-3 rounded-2xl bg-white border border-rose-100 hover:border-rose-300 p-3 transition-colors"
              >
                <div className="relative shrink-0">
                  <Avatar
                    src={live.host?.avatar_url ?? null}
                    fullName={
                      live.host?.full_name ??
                      live.host?.username ??
                      "Streamer"
                    }
                    size="md"
                  />
                  {/* Ring rouge pulsé pour marquer LIVE. */}
                  <span
                    aria-hidden
                    className="absolute -inset-0.5 rounded-full ring-2 ring-rose-500 animate-pulse pointer-events-none"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-bold text-night truncate">
                      {live.host?.full_name ??
                        live.host?.username ??
                        "Streamer"}
                    </p>
                    <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-rose-100 text-rose-700 text-[9px] font-bold uppercase tracking-wider">
                      Live
                    </span>
                  </div>
                  <p className="text-[11.5px] text-night-dim line-clamp-1 mt-0.5">
                    {live.title}
                  </p>
                  <p className="text-[10px] text-night-dim/70 flex items-center gap-1 mt-0.5">
                    <Users className="w-2.5 h-2.5" aria-hidden />
                    {live.participants_count} en écoute
                    {isFriend
                      ? " · ami"
                      : isFollowed
                        ? " · suivi"
                        : ""}
                  </p>
                </div>
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-rose-500 text-white text-[10px] font-bold group-hover:bg-rose-600 transition-colors shrink-0">
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
