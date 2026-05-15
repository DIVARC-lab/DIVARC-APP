import Link from "next/link";
import type { ReactNode } from "react";

/* Regex pour matcher :
 *  - URLs absolues : https://example.com, http://...
 *  - URLs sans protocole : www.example.com
 *  - Chemins internes DIVARC : /messages/xxx, /u/xxx, /circles/xxx, etc.
 *    (commence par / suivi d'une lettre, pas de double-slash ni espace)
 *
 * On évite les caractères de fin de phrase courants (.,;!?) dans la
 * dernière position pour ne pas les "manger" dans l'URL.
 */
const URL_REGEX =
  /(https?:\/\/[^\s<>"']+[^\s<>"',.;!?)]|www\.[^\s<>"']+[^\s<>"',.;!?)]|\/[a-zA-Z][^\s<>"']*)/g;

const INTERNAL_HOSTS = ["divarc.app", "www.divarc.app"];

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

/* Convertit un texte brut en arbre React où les URLs sont des liens
 * cliquables. Les line breaks (\n) sont préservés via le CSS du parent
 * (`whitespace-pre-wrap`). Les URLs internes (divarc.app ou /xxx)
 * passent par next/Link pour la nav client-side ; les externes par
 * `<a target=_blank>`. Texte plain pour le reste. */
export function LinkifiedText({ text }: { text: string }) {
  if (!text) return null;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  /* On crée une nouvelle regex à chaque appel pour éviter le state
     `lastIndex` partagé qui causerait des miss au second render. */
  const regex = new RegExp(URL_REGEX.source, URL_REGEX.flags);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const raw = match[0];
    const { href, isInternal, internalPath } = buildHref(raw);
    if (isInternal && internalPath) {
      nodes.push(
        <Link
          key={`l-${match.index}`}
          href={internalPath}
          className="underline font-medium hover:opacity-80 break-all"
        >
          {raw}
        </Link>,
      );
    } else {
      nodes.push(
        <a
          key={`l-${match.index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium hover:opacity-80 break-all"
        >
          {raw}
        </a>,
      );
    }
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return <>{nodes}</>;
}
