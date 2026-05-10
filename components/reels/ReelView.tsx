"use client";

import {
  Bookmark,
  Heart,
  MessageCircle,
  Music,
  Pause,
  Play,
  Send,
  UserPlus,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ReelCommentsSheet } from "@/components/reels/ReelCommentsSheet";
import { useHlsVideo } from "@/components/video/useHlsVideo";
import { cn } from "@/lib/utils/cn";
import { linkifyMentions } from "@/lib/utils/linkifyMentions";
import type { ReelWithDetails } from "@/lib/database.types";

/* ReelView — un reel individuel dans le feed Reels.
 *
 * Comportements :
 *   - Autoplay quand isActive=true (loop infini)
 *   - Tap = pause/play
 *   - Double-tap = like avec animation cœur
 *   - Bouton mute/unmute (premier reel : muted par défaut, après la
 *     première interaction user, on dé-mute pour les suivants)
 *   - Boutons droite : like / comments / share / save / sound
 *   - Bottom : auteur + bouton suivre + description tronquée +
 *     son (si présent) cliquable
 *
 * Track les vues : insère/upsert dans reel_views au mount avec
 * watch_ms cumulé.
 */
type Props = {
  reel: ReelWithDetails;
  isActive: boolean;
  currentUserId: string;
};

export function ReelView({ reel, isActive, currentUserId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(reel.is_liked);
  const [saved, setSaved] = useState(reel.is_saved);
  const [likeCount, setLikeCount] = useState(reel.likes_count);
  const [showHeart, setShowHeart] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const watchStartRef = useRef<number | null>(null);
  const totalWatchMsRef = useRef(0);
  const reachedEndRef = useRef(false);
  const replayCountRef = useRef(0);
  const lastTapRef = useRef(0);

  const isVoidId = !reel.id;

  /* Hook HLS adaptatif (fallback MP4). */
  useHlsVideo(
    videoRef,
    reel.video_url.endsWith(".m3u8") ? reel.video_url : null,
    reel.video_mp4_fallback ?? reel.video_url,
  );

  /* Play/pause selon isActive. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.muted = muted;
      void video.play().catch(() => undefined);
      setPaused(false);
      watchStartRef.current = performance.now();
    } else {
      video.pause();
      flushWatchTime();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  /* Sync mute. */
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  /* Watch time tracking. */
  function flushWatchTime() {
    if (watchStartRef.current !== null) {
      totalWatchMsRef.current += performance.now() - watchStartRef.current;
      watchStartRef.current = null;
    }
  }

  /* Au unmount ou changement isActive false, on flush l'event reel_views. */
  useEffect(() => {
    return () => {
      flushWatchTime();
      const watchMs = Math.round(totalWatchMsRef.current);
      const video = videoRef.current;
      const dur = video?.duration ?? reel.duration_seconds ?? 1;
      const completedPct = Math.min(
        100,
        (watchMs / 1000 / Math.max(1, dur)) * 100,
      );
      const skipped = watchMs < 3000 && !reachedEndRef.current;
      if (watchMs >= 200 && !isVoidId) {
        /* Fire & forget — pas de await pour ne pas bloquer le navigation. */
        void fetch("/api/reels/views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reel_id: reel.id,
            watch_ms: watchMs,
            completed_pct: Math.round(completedPct),
            replay_count: replayCountRef.current,
            skipped,
            did_like: liked && !reel.is_liked,
            did_save: saved && !reel.is_saved,
          }),
          keepalive: true,
        }).catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel.id]);

  /* Listen events vidéo : end + replay detection. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    function onEnded() {
      reachedEndRef.current = true;
      replayCountRef.current += 1;
    }
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
      setPaused(false);
      watchStartRef.current = performance.now();
    } else {
      video.pause();
      setPaused(true);
      flushWatchTime();
    }
  };

  /* Tap simple : pause/play. Double tap : like. */
  const handleTap = useCallback(() => {
    const now = performance.now();
    if (now - lastTapRef.current < 300) {
      /* Double tap. */
      lastTapRef.current = 0;
      if (!liked) {
        toggleLike();
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 600);
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        /* Si pas de second tap dans les 280ms, c'est un single tap. */
        if (lastTapRef.current !== 0 && now - lastTapRef.current === 0) {
          togglePlayPause();
        }
      }, 280);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liked]);

  const toggleLike = useCallback(async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));
    try {
      const res = await fetch(`/api/reels/${reel.id}/like`, {
        method: newLiked ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
    } catch {
      /* Rollback en cas d'erreur. */
      setLiked(!newLiked);
      setLikeCount((c) => c + (newLiked ? -1 : 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liked, reel.id]);

  const toggleSave = useCallback(async () => {
    const newSaved = !saved;
    setSaved(newSaved);
    try {
      const res = await fetch(`/api/reels/${reel.id}/save`, {
        method: newSaved ? "POST" : "DELETE",
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
    } catch {
      setSaved(!newSaved);
    }
  }, [saved, reel.id]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/reels/${reel.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reel de ${reel.author?.full_name ?? "DIVARC"}`,
          text: reel.description ?? undefined,
          url,
        });
      } catch {
        /* user a cancel — silent */
      }
    } else {
      await navigator.clipboard.writeText(url).catch(() => undefined);
    }
  }, [reel]);

  const author = reel.author;
  const sound = reel.sound;
  const isOwn = currentUserId === reel.author_id;

  return (
    <div className="relative w-full h-full bg-black">
      {/* Vidéo. */}
      <video
        ref={videoRef}
        poster={reel.poster_url ?? undefined}
        playsInline
        loop
        autoPlay={isActive}
        muted={muted}
        onClick={handleTap}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Overlay gradient bottom pour lisibilité texte. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent"
        aria-hidden
      />

      {/* Cœur double-tap animation. */}
      {showHeart ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <Heart
            className="w-32 h-32 text-rose-500 fill-rose-500 animate-ping-once drop-shadow-2xl"
            strokeWidth={2}
          />
        </div>
      ) : null}

      {/* Pause overlay. */}
      {paused ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <span className="w-20 h-20 rounded-full bg-black/40 text-cream flex items-center justify-center backdrop-blur-sm">
            <Play className="w-9 h-9 ml-1" aria-hidden />
          </span>
        </div>
      ) : null}

      {/* Mute toggle — top right. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMuted((m) => !m);
        }}
        aria-label={muted ? "Activer le son" : "Couper le son"}
        className="absolute top-16 right-3 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-cream flex items-center justify-center backdrop-blur-sm"
      >
        {muted ? (
          <VolumeX className="w-4 h-4" aria-hidden />
        ) : (
          <Volume2 className="w-4 h-4" aria-hidden />
        )}
      </button>

      {/* Boutons d'action droite. */}
      <div className="absolute right-2 bottom-32 sm:bottom-24 z-10 flex flex-col items-center gap-4">
        {author ? (
          <Link
            href={`/u/${author.username ?? author.id}`}
            aria-label="Profil de l'auteur"
            className="relative"
          >
            <Avatar
              src={author.avatar_url}
              fullName={author.full_name}
              size="md-bold"
            />
            {!isOwn ? (
              <span
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-rose-500 text-cream text-[10px] font-bold flex items-center justify-center border-2 border-black"
                aria-hidden
              >
                <UserPlus className="w-3 h-3" aria-hidden />
              </span>
            ) : null}
          </Link>
        ) : null}

        <ActionBtn
          label={liked ? "Retirer le j'aime" : "J'aime"}
          onClick={toggleLike}
          count={likeCount}
        >
          <Heart
            className={cn(
              "w-7 h-7 transition-colors",
              liked ? "text-rose-500 fill-rose-500" : "text-cream",
            )}
            strokeWidth={2}
          />
        </ActionBtn>

        <ActionBtn
          label="Commenter"
          count={reel.comments_count}
          onClick={() => setCommentsOpen(true)}
        >
          <MessageCircle className="w-7 h-7 text-cream" aria-hidden />
        </ActionBtn>

        <ActionBtn
          label="Partager"
          count={reel.shares_count}
          onClick={handleShare}
        >
          <Send className="w-7 h-7 text-cream" aria-hidden />
        </ActionBtn>

        <ActionBtn
          label={saved ? "Retirer des favoris" : "Sauvegarder"}
          onClick={toggleSave}
        >
          <Bookmark
            className={cn(
              "w-7 h-7 transition-colors",
              saved ? "text-gold fill-gold" : "text-cream",
            )}
            strokeWidth={2}
          />
        </ActionBtn>

        {/* Disque musique animé. */}
        {sound ? (
          <Link
            href={`/sounds/${sound.id}`}
            aria-label={`Son : ${sound.title}`}
            className="w-9 h-9 rounded-full bg-black border-2 border-cream flex items-center justify-center animate-spin-slow"
          >
            <Music className="w-4 h-4 text-cream" aria-hidden />
          </Link>
        ) : null}
      </div>

      {/* Bottom : auteur + description + son. */}
      <div className="absolute bottom-3 left-3 right-16 z-10 text-cream">
        {author ? (
          <p className="text-[14px] font-bold">
            <Link
              href={`/u/${author.username ?? author.id}`}
              className="hover:underline"
            >
              @{author.username ?? "user"}
            </Link>
            {!isOwn ? (
              <button
                type="button"
                className="ml-2 px-2 py-0.5 rounded-md border border-cream/60 text-[11px] font-bold hover:bg-cream/10"
              >
                Suivre
              </button>
            ) : null}
          </p>
        ) : null}

        {reel.description ? (
          <p
            className={cn(
              "text-[12.5px] mt-1 leading-snug whitespace-pre-wrap break-words",
              !descExpanded && "line-clamp-2",
            )}
          >
            {linkifyMentions(reel.description)}
            {!descExpanded && reel.description.length > 80 ? (
              <button
                type="button"
                onClick={() => setDescExpanded(true)}
                className="ml-1 text-cream/70 underline"
              >
                voir plus
              </button>
            ) : null}
          </p>
        ) : null}

        {reel.hashtags.length > 0 ? (
          <p className="mt-1 flex flex-wrap gap-1 text-[11.5px] text-cream/80">
            {reel.hashtags.slice(0, 6).map((tag) => (
              <Link
                key={tag}
                href={`/feed/tag/${tag}`}
                className="hover:text-gold"
              >
                #{tag}
              </Link>
            ))}
          </p>
        ) : null}

        {sound ? (
          <Link
            href={`/sounds/${sound.id}`}
            className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-cream/90 max-w-full"
          >
            <Music className="w-3 h-3" aria-hidden />
            <span className="truncate">
              {sound.title} · {sound.artist}
            </span>
          </Link>
        ) : null}
      </div>

      {/* Bottom-sheet commentaires (V1.5). */}
      {commentsOpen ? (
        <ReelCommentsSheet
          reelId={reel.id}
          currentUserId={currentUserId}
          initialCount={reel.comments_count}
          allowComments={reel.allow_comments}
          onClose={() => setCommentsOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  count,
  children,
}: {
  label: string;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className="flex flex-col items-center gap-0.5"
    >
      {children}
      {count !== undefined && count > 0 ? (
        <span className="text-[10.5px] font-bold text-cream tabular-nums">
          {formatCompact(count)}
        </span>
      ) : null}
    </button>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
