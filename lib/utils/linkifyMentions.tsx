import Link from "next/link";
import type { ReactNode } from "react";

/* linkifyMentions — convertit "@username" et "#hashtag" en <Link>
 * cliquables dans un texte arbitraire (post body, reel description,
 * comment body, etc.).
 *
 * Règles :
 *   - @username : 2-30 chars [a-z0-9_], lié à /u/[username]
 *   - #hashtag : 2-40 chars [a-z0-9_], lié à /feed/tag/[tag]
 *   - http(s)://… : auto-link en target=_blank rel=noopener
 *   - Le texte non matché reste tel quel (whitespace + autres chars
 *     préservés via React.Fragment chunks).
 *
 * V3 features :
 *   - Mentions résolues côté client (pas de check API à l'affichage)
 *   - URLs autodetected, ouverture nouvel onglet
 *   - Hashtags : link vers la page tag (existante)
 */

/* Pattern combiné qui match @username, #hashtag et URL.
 * Capture groups :
 *   1. mention username
 *   2. hashtag tag
 *   3. URL complète
 */
const TOKEN_RE =
  /(?:^|\s)(?:@([a-zA-Z0-9_]{2,30})|#([a-zA-Z0-9_]{2,40})|(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+))/g;

export function linkifyMentions(text: string): ReactNode {
  if (!text) return null;
  const nodes: ReactNode[] = [];
  let lastIdx = 0;
  let matchIdx = 0;

  /* Itère via exec() pour avoir l'index de match précis. */
  const re = new RegExp(TOKEN_RE.source, TOKEN_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const [fullMatch, mention, hashtag, url] = m;
    /* Le pattern inclut le whitespace en lookbehind soft (ou
       début de chaîne). On garde donc le caractère précédent dans
       le texte pré-match si présent. */
    const tokenStart = m.index + (fullMatch.startsWith(" ") ? 1 : 0);

    /* Push texte avant le token. */
    if (tokenStart > lastIdx) {
      nodes.push(text.slice(lastIdx, tokenStart));
    }

    /* Push le token converti en Link. */
    if (mention) {
      nodes.push(
        <Link
          key={`mention-${matchIdx++}`}
          href={`/u/${mention}`}
          className="text-gold-deep hover:underline font-semibold"
        >
          @{mention}
        </Link>,
      );
    } else if (hashtag) {
      nodes.push(
        <Link
          key={`tag-${matchIdx++}`}
          href={`/feed/tag/${hashtag.toLowerCase()}`}
          className="text-gold-deep hover:underline font-semibold"
        >
          #{hashtag}
        </Link>,
      );
    } else if (url) {
      nodes.push(
        <a
          key={`url-${matchIdx++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-deep hover:underline break-all"
        >
          {shortenUrl(url)}
        </a>,
      );
    }

    lastIdx = m.index + fullMatch.length;
  }

  /* Push le reste. */
  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }

  return nodes.length > 0 ? <>{nodes}</> : text;
}

/* Raccourcit une URL longue : "https://…path/very/long" → "site.com/path…" */
function shortenUrl(url: string): string {
  if (url.length <= 50) return url;
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.length > 1 ? u.pathname.slice(0, 20) + "…" : ""}`;
  } catch {
    return url.slice(0, 47) + "…";
  }
}
