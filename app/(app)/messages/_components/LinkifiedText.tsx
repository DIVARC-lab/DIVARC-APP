import Link from "next/link";
import type { ReactNode } from "react";

/* LinkifiedText V2 — Rendu rich text inline :
 *
 *  - **Markdown léger** :
 *      *gras*      → <strong>
 *      _italique_  → <em class="italic">
 *      ~strike~    → <s>
 *      `code`      → <code>
 *
 *  - **URLs** auto-linkifiées (internes DIVARC en next/Link)
 *  - **Mentions** @username → lien gold vers /u/username
 *  - **Hashtags** #tag → lien gold vers /search?q=#tag
 *  - **Big emoji** : si le texte ne contient que 1-3 emojis (et rien
 *    d'autre), on rend en font-size 3x (WhatsApp/iMessage style)
 */

const URL_REGEX =
  /(https?:\/\/[^\s<>"']+[^\s<>"',.;!?)]|www\.[^\s<>"']+[^\s<>"',.;!?)]|\/[a-zA-Z][^\s<>"']*)/g;

const MENTION_REGEX = /@([a-zA-Z0-9_.]{2,30})/g;
const HASHTAG_REGEX = /#([\p{L}\p{N}_]{2,40})/gu;

/* Match les marqueurs markdown. Order matters : code en premier
 * (back-ticks préservent leur contenu litéral). */
const MD_REGEX = /(`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;

const INTERNAL_HOSTS = ["divarc.app", "www.divarc.app"];

const EMOJI_ONLY_REGEX =
  /^(\s*(?:\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic})*️?)\s*){1,3}$/u;

function buildHref(raw: string): {
  href: string;
  isInternal: boolean;
  internalPath: string | null;
} {
  if (raw.startsWith("/")) {
    return { href: raw, isInternal: true, internalPath: raw };
  }
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    const isInternal = INTERNAL_HOSTS.includes(url.host.toLowerCase());
    return {
      href: withProtocol,
      isInternal,
      internalPath: isInternal ? `${url.pathname}${url.search}${url.hash}` : null,
    };
  } catch {
    return { href: withProtocol, isInternal: false, internalPath: null };
  }
}

/* Tokenize : on découpe le texte en fragments selon les patterns
 * (URL, mention, hashtag, markdown). On garde l'ordre original via
 * un tableau de tokens typés. */
type Token =
  | { kind: "text"; value: string }
  | { kind: "url"; value: string }
  | { kind: "mention"; value: string; username: string }
  | { kind: "hashtag"; value: string; tag: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "strike"; value: string }
  | { kind: "code"; value: string };

function tokenize(input: string): Token[] {
  /* 1. On extrait d'abord les blocs markdown (qui peuvent contenir
   *    n'importe quoi entre les marqueurs), puis URL/mention/hashtag
   *    sur les fragments restants. */
  const tokens: Token[] = [];

  function pushPlain(text: string) {
    if (!text) return;

    /* On découpe le text en fragments URL/mention/hashtag. */
    const subTokens: Array<{
      kind: "text" | "url" | "mention" | "hashtag";
      value: string;
      meta?: string;
      start: number;
      end: number;
    }> = [];

    const re = new RegExp(URL_REGEX.source, URL_REGEX.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      subTokens.push({
        kind: "url",
        value: m[0],
        start: m.index,
        end: m.index + m[0].length,
      });
    }

    const re2 = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags);
    while ((m = re2.exec(text)) !== null) {
      subTokens.push({
        kind: "mention",
        value: m[0],
        meta: m[1],
        start: m.index,
        end: m.index + m[0].length,
      });
    }

    const re3 = new RegExp(HASHTAG_REGEX.source, HASHTAG_REGEX.flags);
    while ((m = re3.exec(text)) !== null) {
      subTokens.push({
        kind: "hashtag",
        value: m[0],
        meta: m[1],
        start: m.index,
        end: m.index + m[0].length,
      });
    }

    /* Sort + dédoublonner les overlaps (URL prioritaire). */
    subTokens.sort((a, b) => a.start - b.start);
    const merged: typeof subTokens = [];
    for (const t of subTokens) {
      const last = merged[merged.length - 1];
      if (last && t.start < last.end) continue;
      merged.push(t);
    }

    let idx = 0;
    for (const t of merged) {
      if (t.start > idx) {
        tokens.push({ kind: "text", value: text.slice(idx, t.start) });
      }
      if (t.kind === "url") {
        tokens.push({ kind: "url", value: t.value });
      } else if (t.kind === "mention") {
        tokens.push({
          kind: "mention",
          value: t.value,
          username: t.meta ?? "",
        });
      } else if (t.kind === "hashtag") {
        tokens.push({
          kind: "hashtag",
          value: t.value,
          tag: t.meta ?? "",
        });
      }
      idx = t.end;
    }
    if (idx < text.length) {
      tokens.push({ kind: "text", value: text.slice(idx) });
    }
  }

  /* Première passe markdown : extrait code/gras/italique/strike. */
  const mdRe = new RegExp(MD_REGEX.source, MD_REGEX.flags);
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = mdRe.exec(input)) !== null) {
    if (m.index > lastIdx) {
      pushPlain(input.slice(lastIdx, m.index));
    }
    const raw = m[0];
    const inner = raw.slice(1, -1);
    if (raw.startsWith("`")) {
      tokens.push({ kind: "code", value: inner });
    } else if (raw.startsWith("*")) {
      tokens.push({ kind: "bold", value: inner });
    } else if (raw.startsWith("_")) {
      tokens.push({ kind: "italic", value: inner });
    } else if (raw.startsWith("~")) {
      tokens.push({ kind: "strike", value: inner });
    }
    lastIdx = m.index + raw.length;
  }
  if (lastIdx < input.length) {
    pushPlain(input.slice(lastIdx));
  }

  return tokens;
}

export function LinkifiedText({ text }: { text: string }) {
  if (!text) return null;

  /* Big emoji auto : 1-3 emojis seuls = font-size 3x. */
  if (EMOJI_ONLY_REGEX.test(text)) {
    return (
      <span className="text-[42px] sm:text-[52px] leading-tight">
        {text.trim()}
      </span>
    );
  }

  const tokens = tokenize(text);
  const nodes: ReactNode[] = [];

  tokens.forEach((t, i) => {
    const key = `t-${i}`;
    switch (t.kind) {
      case "text":
        nodes.push(<span key={key}>{t.value}</span>);
        break;
      case "url": {
        const { href, isInternal, internalPath } = buildHref(t.value);
        if (isInternal && internalPath) {
          nodes.push(
            <Link
              key={key}
              href={internalPath}
              className="underline font-medium text-gold-deep hover:text-gold break-all"
            >
              {t.value}
            </Link>,
          );
        } else {
          nodes.push(
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium text-gold-deep hover:text-gold break-all"
            >
              {t.value}
            </a>,
          );
        }
        break;
      }
      case "mention":
        nodes.push(
          <Link
            key={key}
            href={`/u/${t.username}`}
            className="font-bold text-gold-deep hover:text-gold"
          >
            {t.value}
          </Link>,
        );
        break;
      case "hashtag":
        nodes.push(
          <Link
            key={key}
            href={`/search?q=%23${encodeURIComponent(t.tag)}`}
            className="font-bold text-gold-deep hover:text-gold"
          >
            {t.value}
          </Link>,
        );
        break;
      case "bold":
        nodes.push(
          <strong key={key} className="font-extrabold">
            {t.value}
          </strong>,
        );
        break;
      case "italic":
        nodes.push(
          <em key={key} className="italic">
            {t.value}
          </em>,
        );
        break;
      case "strike":
        nodes.push(
          <s key={key} className="line-through opacity-80">
            {t.value}
          </s>,
        );
        break;
      case "code":
        nodes.push(
          <code
            key={key}
            className="font-mono text-[12.5px] px-1 py-0.5 rounded bg-bg-soft border border-line"
          >
            {t.value}
          </code>,
        );
        break;
    }
  });

  return <>{nodes}</>;
}
