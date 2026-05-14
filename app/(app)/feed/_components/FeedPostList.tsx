"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2 } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { PostWithDetails } from "@/lib/database.types";
import type { RankingSignalDisplay } from "@/components/feed/WhyThisPost";
import { AdSlot } from "@/components/ads/AdSlot";
import { useLastFeedVisit } from "@/lib/hooks/useLastFeedVisit";
import { loadMoreFeedPosts } from "../actions";
import { AntiDoomscrollPause } from "./AntiDoomscrollPause";
import { FeedReasonChip } from "./FeedReasonChip";
import { PostCard } from "./PostCard";
import { PostViewTracker } from "./PostViewTracker";

/* Seuil au-delà duquel on bascule en virtual scroll.
 * Sous 100 posts : DOM léger, scroll natif fluide, on ne virtualise PAS
 * (évite le risque de reset state PostCard / dropdowns au scroll).
 * Au-delà : on virtualise pour garder un DOM stable.
 *
 * En pratique : un user atteint 100 posts seulement après ~3 scrolls
 * (40 initial + 20 par batch). Improbable pour la plupart des sessions. */
const VIRTUAL_SCROLL_THRESHOLD = 100;

type FeedPostListProps = {
  initialPosts: PostWithDetails[];
  currentUserId: string;
  /* Reason chips affichés au-dessus de certains posts (tab transparent). */
  reasonByPostId?: Record<string, string>;
  /* Ranking signals pour <WhyThisPost /> (tab for-you). */
  rankingSignalsByPostId?: Record<string, RankingSignalDisplay[]>;
  /* Active l'infinite scroll uniquement pour le tab "latest"
     (chronologique, cursor stable). Les autres tabs (for-you/friends/
     transparent) ont des sources de ranking non-stables au paging et
     restent en chargement initial complet pour l'instant. */
  enableInfiniteScroll: boolean;
};

/* Composant client qui rend la liste des posts du feed + gère :
 *
 *  - Infinite scroll lazy load (sentinel IntersectionObserver + server
 *    action loadMoreFeedPosts cursor-based, batches de 20)
 *  - Insertion AdSlot tous les 6 posts
 *  - Insertion AntiDoomscrollPause tous les 20 posts
 *  - Fallback : si !enableInfiniteScroll, rendu statique simple
 *
 * Note : on garde le rendu Server pour les posts initiaux (SEO + first
 * paint rapide), ce composant ne hydrate QUE la logique de pagination
 * incrémentale.
 */
export function FeedPostList({
  initialPosts,
  currentUserId,
  reasonByPostId,
  rankingSignalsByPostId,
  enableInfiniteScroll,
}: FeedPostListProps) {
  const [posts, setPosts] = useState<PostWithDetails[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(
    initialPosts.length > 0 ? initialPosts[initialPosts.length - 1]!.created_at : null,
  );
  const [hasMore, setHasMore] = useState<boolean>(enableInfiniteScroll);
  const [loading, setLoading] = useState(false);

  /* Étape 15 — timestamp de la dernière visite pour calculer les posts
     "Nouveau". Hook appelé UNE seule fois ici (vs dans chaque PostCard
     = 40 listeners). On passe la valeur en prop à PostCard. */
  const lastFeedVisit = useLastFeedVisit();
  const sentinelRef = useRef<HTMLLIElement>(null);
  /* Track les IDs déjà fetchés pour dédupliquer en cas de double-trigger. */
  const seenIdsRef = useRef<Set<string>>(
    new Set(initialPosts.map((p) => p.id)),
  );

  /* Sync state si les props initialPosts changent (ex: change de tab,
     router.refresh, etc.). */
  useEffect(() => {
    setPosts(initialPosts);
    setCursor(
      initialPosts.length > 0
        ? initialPosts[initialPosts.length - 1]!.created_at
        : null,
    );
    setHasMore(enableInfiniteScroll);
    seenIdsRef.current = new Set(initialPosts.map((p) => p.id));
  }, [initialPosts, enableInfiniteScroll]);

  const fetchMore = useCallback(async () => {
    if (!cursor || !hasMore || loading || !enableInfiniteScroll) return;
    setLoading(true);
    try {
      const res = await loadMoreFeedPosts({ cursor });
      if (!res.ok) {
        setHasMore(false);
        return;
      }
      /* Dédup au cas où le cursor capte un doublon (race condition
         insertion d'un nouveau post pendant qu'on scroll). */
      const newOnes = res.posts.filter((p) => !seenIdsRef.current.has(p.id));
      newOnes.forEach((p) => seenIdsRef.current.add(p.id));
      setPosts((prev) => [...prev, ...newOnes]);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore && newOnes.length > 0);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading, enableInfiniteScroll]);

  /* IntersectionObserver sur le sentinel — déclenche fetchMore quand
     ≤ 800px du bas (rootMargin). Pas de polling, pas de scroll handler
     coûteux. */
  useEffect(() => {
    if (!enableInfiniteScroll) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchMore();
        }
      },
      { rootMargin: "0px 0px 800px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMore, enableInfiniteScroll]);

  /* Mode virtual scroll si on dépasse le seuil. Sinon rendu plat. */
  const shouldVirtualize = posts.length >= VIRTUAL_SCROLL_THRESHOLD;

  if (shouldVirtualize) {
    return (
      <VirtualizedList
        posts={posts}
        currentUserId={currentUserId}
        reasonByPostId={reasonByPostId}
        rankingSignalsByPostId={rankingSignalsByPostId}
        enableInfiniteScroll={enableInfiniteScroll}
        loading={loading}
        hasMore={hasMore}
        sentinelRef={sentinelRef}
        lastFeedVisit={lastFeedVisit}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-5 sm:gap-4 px-4 sm:px-6 pb-10">
      {posts.map((post, index) => {
        const reason = reasonByPostId?.[post.id];
        const rankingSignals = rankingSignalsByPostId?.[post.id];
        return (
          <Fragment key={post.id}>
            <li>
              {reason ? (
                <div className="mb-1.5">
                  <FeedReasonChip reason={reason} />
                </div>
              ) : null}
              <PostViewTracker postId={post.id} />
              <PostCard
                post={post}
                currentUserId={currentUserId}
                hero={index === 0}
                rankingSignals={rankingSignals}
                lastFeedVisit={lastFeedVisit}
              />
            </li>
            {/* Densité publicitaire DIVARC : 1 ad tous les 6 posts. */}
            {index > 0 && (index + 1) % 6 === 0 ? (
              <li aria-label="Publicité sponsorisée">
                <AdSlot
                  surface="feed_home"
                  slotIndex={Math.floor((index + 1) / 6)}
                />
              </li>
            ) : null}
            {/* Pause anti-doomscroll toutes les 20 positions. */}
            {index > 0 && (index + 1) % 20 === 0 ? (
              <li>
                <AntiDoomscrollPause
                  pauseIndex={Math.floor((index + 1) / 20)}
                />
              </li>
            ) : null}
          </Fragment>
        );
      })}

      {/* Sentinel + indicateur de chargement (infinite scroll uniquement). */}
      {enableInfiniteScroll ? (
        <li ref={sentinelRef} className="flex justify-center py-6">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-night-muted text-sm">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Chargement…
            </span>
          ) : hasMore ? (
            <span className="text-xs text-muted">
              Continue de scroller pour voir plus
            </span>
          ) : (
            <span className="text-xs italic text-muted">
              Tu as vu tous les posts récents.
            </span>
          )}
        </li>
      ) : null}
    </ul>
  );
}

/* ============================================================
 * VirtualizedList — rendu virtualisé pour 100+ posts
 * ============================================================
 *
 * Utilise @tanstack/react-virtual avec mesure dynamique des hauteurs
 * (estimateSize 400px + measureElement après rendu).
 *
 * Limitations connues :
 *  - Les sticky internes des cards (header sticky, etc.) ne survivent
 *    pas au scroll virtualisé. Les PostCard DIVARC actuelles n'en ont
 *    pas → pas d'impact.
 *  - L'état local des dropdowns / forms inline peut être perdu si la
 *    card sort du buffer (overscan: 5). Acceptable car rare.
 *  - PostViewTracker continue de fonctionner via IntersectionObserver
 *    de chaque PostCard.
 */
type VirtualItem =
  | { kind: "post"; post: PostWithDetails; index: number }
  | { kind: "ad"; slotIndex: number; key: string }
  | { kind: "pause"; pauseIndex: number; key: string };

function VirtualizedList({
  posts,
  currentUserId,
  reasonByPostId,
  rankingSignalsByPostId,
  enableInfiniteScroll,
  loading,
  hasMore,
  sentinelRef,
  lastFeedVisit,
}: {
  posts: PostWithDetails[];
  currentUserId: string;
  reasonByPostId?: Record<string, string>;
  rankingSignalsByPostId?: Record<string, RankingSignalDisplay[]>;
  enableInfiniteScroll: boolean;
  loading: boolean;
  hasMore: boolean;
  sentinelRef: React.RefObject<HTMLLIElement | null>;
  lastFeedVisit: number | null;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  /* Construit la liste d'items composite : posts + ads + pauses
     interleavés selon la même règle que le rendu non-virtuel. */
  const items: VirtualItem[] = useMemo(() => {
    const result: VirtualItem[] = [];
    posts.forEach((post, index) => {
      result.push({ kind: "post", post, index });
      if (index > 0 && (index + 1) % 6 === 0) {
        result.push({
          kind: "ad",
          slotIndex: Math.floor((index + 1) / 6),
          key: `ad-${index}`,
        });
      }
      if (index > 0 && (index + 1) % 20 === 0) {
        result.push({
          kind: "pause",
          pauseIndex: Math.floor((index + 1) / 20),
          key: `pause-${index}`,
        });
      }
    });
    return result;
  }, [posts]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400, /* hauteur moyenne d'un post avec image */
    overscan: 5,
    measureElement:
      typeof ResizeObserver !== "undefined"
        ? (el) => el.getBoundingClientRect().height
        : undefined,
    getItemKey: (i) => {
      const it = items[i]!;
      return it.kind === "post" ? it.post.id : it.key;
    },
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto px-4 sm:px-6 pb-10"
      style={{
        /* Hauteur fixée pour que useVirtualizer puisse calculer le scroll.
           100vh - header (56px) - marge bas (40px). */
        height: "calc(100dvh - 96px)",
        contain: "strict",
      }}
    >
      <ul
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
        className="w-full"
      >
        {virtualItems.map((virtualRow) => {
          const item = items[virtualRow.index]!;
          return (
            <li
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 right-0 pt-5 sm:pt-4"
              style={{
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {item.kind === "post" ? (
                <>
                  {reasonByPostId?.[item.post.id] ? (
                    <div className="mb-1.5">
                      <FeedReasonChip reason={reasonByPostId[item.post.id]!} />
                    </div>
                  ) : null}
                  <PostViewTracker postId={item.post.id} />
                  <PostCard
                    post={item.post}
                    currentUserId={currentUserId}
                    hero={item.index === 0}
                    rankingSignals={rankingSignalsByPostId?.[item.post.id]}
                    lastFeedVisit={lastFeedVisit}
                  />
                </>
              ) : item.kind === "ad" ? (
                <AdSlot surface="feed_home" slotIndex={item.slotIndex} />
              ) : (
                <AntiDoomscrollPause pauseIndex={item.pauseIndex} />
              )}
            </li>
          );
        })}
      </ul>

      {enableInfiniteScroll ? (
        <ul>
          <li ref={sentinelRef} className="flex justify-center py-6">
            {loading ? (
              <span className="inline-flex items-center gap-2 text-night-muted text-sm">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Chargement…
              </span>
            ) : hasMore ? (
              <span className="text-xs text-muted">
                Continue de scroller pour voir plus
              </span>
            ) : (
              <span className="text-xs italic text-muted">
                Tu as vu tous les posts récents.
              </span>
            )}
          </li>
        </ul>
      ) : null}
    </div>
  );
}
