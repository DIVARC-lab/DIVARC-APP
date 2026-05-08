import { Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { TrendingPost } from "@/lib/queries/explore";
import { renderPostBody } from "@/lib/utils/postBody";
import { formatRelative } from "@/lib/utils/relativeTime";

type TrendingPostCardProps = {
  post: TrendingPost;
};

export function TrendingPostCard({ post }: TrendingPostCardProps) {
  const author = post.author;
  const displayName =
    author?.full_name ?? author?.username ?? "Utilisateur DIVARC";

  return (
    <Link
      href={`/feed/${post.id}`}
      className="group flex gap-4 p-4 rounded-3xl bg-white border border-line hover:border-night/30 hover:shadow-soft transition-all"
    >
      {post.cover_url ? (
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-night/5 border border-line shrink-0">
          <Image
            src={post.cover_url}
            alt=""
            fill
            sizes="120px"
            className="object-cover"
            unoptimized={post.cover_url.includes("?")}
          />
        </div>
      ) : (
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-cream to-gold/15 border border-gold/30 flex items-center justify-center text-3xl shrink-0">
          ✨
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 text-xs text-muted mb-1">
          <Avatar src={author?.avatar_url ?? null} fullName={displayName} size="sm" className="!w-5 !h-5" />
          <span className="font-semibold text-night truncate">{displayName}</span>
          <span>·</span>
          <time dateTime={post.created_at}>
            {formatRelative(post.created_at)}
          </time>
        </div>
        <p className="text-sm text-night line-clamp-3 leading-relaxed flex-1">
          {post.body ? (
            renderPostBody(post.body)
          ) : (
            <em className="text-muted">Post sans texte</em>
          )}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted">
          {post.likes_count > 0 ? (
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 fill-red-500 text-red-500" aria-hidden />
              {post.likes_count}
            </span>
          ) : null}
          {post.comments_count > 0 ? (
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" aria-hidden />
              {post.comments_count}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
