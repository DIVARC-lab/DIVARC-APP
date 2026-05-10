import "server-only";
import {
  extractAnchors,
  extractTitle,
  htmlToText,
} from "./htmlParse";

/* Crawler polite pour le Website Analyzer.
 *
 * Règles :
 *   - Respect robots.txt (User-agent: divarc-bot)
 *   - Timeout 5s par page
 *   - Max 5MB par page (truncate si plus)
 *   - Max 10 pages par site
 *   - Délai 200ms entre les requêtes (politesse, pas de DDoS)
 *   - User-Agent custom DIVARC bot
 */

export type CrawledPage = {
  url: string;
  status: number;
  html: string;
  text_content: string;
  title: string | null;
  fetched_at: string;
};

const USER_AGENT = "DIVARC-Bot/1.0 (+https://divarc-app.vercel.app/about/bot)";
const MAX_BYTES = 5 * 1024 * 1024;
const PAGE_TIMEOUT_MS = 5_000;
const POLITE_DELAY_MS = 200;
const MAX_PAGES = 10;

export type CrawlResult = {
  pages: CrawledPage[];
  robots_allowed: boolean;
  errors: string[];
};

export async function crawlWebsite(rootUrl: string): Promise<CrawlResult> {
  const errors: string[] = [];
  const visited = new Set<string>();
  const pages: CrawledPage[] = [];

  /* 1. Normalize root URL. */
  let root: URL;
  try {
    root = new URL(rootUrl);
  } catch {
    return {
      pages: [],
      robots_allowed: false,
      errors: ["URL invalide"],
    };
  }
  if (root.protocol !== "https:" && root.protocol !== "http:") {
    return {
      pages: [],
      robots_allowed: false,
      errors: ["Seuls les URLs http(s) sont acceptés"],
    };
  }

  /* 2. Vérifie robots.txt (best-effort, défaut allow). */
  const robotsAllowed = await checkRobots(root.origin);
  if (!robotsAllowed) {
    return {
      pages: [],
      robots_allowed: false,
      errors: [
        "robots.txt interdit le crawl pour User-agent: divarc-bot. " +
          "L'annonceur doit modifier son robots.txt pour autoriser le crawl.",
      ],
    };
  }

  /* 3. Fetch homepage. */
  const homepage = await fetchPage(root.toString());
  if (!homepage) {
    errors.push(`Impossible d'accéder à ${rootUrl}`);
    return { pages, robots_allowed: true, errors };
  }
  pages.push(homepage);
  visited.add(normalizeUrlForVisit(root.toString()));

  /* 4. Extract internal links de la homepage. */
  const linksToVisit = extractInternalLinks(homepage.html, root);

  /* 5. Crawl liens (max MAX_PAGES total). */
  for (const link of linksToVisit) {
    if (pages.length >= MAX_PAGES) break;
    const norm = normalizeUrlForVisit(link);
    if (visited.has(norm)) continue;
    visited.add(norm);

    /* Politeness delay. */
    await sleep(POLITE_DELAY_MS);
    const page = await fetchPage(link);
    if (page) pages.push(page);
    else errors.push(`Erreur fetch ${link}`);
  }

  return { pages, robots_allowed: true, errors };
}

async function checkRobots(origin: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3_000);
    const res = await fetch(`${origin}/robots.txt`, {
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT },
    });
    clearTimeout(t);
    if (!res.ok) return true; // pas de robots.txt = allow
    const text = await res.text();
    /* Parsing minimal : on cherche des règles spécifiques à divarc-bot
       puis fallback à * (User-agent: *). */
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    let currentUa: string | null = null;
    let disallowAll = false;
    for (const line of lines) {
      if (line.startsWith("#") || line.length === 0) continue;
      const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
      if (!m) continue;
      const [, key, val] = m;
      if (key!.toLowerCase() === "user-agent") {
        currentUa = val!.toLowerCase();
      } else if (key!.toLowerCase() === "disallow") {
        const matchesUs =
          currentUa === "divarc-bot" || currentUa === "*";
        if (matchesUs && (val === "/" || val === "")) {
          if (val === "/") disallowAll = true;
        }
      }
    }
    return !disallowAll;
  } catch {
    return true; // erreur réseau = allow par défaut (on n'est pas plus prudent que ça)
  }
}

async function fetchPage(url: string): Promise<CrawledPage | null> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), PAGE_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      return null;
    }

    /* Lit le body avec limite 5MB. */
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (totalBytes < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        chunks.push(value);
      }
    }
    const buffer = new Uint8Array(totalBytes);
    let offset = 0;
    for (const c of chunks) {
      buffer.set(c, offset);
      offset += c.byteLength;
    }
    const html = new TextDecoder("utf-8").decode(buffer);

    /* Extract title + text content (regex parser, pas de JSDOM). */
    let title: string | null = null;
    let textContent = "";
    try {
      title = extractTitle(html);
      textContent = htmlToText(html);
      /* Limite text content à 50KB pour ne pas exploser le LLM. */
      if (textContent.length > 50_000) {
        textContent = textContent.slice(0, 50_000);
      }
    } catch {
      /* Fallback : on garde le brut si le parsing échoue. */
    }

    return {
      url,
      status: res.status,
      html,
      text_content: textContent,
      title,
      fetched_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function extractInternalLinks(html: string, root: URL): string[] {
  const links: string[] = [];
  try {
    for (const href of extractAnchors(html)) {
      try {
        const absUrl = new URL(href, root.toString());
        /* Same origin only. */
        if (absUrl.origin !== root.origin) continue;
        /* Skip anchors, mailto, tel. */
        if (
          absUrl.protocol !== "http:" &&
          absUrl.protocol !== "https:"
        )
          continue;
        /* Skip files. */
        if (
          /\.(pdf|jpg|jpeg|png|webp|gif|svg|mp4|mp3|zip|rar)$/i.test(
            absUrl.pathname,
          )
        )
          continue;
        /* Strip fragment + query (V1 simple). */
        absUrl.hash = "";
        links.push(absUrl.toString());
      } catch {
        /* Invalid href, skip. */
      }
    }
  } catch {
    /* Parser error, return empty. */
  }
  const unique = Array.from(new Set(links));
  unique.sort((a, b) => priorityScore(b) - priorityScore(a));
  return unique.slice(0, 20);
}

function priorityScore(url: string): number {
  const path = new URL(url).pathname.toLowerCase();
  if (/\b(about|qui-sommes-nous|a-propos)\b/.test(path)) return 10;
  if (/\b(products?|produits|catalogue|shop|boutique)\b/.test(path)) return 9;
  if (/\b(services?|prestations)\b/.test(path)) return 8;
  if (/\b(pricing|tarifs|prix)\b/.test(path)) return 7;
  if (/\b(contact)\b/.test(path)) return 6;
  if (/\b(blog|news|actualites)\b/.test(path)) return 3;
  return 5;
}

function normalizeUrlForVisit(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().replace(/\/+$/, "");
  } catch {
    return url;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
