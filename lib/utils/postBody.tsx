import Link from "next/link";
import type { ReactNode } from "react";

const PATTERN = /(#[A-Za-zÀ-ÖØ-öø-ÿ0-9_]{1,40})|(@[a-z0-9_]{3,20})/g;

/** Rend le corps d'un post en transformant #hashtag et @mention en liens.
 * Les hashtags pointent vers /feed/tag/<tag>, les mentions vers /u/<username>. */
export function renderPostBody(body: string | null): ReactNode {
  if (!body) return null;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of body.matchAll(PATTERN)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      parts.push(body.slice(lastIndex, idx));
    }
    const token = match[0];
    if (token.startsWith("#")) {
      const tag = token.slice(1).toLowerCase();
      parts.push(
        <Link
          key={`tag-${key++}`}
          href={`/feed/tag/${encodeURIComponent(tag)}`}
          className="text-gold-deep font-semibold hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {token}
        </Link>,
      );
    } else if (token.startsWith("@")) {
      const username = token.slice(1).toLowerCase();
      parts.push(
        <Link
          key={`mention-${key++}`}
          href={`/u/${encodeURIComponent(username)}`}
          className="text-night font-semibold hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {token}
        </Link>,
      );
    }
    lastIndex = idx + token.length;
  }

  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex));
  }

  return parts;
}

/** Extrait les hashtags lowercase depuis un body (utile côté client pour
 * afficher une preview avant submit). */
export function extractHashtags(body: string | null): string[] {
  if (!body) return [];
  const out = new Set<string>();
  for (const match of body.matchAll(/#([A-Za-zÀ-ÖØ-öø-ÿ0-9_]{1,40})/g)) {
    out.add(match[1]!.toLowerCase());
  }
  return Array.from(out);
}
