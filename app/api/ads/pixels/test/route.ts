import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* POST /api/ads/pixels/test
 *
 * Pixel Helper : fetch une URL et détecte la présence du tag DIVARC
 * Pixel + identifie les events trackés.
 *
 * Auth : authenticated + role editor sur l'ad_account du pixel.
 *
 * Body : { pixel_id, url }
 * Réponse :
 *   {
 *     installed: boolean,
 *     pixel_id_found: string | null,
 *     events_detected: string[],
 *     loads_async: boolean,
 *     placement: 'head' | 'body' | 'unknown',
 *     warnings: string[],
 *     html_excerpt: string,
 *   }
 */

export const runtime = "nodejs";
export const maxDuration = 20;

const bodySchema = z
  .object({
    pixel_id: z.string().uuid(),
    url: z.string().url(),
  })
  .strict();

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { pixel_id, url } = parsed.data;

  /* Vérif pixel exists + perm editor sur l'ad_account. */
  const { data: pixel, error: pErr } = await supabase
    .from("ads_pixels")
    .select("id, ad_account_id, name")
    .eq("id", pixel_id)
    .single();
  if (pErr || !pixel) {
    return NextResponse.json({ error: "Pixel introuvable." }, { status: 404 });
  }
  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: pixel.ad_account_id,
    p_min_role: "editor",
  });
  if (!hasRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* Defensive : exclure URLs internes / SSRF potentiel. */
  const u = new URL(url);
  const host = u.hostname;
  if (
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.|::1|fc00:|fe80:)/.test(host)
  ) {
    return NextResponse.json(
      { error: "URLs internes non autorisées (SSRF protection)." },
      { status: 400 },
    );
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return NextResponse.json(
      { error: "Protocole non supporté." },
      { status: 400 },
    );
  }

  /* Fetch HTML. */
  let html: string;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "DIVARC-PixelHelper/1.0 (+https://divarc.app)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Page inaccessible (HTTP ${res.status}).` },
        { status: 200 },
      );
    }
    /* Limite 5MB pour éviter abus. */
    const ab = await res.arrayBuffer();
    if (ab.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Page trop volumineuse (> 5 MB)." },
        { status: 200 },
      );
    }
    html = new TextDecoder("utf-8").decode(ab);
  } catch (err) {
    console.warn("[ads:pixels:test:fetch]", err);
    return NextResponse.json(
      { error: "Échec du chargement de la page." },
      { status: 200 },
    );
  }

  /* === Détection === */
  const warnings: string[] = [];
  const events_detected = new Set<string>();
  let pixel_id_found: string | null = null;
  let placement: "head" | "body" | "unknown" = "unknown";
  let loads_async = false;

  /* Match tag DIVARC Pixel — pattern standard div(a)rc('init', '<UUID>'). */
  const initMatch = html.match(
    /divarc\s*\(\s*['"`]init['"`]\s*,\s*['"`]([0-9a-f-]{32,40})['"`]\s*\)/i,
  );
  if (initMatch) {
    pixel_id_found = initMatch[1] ?? null;
  }

  /* Fallback : data-pixel-id="<uuid>". */
  if (!pixel_id_found) {
    const dataAttr = html.match(/data-pixel-id\s*=\s*['"`]([0-9a-f-]{32,40})['"`]/i);
    if (dataAttr) pixel_id_found = dataAttr[1] ?? null;
  }

  /* Events trackés : divarc('track', 'EventName'). */
  const eventRegex =
    /divarc\s*\(\s*['"`]track['"`]\s*,\s*['"`]([A-Za-z0-9_]+)['"`]/gi;
  let m: RegExpExecArray | null;
  while ((m = eventRegex.exec(html)) !== null) {
    if (m[1]) events_detected.add(m[1]);
  }

  /* Async loading. */
  if (/<script[^>]+async[^>]+pixel/i.test(html)) loads_async = true;
  if (/<script[^>]+src=['"][^'"]*divarc[^'"]*['"][^>]*>/i.test(html))
    loads_async = true;

  /* Placement. */
  const headEnd = html.indexOf("</head>");
  if (
    headEnd > 0 &&
    initMatch &&
    initMatch.index !== undefined &&
    initMatch.index < headEnd
  ) {
    placement = "head";
  } else if (initMatch) {
    placement = "body";
  }

  /* Warnings. */
  if (pixel_id_found && pixel_id_found !== pixel_id) {
    warnings.push(
      `Pixel installé avec un autre ID (${pixel_id_found}). Vérifie que tu utilises le bon snippet.`,
    );
  }
  if (placement === "body") {
    warnings.push(
      "Le pixel devrait idéalement être dans <head> pour fire avant le rendu.",
    );
  }
  if (events_detected.size === 0 && pixel_id_found) {
    warnings.push(
      "Aucun event tracké détecté (PageView, AddToCart, etc.). Ajoute des appels divarc('track', '...').",
    );
  }
  if (!loads_async && pixel_id_found) {
    warnings.push(
      "Le pixel ne semble pas chargé en async — peut ralentir ta page.",
    );
  }

  /* Persist last_helper_test_at. */
  await supabase
    .from("ads_pixels")
    .update({ last_helper_test_at: new Date().toISOString() })
    .eq("id", pixel_id);

  /* Excerpt around the init tag pour debug. */
  let html_excerpt = "";
  if (initMatch && initMatch.index !== undefined) {
    const start = Math.max(0, initMatch.index - 80);
    html_excerpt = html.slice(start, start + 280);
  }

  return NextResponse.json({
    installed: pixel_id_found !== null,
    pixel_id_found,
    pixel_id_match: pixel_id_found === pixel_id,
    events_detected: [...events_detected],
    loads_async,
    placement,
    warnings,
    html_excerpt,
    fetched_at: new Date().toISOString(),
  });
}
