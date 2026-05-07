"use client";

import { ChevronLeft, ChevronRight, Eye, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/relativeTime";
import type { StoryGroup, StoryWithAuthor } from "@/lib/database.types";
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
          <Avatar
            src={author?.avatar_url ?? null}
            fullName={displayName}
            size="md"
            className="ring-2 ring-cream/30"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-cream truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-cream/60">
              {formatRelative(currentStory.created_at)}
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
              unoptimized={currentStory.photo_url.includes("?")}
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex items-center justify-center px-8",
                currentStory.background ?? "bg-gradient-to-br from-night via-night-soft to-night-muted",
              )}
            >
              <p className="font-display text-3xl sm:text-4xl text-cream text-center text-balance leading-tight">
                {currentStory.caption}
              </p>
            </div>
          )}
        </div>

        {currentStory.type === "photo" && currentStory.caption ? (
          <div className="absolute bottom-16 left-3 right-3 z-10 px-4 py-2 rounded-2xl bg-night/60 backdrop-blur-sm">
            <p className="text-cream text-sm leading-relaxed text-center">
              {currentStory.caption}
            </p>
          </div>
        ) : null}

        {isOwn ? (
          <footer className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-sm text-cream text-xs">
            <Eye className="w-3.5 h-3.5" aria-hidden />
            {currentStory.views_count} vue
            {currentStory.views_count > 1 ? "s" : ""}
          </footer>
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
    <span className="flex-1 h-0.5 rounded-full bg-cream/20 overflow-hidden">
      <span
        className="block h-full bg-cream"
        style={{ width: `${progress * 100}%` }}
      />
    </span>
  );
}
