"use client";

/* Étapes 10-13/60 — Comments stream défilant TikTok-style.
 *
 * - Container bottom-left fixed max-h 40vh
 * - Max 6-8 messages visibles, le plus ancien fade out + slide up
 * - Pinned reste en tête (toujours visible)
 * - Animation entrée slide-from-bottom via Framer Motion
 * - Auto-fade 15s
 *
 * Rendu différent selon comment_type :
 *   normal, gift, follow, share, join, milestone, pinned, system,
 *   like_burst, super_fan
 *
 * Long-press révèle menu actions (V2).
 *
 * Supabase Realtime sur live_chat_messages filter session_id=eq.X. */

import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  Gift as GiftIcon,
  Heart,
  Pin,
  Repeat2,
  Share2,
  Sparkles,
  Trophy,
  UserPlus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";

type CommentType =
  | "normal"
  | "gift"
  | "follow"
  | "share"
  | "join"
  | "repost"
  | "super_fan"
  | "milestone"
  | "system"
  | "pinned"
  | "like_burst";

type Comment = {
  id: string;
  user_id: string;
  username: string | null;
  full_name?: string | null;
  avatar_url: string | null;
  content: string;
  comment_type: CommentType;
  is_pinned: boolean;
  gift_id: string | null;
  gift_quantity: number;
  gift_emoji: string | null;
  gift_color: string | null;
  likes_count: number;
  user_level: number;
  is_subscriber: boolean;
  is_moderator: boolean;
  created_at: string;
};

type Props = {
  sessionId: string;
  hostId: string;
  currentUserId: string;
};

const MAX_VISIBLE = 8;
const FADE_AFTER_MS = 15_000;

export function CommentsStream({ sessionId, hostId, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [pinned, setPinned] = useState<Comment | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  /* Initial load + Realtime subscribe. */
  useEffect(() => {
    let alive = true;

    async function loadInitial() {
      try {
        const supabase = createClient();
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const { data } = await (supabase as any)
          .from("live_chat_messages")
          .select(
            "id, user_id, username, avatar_url, content, comment_type, is_pinned, gift_id, gift_quantity, gift_emoji, gift_color, likes_count, user_level, is_subscriber, is_moderator, created_at",
          )
          .eq("session_id", sessionId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(MAX_VISIBLE);
        if (!alive) return;
        const list = ((data ?? []) as Comment[]).reverse();
        setComments(list.filter((c) => !c.is_pinned));
        const pin = list.find((c) => c.is_pinned);
        if (pin) setPinned(pin);
      } catch {
        /* silencieux */
      }
    }

    void loadInitial();

    const supabase = createClient();
    const channel = supabase
      .channel(`live-comments-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (!alive) return;
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const row = payload.new as any;
          if (row.deleted_at) return;
          const c: Comment = {
            id: row.id,
            user_id: row.user_id,
            username: row.username,
            full_name: row.full_name,
            avatar_url: row.avatar_url,
            content: row.content,
            comment_type: row.comment_type ?? "normal",
            is_pinned: row.is_pinned ?? false,
            gift_id: row.gift_id,
            gift_quantity: row.gift_quantity ?? 0,
            gift_emoji: row.gift_emoji,
            gift_color: row.gift_color,
            likes_count: row.likes_count ?? 0,
            user_level: row.user_level ?? 0,
            is_subscriber: row.is_subscriber ?? false,
            is_moderator: row.is_moderator ?? false,
            created_at: row.created_at,
          };
          if (c.is_pinned) {
            setPinned(c);
          } else {
            setComments((prev) => {
              const next = [...prev, c];
              if (next.length > MAX_VISIBLE) {
                return next.slice(-MAX_VISIBLE);
              }
              return next;
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (!alive) return;
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const row = payload.new as any;
          if (row.deleted_at) {
            setComments((prev) => prev.filter((m) => m.id !== row.id));
            if (pinned?.id === row.id) setPinned(null);
          } else if (row.is_pinned) {
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            setPinned(row as any);
          }
        },
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  /* Auto-fade comments anciens (> 15s). */
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setComments((prev) =>
        prev.filter(
          (c) => now - new Date(c.created_at).getTime() < FADE_AFTER_MS,
        ),
      );
    }, 1500);
    return () => window.clearInterval(id);
  }, []);

  /* Auto-scroll vers le bas. */
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [comments.length]);

  return (
    <div
      ref={listRef}
      aria-label="Commentaires du live"
      className="flex flex-col gap-1 max-h-[40vh] overflow-y-auto scrollbar-hide pointer-events-auto pr-1"
    >
      {pinned ? <PinnedItem comment={pinned} /> : null}

      <AnimatePresence initial={false}>
        {comments.map((c) => (
          <motion.div
            key={c.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <CommentItem
              comment={c}
              isHost={c.user_id === hostId}
              isMine={c.user_id === currentUserId}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
 * Rendu selon type
 * ============================================================ */
function CommentItem({
  comment,
  isHost,
  isMine,
}: {
  comment: Comment;
  isHost: boolean;
  isMine: boolean;
}) {
  switch (comment.comment_type) {
    case "gift":
      return <GiftComment comment={comment} />;
    case "follow":
      return <FollowComment comment={comment} />;
    case "share":
    case "repost":
      return <ShareComment comment={comment} />;
    case "join":
      return <JoinComment comment={comment} />;
    case "milestone":
      return <MilestoneComment comment={comment} />;
    case "system":
      return <SystemComment comment={comment} />;
    case "like_burst":
      return <LikeBurstComment comment={comment} />;
    case "super_fan":
      return <SuperFanComment comment={comment} />;
    default:
      return (
        <NormalComment comment={comment} isHost={isHost} isMine={isMine} />
      );
  }
}

function userName(c: Comment): string {
  return c.username ?? c.full_name ?? "Spectateur";
}

/* Normal */
function NormalComment({
  comment,
  isHost,
}: {
  comment: Comment;
  isHost: boolean;
  isMine: boolean;
}) {
  const name = userName(comment);
  return (
    <div className="flex items-start gap-1.5 bg-black/45 backdrop-blur-md rounded-2xl px-2.5 py-1.5 max-w-full">
      <Avatar src={comment.avatar_url} fullName={name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 flex-wrap">
          {isHost ? <Badge tone="gold">Host</Badge> : null}
          {comment.is_moderator ? <Badge tone="blue">Mod</Badge> : null}
          {comment.is_subscriber ? <Badge tone="rose">Fan</Badge> : null}
          {comment.user_level >= 10 ? (
            <Badge tone="gold">Lv{comment.user_level}</Badge>
          ) : null}
          <span className="text-[11px] font-bold text-gold-soft truncate">
            {name}
          </span>
        </div>
        <p className="text-[12.5px] text-white leading-snug break-words mt-0.5">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

/* Gift — gradient gold + shimmer */
function GiftComment({ comment }: { comment: Comment }) {
  const name = userName(comment);
  return (
    <div
      className="flex items-center gap-2 rounded-2xl px-3 py-1.5 border border-white/20 shadow-lg"
      style={{
        background: comment.gift_color
          ? `linear-gradient(135deg, ${comment.gift_color}, ${comment.gift_color}cc)`
          : "linear-gradient(135deg, #f4b942, #b88a2a)",
      }}
    >
      <Avatar src={comment.avatar_url} fullName={name} size="sm" />
      <p className="text-[12px] font-bold text-night flex-1 min-w-0">
        <span className="truncate">{name}</span>
        <span className="text-night-soft"> a envoyé </span>
        <span className="font-extrabold">
          {comment.gift_emoji ?? "🎁"}
        </span>
        {comment.gift_quantity > 1 ? (
          <span className="font-extrabold"> ×{comment.gift_quantity}</span>
        ) : null}
      </p>
    </div>
  );
}

/* Follow — gradient rose */
function FollowComment({ comment }: { comment: Comment }) {
  const name = userName(comment);
  return (
    <div className="flex items-center gap-2 rounded-2xl px-3 py-1.5 bg-gradient-to-br from-pink-300/90 to-rose-400/90 border border-white/20">
      <Avatar src={comment.avatar_url} fullName={name} size="sm" />
      <p className="text-[12px] font-bold text-night flex items-center gap-1.5 flex-1 min-w-0">
        <span className="truncate">{name}</span>
        <Heart className="w-3 h-3 fill-current text-rose-700 shrink-0" aria-hidden />
        <span className="text-night-soft truncate">a suivi</span>
      </p>
    </div>
  );
}

/* Share / Repost — bleu pâle */
function ShareComment({ comment }: { comment: Comment }) {
  const name = userName(comment);
  const Icon = comment.comment_type === "repost" ? Repeat2 : Share2;
  return (
    <div className="flex items-center gap-2 rounded-2xl px-3 py-1.5 bg-cyan-500/70 backdrop-blur-md border border-white/20">
      <Avatar src={comment.avatar_url} fullName={name} size="sm" />
      <p className="text-[12px] font-bold text-white flex items-center gap-1.5 flex-1 min-w-0">
        <span className="truncate">{name}</span>
        <Icon className="w-3 h-3 shrink-0" aria-hidden />
        <span className="opacity-90 truncate">
          {comment.comment_type === "repost" ? "a reposté" : "a partagé"}
        </span>
      </p>
    </div>
  );
}

/* Join — discret cyan */
function JoinComment({ comment }: { comment: Comment }) {
  const name = userName(comment);
  return (
    <div className="flex items-center gap-1.5 rounded-2xl px-2.5 py-1 bg-teal-600/60 backdrop-blur-sm border border-white/10">
      <Avatar src={comment.avatar_url} fullName={name} size="sm" />
      <p className="text-[11px] font-bold text-white">
        <span className="text-gold-soft">{name}</span>
        <span className="opacity-80"> a rejoint</span>
      </p>
    </div>
  );
}

/* Milestone — premium gold avec icône Trophy */
function MilestoneComment({ comment }: { comment: Comment }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-night border-2 border-gold shadow-[0_0_24px_rgba(244,185,66,0.4)]">
      <Trophy className="w-4 h-4 text-gold shrink-0" aria-hidden strokeWidth={2.4} />
      <p className="text-[13px] font-display italic text-gold-soft leading-tight">
        {comment.content}
      </p>
      <Sparkles className="w-3.5 h-3.5 text-gold shrink-0" aria-hidden />
    </div>
  );
}

/* System — neutre */
function SystemComment({ comment }: { comment: Comment }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-night/70 backdrop-blur border border-white/10 self-center">
      <Bell className="w-3 h-3 text-cream/70 shrink-0" aria-hidden />
      <p className="text-[10.5px] text-cream/80 italic">{comment.content}</p>
    </div>
  );
}

/* Like burst — "X a envoyé 100 likes" */
function LikeBurstComment({ comment }: { comment: Comment }) {
  const name = userName(comment);
  return (
    <div className="flex items-center gap-2 rounded-2xl px-3 py-1.5 bg-rose-500/80 backdrop-blur-md border border-white/20">
      <Avatar src={comment.avatar_url} fullName={name} size="sm" />
      <p className="text-[12px] font-bold text-white flex items-center gap-1.5 flex-1 min-w-0">
        <span className="truncate">{name}</span>
        <Heart className="w-3 h-3 fill-current shrink-0" aria-hidden />
        <span className="opacity-90">×{comment.likes_count}</span>
      </p>
    </div>
  );
}

/* Super fan — top gifter */
function SuperFanComment({ comment }: { comment: Comment }) {
  const name = userName(comment);
  return (
    <div className="flex items-center gap-2 rounded-2xl px-3 py-1.5 bg-gradient-to-r from-fuchsia-500/90 to-rose-500/90 border border-white/20 shadow-lg">
      <Avatar src={comment.avatar_url} fullName={name} size="sm" />
      <p className="text-[12px] font-extrabold text-white flex items-center gap-1.5 flex-1 min-w-0">
        <Sparkles className="w-3 h-3 shrink-0" aria-hidden />
        <span className="truncate">{name}</span>
        <span className="opacity-90 truncate">est Super Fan</span>
      </p>
    </div>
  );
}

/* Pinned — top du stream sticky */
function PinnedItem({ comment }: { comment: Comment }) {
  const name = userName(comment);
  return (
    <div className="flex items-start gap-1.5 rounded-2xl px-2.5 py-1.5 bg-gold/20 backdrop-blur-md border border-gold/40 mb-1">
      <Pin className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Avatar src={comment.avatar_url} fullName={name} size="sm" />
          <span className="text-[11px] font-extrabold text-gold-soft truncate">
            {name}
          </span>
          <span className="text-[8.5px] font-extrabold uppercase tracking-wider text-gold/80 ml-auto">
            Épinglé
          </span>
        </div>
        <p className="text-[12.5px] text-white leading-snug break-words mt-1">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
 * Badges utilisateur
 * ============================================================ */
function Badge({
  tone,
  children,
}: {
  tone: "gold" | "rose" | "blue";
  children: React.ReactNode;
}) {
  const cls =
    tone === "gold"
      ? "bg-gold text-night"
      : tone === "blue"
        ? "bg-cyan-500 text-white"
        : "bg-rose-500 text-white";
  return (
    <span
      className={`inline-flex items-center h-3.5 px-1 rounded-sm text-[8.5px] font-extrabold uppercase tracking-wider ${cls}`}
    >
      {children}
    </span>
  );
}
