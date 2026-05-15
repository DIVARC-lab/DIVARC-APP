"use client";

import { ChevronLeft, ChevronRight, Eye, Heart, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { StoryAdSlot } from "@/components/ads/StoryAdSlot";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/relativeTime";
import type { StoryGroup } from "@/lib/database.types";
import { getFilterCss } from "@/lib/stories/filters";
import {
  addStoryReply,
  deleteStory,
  listStoryViewersDetails,
  recordStoryView,
  toggleStoryLike,
  type StoryViewerEntry,
} from "../actions";

const STORY_DURATION_MS = 6_000;

type StoryViewerProps = {
  groups: StoryGroup[];
  currentUserId: string;
  initialStoryId: string;
};

export function StoryViewer({
  groups,
  currentUserId,
  initialStoryId,
}: StoryViewerProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  const initialPos = (() => {
    for (let g = 0; g < groups.length; g++) {
      const idx = groups[g]!.stories.findIndex((s) => s.id === initialStoryId);
      if (idx >= 0) return { groupIndex: g, storyIndex: idx };
    }
    return { groupIndex: 0, storyIndex: 0 };
  })();

  const [groupIndex, setGroupIndex] = useState(initialPos.groupIndex);
  const [storyIndex, setStoryIndex] = useState(initialPos.storyIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  /* Chantier Stories v2 — state local pour like + reply + viewers modal. */
  const [liked, setLiked] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewersList, setViewersList] = useState<StoryViewerEntry[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  /* Compteur de stories vues — ad servie tous les 8 (densité brief 6-10/ad). */
  const storiesViewedRef = useRef(0);
  const [showAd, setShowAd] = useState(false);
  const [adSlotIndex, setAdSlotIndex] = useState(0);
  /* `elapsedBeforePauseRef` accumule le temps écoulé avant chaque pause.
     Au resume, on restart l'intervalle depuis Date.now() sans toucher cet
     accumulateur — l'elapsed visuel = (now - startTime) + accumulé. Évite
     le saut en arrière (reset 0) et le saut en avant (gap clavier). */
  const startTimeRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  useEffect(() => {
    if (!currentStory) return;
    if (currentStory.author_id !== currentUserId) {
      void recordStoryView(currentStory.id);
    }
  }, [currentStory, currentUserId]);

  /* Reset complet à chaque changement de story (groupIndex/storyIndex). */
  useEffect(() => {
    startTimeRef.current = Date.now();
    elapsedBeforePauseRef.current = 0;
    queueMicrotask(() => setProgress(0));
  }, [groupIndex, storyIndex]);

  /* Tick interval : actif tant que !paused. */
  useEffect(() => {
    if (!currentStory || paused) return;

    /* Resume : startTime = now, on garde elapsedBeforePauseRef cumulé. */
    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      const elapsed =
        Date.now() - startTimeRef.current + elapsedBeforePauseRef.current;
      const ratio = Math.min(elapsed / STORY_DURATION_MS, 1);
      setProgress(ratio);
      if (ratio >= 1) {
        clearInterval(interval);
        next();
      }
    }, 50);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, groupIndex, storyIndex]);

  /* Effect dédié au passage paused=true : accumule l'elapsed pour reprendre
     proprement au resume. Au passage à false, ne fait rien (le tick effect
     repart de Date.now() en gardant elapsedBeforePauseRef). */
  useEffect(() => {
    if (!paused) return;
    elapsedBeforePauseRef.current += Date.now() - startTimeRef.current;
  }, [paused]);

  function close() {
    router.back();
  }

  function next() {
    if (!currentGroup) return;
    /* Incrément du compteur global. Tous les 8 stories vues, on insère
       une ad à la place du next() effectif. */
    storiesViewedRef.current += 1;
    if (
      storiesViewedRef.current > 0 &&
      storiesViewedRef.current % 8 === 0 &&
      !showAd
    ) {
      setAdSlotIndex((i) => i + 1);
      setShowAd(true);
      return;
    }
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      close();
    }
  }

  const handleAdComplete = useCallback(() => {
    setShowAd(false);
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroup, storyIndex, groupIndex, groups]);

  function prev() {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      const prevGroup = groups[groupIndex - 1]!;
      setStoryIndex(prevGroup.stories.length - 1);
    }
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") prev();
      if (event.key === " ") setPaused((v) => !v);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex]);

  async function handleDelete() {
    if (!currentStory) return;
    const ok = await confirm({
      title: "Supprimer cette story ?",
      description: "Elle disparaîtra immédiatement et tes vues seront perdues.",
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteStory(currentStory.id);
      if (result.ok) {
        toast.success("Story supprimée.");
        close();
      }
    });
  }

  /* Reset like + reply state quand on change de story. */
  useEffect(() => {
    setLiked(false);
    setReplyText("");
    setViewersOpen(false);
  }, [currentStory?.id]);

  function handleToggleLike() {
    if (!currentStory) return;
    const next = !liked;
    setLiked(next);
    startTransition(async () => {
      const res = await toggleStoryLike(currentStory.id);
      if (!res.ok) {
        setLiked(!next);
        toast.error(res.error);
      }
    });
  }

  function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!currentStory) return;
    const trimmed = replyText.trim();
    if (trimmed.length === 0) return;
    const sent = trimmed;
    setReplyText("");
    startTransition(async () => {
      const res = await addStoryReply(currentStory.id, sent);
      if (res.ok) {
        toast.success("Réponse envoyée.");
      } else {
        setReplyText(sent);
        toast.error(res.error);
      }
    });
  }

  function handleOpenViewers() {
    if (!currentStory) return;
    setPaused(true);
    setViewersOpen(true);
    setViewersLoading(true);
    listStoryViewersDetails(currentStory.id).then((res) => {
      setViewersLoading(false);
      if (res.ok) setViewersList(res.viewers);
      else toast.error(res.error);
    });
  }

  if (!currentStory || !currentGroup) {
    return null;
  }

  const isOwn = currentStory.author_id === currentUserId;
  const author = currentStory.author;
  const displayName =
    author?.full_name ?? author?.username ?? "Utilisateur";

  /* Si on doit afficher une ad → rendre StoryAdSlot fullscreen au lieu
     de la story actuelle. L'ad expire automatiquement après 6s ou
     l'utilisateur tape pour passer. */
  if (showAd) {
    return (
      <StoryAdSlot
        surface="stories"
        slotIndex={adSlotIndex}
        onComplete={handleAdComplete}
        onClose={close}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-night flex items-center justify-center">
      <div
        className="relative w-full h-full max-w-md mx-auto flex flex-col"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
          {currentGroup.stories.map((story, idx) => (
            <ProgressBar
              key={story.id}
              progress={
                idx < storyIndex ? 1 : idx === storyIndex ? progress : 0
              }
            />
          ))}
        </div>

        {/* Header */}
        <header className="absolute top-7 left-3 right-3 z-20 flex items-center gap-3 pt-3">
          <span className="block rounded-full p-[2px] bg-[conic-gradient(from_200deg,_#F4B942,_#F8CD76,_#B88A2A,_#F4B942)] shadow-[0_4px_14px_-4px_rgba(244,185,66,0.45)]">
            <Avatar
              src={author?.avatar_url ?? null}
              fullName={displayName}
              size="md"
              className="ring-2 ring-night"
            />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-cream truncate">
              {displayName}
            </p>
            <p className="text-[10px] uppercase tracking-[0.16em] font-extrabold text-gold/80">
              · {formatRelative(currentStory.created_at)}
            </p>
          </div>
          {isOwn ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              aria-label="Supprimer"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-cream"
            >
              <Trash2 className="w-4 h-4" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-cream"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        {/* Content */}
        <button
          type="button"
          onClick={prev}
          aria-label="Précédent"
          className="absolute left-0 top-0 bottom-0 z-10 w-1/3 cursor-pointer"
        />
        <button
          type="button"
          onClick={next}
          aria-label="Suivant"
          className="absolute right-0 top-0 bottom-0 z-10 w-2/3 cursor-pointer"
        />

        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          {currentStory.type === "photo" && currentStory.photo_url ? (
            <>
              <Image
                key={currentStory.id}
                src={currentStory.photo_url}
                alt={currentStory.caption ?? ""}
                fill
                priority
                sizes="(max-width: 480px) 100vw, 480px"
                className="object-contain"
                style={{ filter: getFilterCss(currentStory.filter) || undefined }}
                unoptimized={currentStory.photo_url.includes("?")}
              />
              {/* Overlays auteur : stickers emoji positionnés en fraction du
                  conteneur (les fractions ont été enregistrées relatives au
                  preview composer, on les replay ici). */}
              {currentStory.stickers && currentStory.stickers.length > 0 ? (
                <div className="absolute inset-0 pointer-events-none">
                  {currentStory.stickers.map((sticker, index) => (
                    <span
                      key={index}
                      aria-hidden
                      className="absolute"
                      style={{
                        left: `${sticker.x * 100}%`,
                        top: `${sticker.y * 100}%`,
                        transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
                        fontSize: "48px",
                        filter: "drop-shadow(0 4px 12px rgba(10,31,68,0.4))",
                      }}
                    >
                      {sticker.emoji}
                    </span>
                  ))}
                </div>
              ) : null}
              {/* Caption overlayé sur la photo si position définie. Sinon
                  fallback en bas (rendu plus bas, hors de ce conteneur). */}
              {currentStory.caption && currentStory.caption_position ? (
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 px-4 pointer-events-none"
                  style={{
                    left: `${currentStory.caption_position.x * 100}%`,
                    top: `${currentStory.caption_position.y * 100}%`,
                  }}
                >
                  <p
                    className="font-display italic text-cream text-2xl sm:text-3xl leading-tight text-center max-w-[280px] break-words"
                    style={{
                      textShadow:
                        "0 2px 16px rgba(10,31,68,0.85), 0 0 4px rgba(10,31,68,0.6)",
                    }}
                  >
                    {currentStory.caption}
                  </p>
                </div>
              ) : null}
            </>
          ) : currentStory.type === "video" && currentStory.video_url ? (
            <video
              key={currentStory.id}
              src={currentStory.video_url}
              poster={currentStory.video_thumbnail_url ?? undefined}
              autoPlay
              playsInline
              loop
              muted={false}
              controls={false}
              className="max-w-full max-h-full object-contain"
              style={{ filter: getFilterCss(currentStory.filter) || undefined }}
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex items-center justify-center px-8 bg-gradient-to-br",
                currentStory.background ?? "from-night via-night-soft to-night-muted",
              )}
            >
              <p
                className="font-display italic text-[44px] sm:text-[52px] text-cream text-center text-balance leading-[1.05] tracking-[-0.02em]"
                style={{ textShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
              >
                {currentStory.caption}
              </p>
            </div>
          )}
        </div>

        {/* Caption en bas standard : seulement si l'auteur n'a PAS choisi
            le mode "caption sur photo" (caption_position null). */}
        {currentStory.type === "photo" &&
        currentStory.caption &&
        !currentStory.caption_position ? (
          <div className="absolute bottom-20 left-6 right-6 z-10 text-center pointer-events-none">
            <p
              className="font-display italic text-cream text-2xl sm:text-3xl leading-tight tracking-[-0.015em]"
              style={{ textShadow: "0 2px 16px rgba(0,0,0,0.55)" }}
            >
              {currentStory.caption}
            </p>
          </div>
        ) : null}

        {isOwn ? (
          <footer
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between gap-2"
          >
            {/* Compteur vues clicable → ouvre modale viewers liste. */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenViewers();
              }}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white/12 backdrop-blur-md text-cream text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-gold" aria-hidden />
              {currentStory.views_count} vue
              {currentStory.views_count > 1 ? "s" : ""}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push("/stories/archive");
              }}
              className="px-3 h-9 rounded-full bg-gold text-night text-xs font-extrabold tracking-wide hover:bg-gold-soft transition-colors"
            >
              Archive
            </button>
          </footer>
        ) : (
          <footer
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-4 right-4 z-10"
          >
            <form
              onSubmit={handleSendReply}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.currentTarget.value)}
                placeholder={`Réponds à ${displayName.split(" ")[0] ?? displayName}…`}
                onClick={(e) => {
                  e.stopPropagation();
                  setPaused(true);
                }}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                maxLength={500}
                className="flex-1 h-11 px-4 rounded-full bg-white/12 backdrop-blur-md text-cream placeholder:text-cream/55 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 border border-cream/15"
              />
              {replyText.trim().length > 0 ? (
                <button
                  type="submit"
                  disabled={pending}
                  aria-label="Envoyer la réponse"
                  className="px-4 h-11 rounded-full bg-gold text-night text-xs font-extrabold tracking-wide hover:bg-gold-soft transition-colors disabled:opacity-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  Envoyer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleLike();
                  }}
                  aria-label={liked ? "Retirer le like" : "J'aime"}
                  className={cn(
                    "w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition-all",
                    liked
                      ? "bg-rose-500 text-cream scale-110"
                      : "bg-white/12 text-cream hover:text-gold",
                  )}
                >
                  <Heart
                    className={cn("w-5 h-5", liked && "fill-current")}
                    aria-hidden
                  />
                </button>
              )}
            </form>
          </footer>
        )}

        {/* Modale viewers list (auteur uniquement, ouverte via compteur vues). */}
        {viewersOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Liste des viewers"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                e.stopPropagation();
                setViewersOpen(false);
                setPaused(false);
              }
            }}
            className="absolute inset-0 z-30 bg-night/70 backdrop-blur-md flex items-end sm:items-center justify-center"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md max-h-[70vh] bg-bg rounded-t-3xl sm:rounded-3xl border border-line overflow-hidden flex flex-col"
            >
              <header className="px-5 pt-5 pb-3 border-b border-line flex items-center gap-2">
                <Eye className="w-4 h-4 text-gold-deep" aria-hidden />
                <h2 className="text-sm font-bold text-night flex-1">
                  Vues par {viewersList.length} personne
                  {viewersList.length > 1 ? "s" : ""}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setViewersOpen(false);
                    setPaused(false);
                  }}
                  aria-label="Fermer"
                  className="w-8 h-8 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto p-3">
                {viewersLoading ? (
                  <p className="text-center py-8 text-xs text-muted">
                    Chargement…
                  </p>
                ) : viewersList.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted italic">
                    Personne n&apos;a encore vu cette story.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {viewersList.map((viewer) => (
                      <li
                        key={viewer.user_id}
                        className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-night/5"
                      >
                        <Avatar
                          src={viewer.avatar_url}
                          fullName={
                            viewer.full_name ?? viewer.username ?? "Utilisateur"
                          }
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-night truncate">
                            {viewer.full_name ?? viewer.username ?? "Utilisateur"}
                          </p>
                          <p className="text-[11px] text-night-muted">
                            {formatRelative(viewer.viewed_at)}
                          </p>
                        </div>
                        {viewer.liked ? (
                          <Heart
                            className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0"
                            aria-label="A aimé"
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Nav indicator hidden but uses these icons for visual */}
        <ChevronLeft className="hidden" />
        <ChevronRight className="hidden" />
      </div>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <span className="flex-1 h-[2.5px] rounded-full bg-cream/25 overflow-hidden">
      <span
        className="block h-full bg-gold"
        style={{ width: `${progress * 100}%` }}
      />
    </span>
  );
}
