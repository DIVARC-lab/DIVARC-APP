import "server-only";

/* Mini-parseur HTML basé sur regex pour le Website Analyzer.
 *
 * Remplace JSDOM (qui crash sur Vercel serverless à cause de
 * dépendances natives bundlées par Turbopack). Pour ce qu'on en fait
 * — extraire title, og:*, ld+json, h1/2/3, img, a[href] — c'est
 * largement suffisant et 100x plus léger.
 *
 * Limitations connues (acceptables V1) :
 *   - Pas de support des entités HTML exotiques (on décode &amp; &lt;
 *     &gt; &quot; &apos; &#xxx; mais pas tout)
 *   - Pas de gestion stricte des nested tags identiques
 *   - Strip scripts/styles avant parsing pour éviter les faux positifs
 */

/* === Decode basique des entités HTML les plus courantes. === */
const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  copy: "©",
  reg: "®",
  trade: "™",
  euro: "€",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) =>
      String.fromCharCode(parseInt(n, 10)),
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) =>
      String.fromCharCode(parseInt(n, 16)),
    )
    .replace(/&([a-z]+);/gi, (m, name: string) => {
      const v = HTML_ENTITIES[name.toLowerCase()];
      return v ?? m;
    });
}

/* === Strip <script>, <style>, <noscript>, <iframe>. === */
export function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, "");
}

/* === Strip toutes les balises HTML pour obtenir le text content. === */
export function htmlToText(html: string): string {
  const stripped = stripScriptsAndStyles(html);
  const noTags = stripped.replace(/<[^>]+>/g, " ");
  return decodeEntities(noTags).replace(/\s+/g, " ").trim();
}

/* === Extract <title>...</title>. === */
export function extractTitle(html: string): string | null {
  const m = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  if (!m || !m[1]) return null;
  const t = decodeEntities(m[1].replace(/\s+/g, " ")).trim();
  return t.length > 0 ? t : null;
}

/* === Extract <meta name="description" content="..."> ou property="...". === */
export function extractMetaContent(
  html: string,
  attr: "name" | "property",
  value: string,
): string | null {
  /* Match <meta ... attr="value" ... content="..."> dans n'importe quel ordre. */
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta\\s[^>]*${attr}\\s*=\\s*["']${escapedValue}["'][^>]*content\\s*=\\s*["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta\\s[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*${attr}\\s*=\\s*["']${escapedValue}["']`,
      "i",
    ),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1] !== undefined) return decodeEntities(m[1]).trim();
  }
  return null;
}

/* === Extract toutes les meta og:* (property="og:xxx"). === */
export function extractAllOpenGraph(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re =
    /<meta\b[^>]*?(?:property|name)\s*=\s*["'](og:[^"']+)["'][^>]*?content\s*=\s*["']([^"']*)["'][^>]*?\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1] && m[2] !== undefined) {
      out[m[1]] = decodeEntities(m[2]).trim();
    }
  }
  /* Aussi le pattern inverse content avant property. */
  const re2 =
    /<meta\b[^>]*?content\s*=\s*["']([^"']*)["'][^>]*?(?:property|name)\s*=\s*["'](og:[^"']+)["'][^>]*?\/?>/gi;
  while ((m = re2.exec(html)) !== null) {
    if (m[2] && m[1] !== undefined && !(m[2] in out)) {
      out[m[2]] = decodeEntities(m[1]).trim();
    }
  }
  return out;
}

/* === Extract tous les <script type="application/ld+json">...</script>. === */
export function extractJsonLd(html: string): Array<Record<string, unknown>> {
  const results: Array<Record<string, unknown>> = [];
  const re =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const it of parsed) {
          if (it && typeof it === "object") {
            results.push(it as Record<string, unknown>);
          }
        }
      } else if (parsed && typeof parsed === "object") {
        results.push(parsed as Record<string, unknown>);
      }
    } catch {
      /* JSON malformé, ignore. */
    }
  }
  return results;
}

/* === Extract le contenu textuel des h1/h2/h3. === */
export function extractHeadings(
  html: string,
  level: 1 | 2 | 3,
): string[] {
  const stripped = stripScriptsAndStyles(html);
  const re = new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}\\s*>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    if (!m[1]) continue;
    /* Strip tags imbriquées + decode. */
    const text = decodeEntities(m[1].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 0 && text.length < 200) out.push(text);
  }
  return out;
}

/* === Extract <img src="..." alt="..." width="..." height="...">. === */
export type ParsedImage = {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
};

export function extractImages(html: string): ParsedImage[] {
  const out: ParsedImage[] = [];
  const re = /<img\b([^>]+?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    if (!attrs) continue;
    const src = attr(attrs, "src");
    if (!src) continue;
    const alt = attr(attrs, "alt");
    const w = attr(attrs, "width");
    const h = attr(attrs, "height");
    out.push({
      src: decodeEntities(src),
      alt: alt ? decodeEntities(alt) : undefined,
      width: w ? parseIntOrUndef(w) : undefined,
      height: h ? parseIntOrUndef(h) : undefined,
    });
  }
  return out;
}

/* === Extract <a href="..."> hrefs. === */
export function extractAnchors(html: string): string[] {
  const out: string[] = [];
  const re = /<a\b([^>]*?)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1] ? attr(m[1], "href") : null;
    if (href) out.push(decodeEntities(href));
  }
  return out;
}

/* === Helpers. === */

function attr(attrs: string, name: string): string | null {
  /* Match name="value" ou name='value' (avec espace ou début après >). */
  const re = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const m = attrs.match(re);
  if (!m) return null;
  return m[1] ?? m[2] ?? m[3] ?? null;
}

function parseIntOrUndef(s: string): number | undefined {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}
