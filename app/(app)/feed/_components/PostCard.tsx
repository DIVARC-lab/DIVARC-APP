import { Globe, Lock, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { PostWithDetails } from "@/lib/database.types";
import { renderPostBody } from "@/lib/utils/postBody";
import { formatRelative } from "@/lib/utils/relativeTime";
import { BookmarkButton } from "./BookmarkButton";
import { LikeButton } from "./LikeButton";
import { PostMenu } from "./PostMenu";
import { PostPhotos } from "./PostPhotos";
import { PostVideoPlayer } from "./PostVideoPlayer";

type PostCardProps = {
  post: PostWithDetails;
  currentUserId: string;
  showActions?: boolean;
};

export function PostCard({
  post,
  currentUserId,
  showActions = true,
}: PostCardProps) {
  const author = post.author;
  const displayName = author?.full_name ?? author?.username ?? "Utilisateur";
  const isOwn = post.author_id === currentUserId;

  /* Pattern Bold du proto handoff : split body en première phrase
     (display italic 19px) + reste (sans-serif 13.5px) pour un rythme
     éditorial. Les textes sans ponctuation forte gardent tout en
     première phrase. */
  const fullBody = post.body ?? "";
  const firstDot = fullBody.indexOf(".");
  const firstSentence = firstDot > 0 ? fullBody.slice(0, firstDot + 1) : fullBody;
  const restBody = firstDot > 0 ? fullBody.slice(firstDot + 1).trim() : "";

  return (
    <article className="rounded-[28px] bg-white overflow-hidden shadow-[0_1px_2px_rgba(10,31,68,0.04),0_20px_50px_-28px_rgba(10,31,68,0.22)]">
      <header className="flex items-center gap-3 px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
        <Link href={`/u/${author?.username ?? ""}`} className="shrink-0">
          <Avatar
            src={author?.avatar_url ?? null}
            fullName={displayName}
            size="md"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-night truncate">{displayName}</p>
          <p className="text-[11px] text-night-dim truncate flex items-center gap-1.5 mt-0.5">
            <span
              aria-hidden
              className="inline-block w-[5px] h-[5px] rounded-full bg-gold"
            />
            <Link href={`/feed/${post.id}`} className="hover:underline">
              {formatRelative(post.created_at)}
            </Link>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <VisibilityBadge visibility={post.visibility} />
              {post.visibility === "public"
                ? "Public"
                : post.visibility === "private"
                  ? "Moi"
                  : "Amis"}
            </span>
            {post.edited_at ? (
              <>
                <span>·</span>
                <span className="italic">modifié</span>
              </>
            ) : null}
          </p>
        </div>
        {isOwn ? <PostMenu postId={post.id} /> : null}
      </header>

      {fullBody ? (
        <div className="px-4 sm:px-5 pb-3">
          <p className="font-display italic text-[19px] text-night leading-[1.3] whitespace-pre-wrap break-words">
            {renderPostBody(firstSentence)}
          </p>
          {restBody ? (
            <p className="mt-2 text-[13.5px] text-night-soft leading-[1.55] whitespace-pre-wrap break-words">
              {renderPostBody(restBody)}
            </p>
          ) : null}
        </div>
      ) : null}

      {post.video_url ? (
        <div className="px-4 sm:px-5 pb-3">
          <div className="rounded-2xl overflow-hidden">
            <PostVideoPlayer
              url={post.video_url}
              thumbnailUrl={post.video_thumbnail_url}
              durationMs={post.video_duration_ms}
              width={post.video_width}
              height={post.video_height}
            />
          </div>
        </div>
      ) : post.photos.length > 0 ? (
        <Link href={`/feed/${post.id}`} className="block px-4 sm:px-5 pb-3">
          <div className="rounded-2xl overflow-hidden">
            <PostPhotos photos={post.photos} alt={displayName} rounded={false} />
          </div>
        </Link>
      ) : null}

      {showActions ? (
        <footer className="flex items-center gap-1.5 px-3 sm:px-4 pb-3.5">
          <LikeButton
            postId={post.id}
            initialLiked={post.is_liked}
            initialCount={post.likes_count}
          />
          <Link
            href={`/feed/${post.id}`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-night-soft hover:bg-night/5 hover:text-night text-[13px] font-bold transition-colors"
          >
            <MessageCircle className="w-4 h-4" aria-hidden />
            {post.comments_count > 0 ? post.comments_count : "Commenter"}
          </Link>
          <div className="ml-auto">
            <BookmarkButton
              postId={post.id}
              initialBookmarked={post.is_bookmarked}
            />
          </div>
        </footer>
      ) : null}
    </article>
  );
}

function VisibilityBadge({
  visibility,
}: {
  visibility: PostWithDetails["visibility"];
}) {
  if (visibility === "public") {
    return (
      <span
        className="inline-flex items-center gap-0.5"
        title="Visible par tous"
      >
        <Globe className="w-3 h-3" aria-hidden />
      </span>
    );
  }
  if (visibility === "friends") {
    return (
      <span
        className="inline-flex items-center gap-0.5"
        title="Visible par tes amis"
      >
        <Users className="w-3 h-3" aria-hidden />
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title="Visible par toi uniquement"
    >
      <Lock className="w-3 h-3" aria-hidden />
    </span>
  );
}
