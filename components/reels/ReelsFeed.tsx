"use client";

import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { ReelView } from "./ReelView";
import { ColdStartOnboarding } from "./ColdStartOnboarding";
import { cn } from "@/lib/utils/cn";
import type { ReelWithDetails } from "@/lib/database.types";
import {
  completeColdStart,
  loadMoreForYouReels,
} from "@/app/(app)/reels/foryou-actions";

/* ReelsFeed — feed vertical fullscreen avec snap-scroll.
 *
 * Mobile : 100vh par reel, swipe up/down (CSS scroll-snap).
 * Desktop : container 480px ratio 9:16 centré, fond noir.
 *
 * Onglets "Pour toi" / "Suivis" en haut. ESC = retour, swipe-down
 * du premier reel ou bouton ← = retour à la page d'origine.
 *
 * IntersectionObserver : la vidéo en cours (>50% visible) play, les
 * autres pause. Préchargement : on précharge poster + buffer du reel
 * suivant via metadata preload.
 */
type Tab = "foryou" | "following";

type Props = {
  currentUserId: string;
  initialTab: Tab;
  foryouReels: ReelWithDetails[];
  followingReels: ReelWithDetails[];
  /* Chantier Reels Recsys 18 — true si user n'a pas encore complété
   * le cold start onboarding (cold_start_completed_at IS NULL). */
  needsColdStart?: boolean;
};

export function ReelsFeed({
  currentUserId,
  initialTab,
  foryouReels,
  followingReels,
  needsColdStart = false,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeReelId, setActiveReelId] = useState<string | null>(null);

  /* Chantier Reels Recsys 14 — préchargement intelligent.
   * On accumule les batches reçus dans state local. Le déclenchement
   * se fait quand l'user est à 3 reels de la fin. Anti-doublon via
   * Set d'IDs déjà connus. */
  const [prefetchedForyou, setPrefetchedForyou] = useState<ReelWithDetails[]>(
    [],
  );
  const [isPrefetching, startPrefetch] = useTransition();
  const prefetchInFlightRef = useRef(false);

  const foryouAll = [...foryouReels, ...prefetchedForyou];
  const reels = tab === "foryou" ? foryouAll : followingReels;

  /* Cold start modal — affichée tant que not completed. Une fois soumise,
   * on la masque localement et l'user voit ses reels (le seed des topics
   * sera utilisé par le prochain run profile-updater /5min). */
  const [coldStartOpen, setColdStartOpen] = useState(needsColdStart);

  /* IntersectionObserver pour détecter le reel actif (≥50% visible). */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const items = Array.from(
      container.querySelectorAll<HTMLDivElement>("[data-reel-id]"),
    );
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const id = (entry.target as HTMLElement).dataset.reelId;
            if (id) setActiveReelId(id);
          }
        }
      },
      {
        root: container,
        threshold: [0, 0.5, 1],
      },
    );

    for (const item of items) observer.observe(item);
    return () => observer.disconnect();
  }, [reels.length, tab]);

  /* Init : active le premier reel par défaut. */
  useEffect(() => {
    if (!activeReelId && reels[0]) {
      setActiveReelId(reels[0].id);
    }
  }, [reels, activeReelId]);

  /* Chantier Reels Recsys 14 — précharge le batch suivant quand on est
   * à 3 reels de la fin du tab foryou. Empêche les fetchs concurrents
   * via un ref flag. Seul foryou est préchargé (following = chrono). */
  useEffect(() => {
    if (tab !== "foryou") return;
    if (!activeReelId) return;
    if (prefetchInFlightRef.current) return;

    const idx = foryouAll.findIndex((r) => r.id === activeReelId);
    if (idx === -1) return;
    if (idx < foryouAll.length - 3) return;

    prefetchInFlightRef.current = true;
    const knownIds = foryouAll.map((r) => r.id);
    startPrefetch(async () => {
      try {
        const res = await loadMoreForYouReels(knownIds, 10);
        if (res.ok && res.reels.length > 0) {
          setPrefetchedForyou((prev) => [...prev, ...res.reels]);
        }
      } finally {
        prefetchInFlightRef.current = false;
      }
    });
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [activeReelId, tab, foryouAll.length]);

  /* ESC = retour. */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/feed");
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router]);

  /* Navigation clavier ↑↓ pour desktop. */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const items = Array.from(
        container.querySelectorAll<HTMLDivElement>("[data-reel-id]"),
      );
      const idx = items.findIndex((el) => el.dataset.reelId === activeReelId);
      if (idx === -1) return;
      const nextIdx =
        e.key === "ArrowDown"
          ? Math.min(idx + 1, items.length - 1)
          : Math.max(idx - 1, 0);
      items[nextIdx]?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeReelId]);

  const switchTab = useCallback(
    (next: Tab) => {
      setTab(next);
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      window.history.replaceState({}, "", url.toString());
      /* Reset scroll au changement d'onglet. */
      requestAnimationFrame(() => {
        containerRef.current?.scrollTo({ top: 0, behavior: "auto" });
      });
    },
    [],
  );

  return (
    <div className="relative w-full h-full">
      <ColdStartOnboarding
        open={coldStartOpen}
        onComplete={async (topics) => {
          await completeColdStart(topics);
          setColdStartOpen(false);
        }}
      />
      {/* Top overlay : bouton retour + onglets. */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <Link
          href="/feed"
          aria-label="Retour"
          className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-cream flex items-center justify-center backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden />
        </Link>
        <div
          role="tablist"
          aria-label="Filtre des reels"
          className="flex items-center gap-1 px-1 py-1 rounded-full bg-black/40 backdrop-blur-sm"
        >
          <TabBtn
            active={tab === "foryou"}
            onClick={() => switchTab("foryou")}
          >
            Pour toi
          </TabBtn>
          <TabBtn
            active={tab === "following"}
            onClick={() => switchTab("following")}
          >
            Suivis
          </TabBtn>
        </div>
        <Link
          href="/reels/new"
          aria-label="Créer un reel"
          className="w-10 h-10 rounded-full bg-gold text-night flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
        >
          <Plus className="w-5 h-5" aria-hidden />
        </Link>
      </header>

      {/* Container scroll-snap fullscreen.
          Mobile : pleine largeur. Desktop : container 9:16 centré.  */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {reels.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          reels.map((reel, index) => (
            <div
              key={reel.id}
              data-reel-id={reel.id}
              className="relative w-full h-[100dvh] snap-start snap-always flex items-center justify-center"
            >
              <div className="relative w-full h-full sm:w-auto sm:h-full sm:max-w-[480px] sm:aspect-[9/16] bg-black">
                <ReelView
                  reel={reel}
                  isActive={activeReelId === reel.id}
                  currentUserId={currentUserId}
                  surface={tab === "foryou" ? "reels_foryou" : "reels_following"}
                  position={index}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-full text-[12.5px] font-bold transition-colors",
        active
          ? "bg-cream text-night"
          : "text-cream/70 hover:text-cream",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="w-full h-[100dvh] flex items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <p className="font-display italic text-[28px] text-cream mb-3">
          {tab === "foryou"
            ? "Aucun reel pour l'instant."
            : "Aucun reel de tes contacts."}
        </p>
        <p className="text-[13px] text-cream/70 leading-relaxed">
          {tab === "foryou"
            ? "Reviens plus tard, ou crée le premier reel DIVARC."
            : "Suis des créateurs pour voir leurs reels apparaître ici."}
        </p>
      </div>
    </div>
  );
}
