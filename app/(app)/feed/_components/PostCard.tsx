import { Globe, Lock, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { PostWithDetails } from "@/lib/database.types";
import { renderPostBody } from "@/lib/utils/postBody";
import { formatRelative } from "@/lib/utils/relativeTime";
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

  return (
    <article className="rounded-3xl bg-white border border-line shadow-soft overflow-hidden">
      <header className="flex items-center gap-3 p-4 sm:p-5">
        <Link href={`/u/${author?.username ?? ""}`} className="shrink-0">
          <Avatar src={author?.avatar_url ?? null} fullName={displayName} size="md" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-night truncate">
            {displayName}
          </p>
          <p className="text-xs text-muted truncate flex items-center gap-1">
            <VisibilityBadge visibility={post.visibility} />
            <span>·</span>
            <Link href={`/feed/${post.id}`} className="hover:underline">
              {formatRelative(post.created_at)}
            </Link>
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

      {post.body ? (
        <div className="px-4 sm:px-5 pb-3">
          <p className="text-sm text-night leading-relaxed whitespace-pre-wrap break-words">
            {renderPostBody(post.body)}
          </p>
        </div>
      ) : null}

      {post.video_url ? (
        <PostVideoPlayer
          url={post.video_url}
          thumbnailUrl={post.video_thumbnail_url}
          durationMs={post.video_duration_ms}
          width={post.video_width}
          height={post.video_height}
        />
      ) : post.photos.length > 0 ? (
        <Link href={`/feed/${post.id}`} className="block">
          <PostPhotos photos={post.photos} alt={displayName} rounded={false} />
        </Link>
      ) : null}

      {showActions ? (
        <footer className="flex items-center gap-2 p-3 sm:p-4 border-t border-line">
          <LikeButton
            postId={post.id}
            initialLiked={post.is_liked}
            initialCount={post.likes_count}
          />
          <Link
            href={`/feed/${post.id}`}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-night/5 text-night-muted hover:bg-night/10 hover:text-night text-sm font-semibold"
          >
            <MessageCircle className="w-4 h-4" aria-hidden />
            {post.comments_count > 0 ? post.comments_count : "Commenter"}
          </Link>
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
