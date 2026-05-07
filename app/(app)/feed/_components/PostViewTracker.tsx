"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type PostViewTrackerProps = {
  postId: string;
};

const trackedInSession = new Set<string>();

/** Wraps a post and records a view once it stays >50% visible for >1.5s.
 * Used to feed the recommendation algorithm (deprioritize already-seen posts). */
export function PostViewTracker({ postId }: PostViewTrackerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (trackedInSession.has(postId)) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.5) {
            timeoutRef.current = setTimeout(() => {
              if (trackedInSession.has(postId)) return;
              trackedInSession.add(postId);
              const supabase = createClient();
              void supabase.rpc("record_post_view", { target_post_id: postId });
              observer.disconnect();
            }, 1500);
          } else if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [postId]);

  return <div ref={ref} className="contents" />;
}
