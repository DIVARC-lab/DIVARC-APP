"use client";

/* useFeed — pagination client-side du feed.
 *
 * Pattern : on hydrate avec les premiers posts SSR (props), et chaque
 * appel à `loadMore()` server-action ajoute la page suivante via
 * cursor-based pagination (created_at < cursor). Le hook gère :
 *  - L'état local des posts (initial + chargés par la suite)
 *  - Le cursor courant
 *  - Un drapeau `loading` pour l'UI infinite scroll
 *  - Un drapeau `done` quand le serveur retourne moins de N posts
 *  - Le mutateur optimistic pour updater un post (post like, comment) */

import { useCallback, useState } from "react";
import { loadMoreFeedPosts } from "@/app/(app)/feed/actions";
import type { PostWithDetails } from "@/lib/database.types";

const PAGE_SIZE = 10;

export type UseFeedOptions = {
  initialPosts: PostWithDetails[];
};

export function useFeed({ initialPosts }: UseFeedOptions) {
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialPosts.length < PAGE_SIZE);

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const lastPost = posts[posts.length - 1];
      const cursor = lastPost?.created_at;
      if (!cursor) {
        setDone(true);
        return;
      }
      const res = await loadMoreFeedPosts({ cursor, limit: PAGE_SIZE });
      if (!res.ok) return;
      if (
        res.posts.length === 0 ||
        res.posts.length < PAGE_SIZE ||
        !res.hasMore
      ) {
        setDone(true);
      }
      /* Déduplication par id : si un post arrive 2× (publication
         pendant la fetch), on garde la version la plus récente. */
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const fresh = res.posts.filter((p) => !ids.has(p.id));
        return [...prev, ...fresh];
      });
    } finally {
      setLoading(false);
    }
  }, [posts, loading, done]);

  /* Optimistic mutate : permet à l'UI (InteractionBar, CommentForm)
     de patcher localement le post sans rerefetch. */
  const mutatePost = useCallback(
    (postId: string, patch: Partial<PostWithDetails>) => {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
      );
    },
    [],
  );

  return { posts, loading, done, loadMore, mutatePost };
}
