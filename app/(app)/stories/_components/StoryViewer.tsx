"use client";

import { ChevronLeft, ChevronRight, Eye, Heart, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/relativeTime";
import type { StoryGroup, StoryWithAuthor } from "@/lib/database.types";
import { getFilterCss } from "@/lib/stories/filters";
import { deleteStory, recordStoryView } from "../actions";

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
  const startTimeRef = useRef<number>(Date.now());

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];

  useEffect(() => {
    if (!currentStory) return;
    if (currentStory.author_id !== currentUserId) {
      void recordStoryView(currentStory.id);
    }
  }, [currentStory, currentUserId]);

  useEffect(() => {
    if (!currentStory || paused) return;

    startTimeRef.current = Date.now();
    setProgress(0);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const ratio = Math.min(elapsed / STORY_DURATION_MS, 1);
      setProgress(ratio);
      if (ratio >= 1) {
        clearInterval(interval);
        next();
      }
    }, 50);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex, paused]);

  function close() {
    router.back();
  }

  function next() {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      close();
    }
  }

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

  function handleDelete() {
    if (!currentStory) return;
    if (!confirm("Supprimer cette story ?")) return;
    startTransition(async () => {
      const result = await deleteStory(currentStory.id);
      if (result.ok) {
        toast.success("Story supprimée.");
        close();
      }
    });
  }

  if (!currentStory || !currentGroup) {
    return null;
  }

  const isOwn = currentStory.author_id === currentUserId;
  const author = currentStory.author;
  const displayName =
    author?.full_name ?? author?.username ?? "Utilisateur";

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

        {currentStory.type === "photo" && currentStory.caption ? (
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
          <footer className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white/12 backdrop-blur-md text-cream text-xs font-semibold">
              <Eye className="w-3.5 h-3.5 text-gold" aria-hidden />
              {currentStory.views_count} vue
              {currentStory.views_count > 1 ? "s" : ""}
            </span>
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
            className="absolute bottom-4 left-4 right-4 z-10 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Réponds à ${displayName.split(" ")[0] ?? displayName}…`}
              onClick={(e) => {
                e.stopPropagation();
                setPaused(true);
              }}
              onBlur={() => setPaused(false)}
              className="flex-1 h-11 px-4 rounded-full bg-white/12 backdrop-blur-md text-cream placeholder:text-cream/55 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 border border-cream/15"
            />
            <button
              type="button"
              aria-label="J'aime"
              className="w-11 h-11 rounded-full bg-white/12 backdrop-blur-md text-cream hover:text-gold flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Heart className="w-5 h-5" aria-hidden />
            </button>
          </footer>
        )}

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
