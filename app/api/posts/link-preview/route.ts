import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* GET /api/posts/link-preview?url=<encoded URL>
 *
 * Fetch + parse Open Graph metadata pour previewer un lien dans le
 * composer. Pas de DB — résultat retourné direct au client qui le
 * stocke dans le state du composer.
 *
 * SSRF protection : bloque localhost, IPs privées, autres protocoles.
 * Limite 5MB body, 10s timeout.
 */

export const runtime = "nodejs";
export const maxDuration = 15;

const PRIVATE_IP_RE =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|::1|fc00:|fe80:|0\.0\.0\.0)/i;
const MAX_BYTES = 5 * 1024 * 1024;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json(
      { error: "Protocole non supporté" },
      { status: 400 },
    );
  }
  if (PRIVATE_IP_RE.test(parsed.hostname)) {
    return NextResponse.json(
      { error: "URLs internes non autorisées" },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      method: "GET",
      headers: {
        "User-Agent":
          "DIVARC-LinkPreview/1.0 (+https://divarc-app.vercel.app/about/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json(
      { error: "Page inaccessible" },
      { status: 200 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `Page inaccessible (HTTP ${res.status})` },
      { status: 200 },
    );
  }

  /* Limite la taille pour éviter les abus. */
  const ab = await res.arrayBuffer();
  if (ab.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "Page trop volumineuse" },
      { status: 200 },
    );
  }
  const html = new TextDecoder("utf-8").decode(ab);

  /* Parse OG / fallback meta name="description" / fallback title. */
  const ogTitle = match(
    html,
    /<meta\s[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']*)["']/i,
  );
  const ogDescription = match(
    html,
    /<meta\s[^>]*property\s*=\s*["']og:description["'][^>]*content\s*=\s*["']([^"']*)["']/i,
  );
  const ogImage = match(
    html,
    /<meta\s[^>]*property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']*)["']/i,
  );
  const ogSiteName = match(
    html,
    /<meta\s[^>]*property\s*=\s*["']og:site_name["'][^>]*content\s*=\s*["']([^"']*)["']/i,
  );
  const fallbackTitle = match(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const fallbackDescription = match(
    html,
    /<meta\s[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["']/i,
  );

  const title =
    ogTitle ?? (fallbackTitle ? cleanWhitespace(fallbackTitle) : null);
  const description = ogDescription ?? fallbackDescription;
  const imageUrl = ogImage ? resolveUrl(ogImage, parsed) : null;
  const siteName = ogSiteName ?? parsed.hostname.replace(/^www\./, "");

  return NextResponse.json({
    url: parsed.toString(),
    title: title ? decodeHtml(title).slice(0, 200) : null,
    description: description ? decodeHtml(description).slice(0, 500) : null,
    image_url: imageUrl,
    site_name: siteName ? decodeHtml(siteName).slice(0, 80) : null,
    fetched_at: new Date().toISOString(),
  });
}

function match(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m && m[1] ? m[1] : null;
}

function cleanWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));
}

function resolveUrl(maybeRelative: string, base: URL): string {
  try {
    return new URL(maybeRelative, base.toString()).toString();
  } catch {
    return maybeRelative;
  }
}
