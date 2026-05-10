import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* GET /api/ads/creative/stock-search?q=<query>&page=<n>
 *
 * Recherche photos stock libres de droits (Pexels en V1, Unsplash V2).
 * Auth : authenticated (pas de role check — feature exploratoire).
 *
 * Réponse :
 *   { photos: [{ id, url, thumb, photographer, source }] }
 *
 * Si PEXELS_API_KEY absent : retourne [] avec status 200 (graceful).
 */

export const runtime = "nodejs";
export const maxDuration = 15;

type Photo = {
  id: string;
  url: string;
  thumb: string;
  photographer: string;
  source: "pexels" | "unsplash";
  width: number;
  height: number;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const page = Math.max(1, Math.min(20, Number(url.searchParams.get("page") ?? 1)));

  if (q.length < 2) {
    return NextResponse.json({ photos: [] });
  }

  const photos: Photo[] = [];

  /* Pexels. */
  const pexKey = process.env.PEXELS_API_KEY;
  if (pexKey) {
    try {
      const pexRes = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=18&page=${page}`,
        {
          headers: { Authorization: pexKey },
          signal: AbortSignal.timeout(8000),
        },
      );
      if (pexRes.ok) {
        const data = (await pexRes.json()) as {
          photos?: Array<{
            id: number;
            src: { medium: string; large: string };
            photographer: string;
            width: number;
            height: number;
          }>;
        };
        for (const p of data.photos ?? []) {
          photos.push({
            id: `pexels-${p.id}`,
            url: p.src.large,
            thumb: p.src.medium,
            photographer: p.photographer,
            source: "pexels",
            width: p.width,
            height: p.height,
          });
        }
      }
    } catch (err) {
      console.warn("[ads:creative:stock-search:pexels]", err);
    }
  }

  /* Unsplash — fallback / mix. */
  const unsKey = process.env.UNSPLASH_ACCESS_KEY;
  if (unsKey && photos.length < 18) {
    try {
      const unsRes = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=10&page=${page}`,
        {
          headers: { Authorization: `Client-ID ${unsKey}` },
          signal: AbortSignal.timeout(8000),
        },
      );
      if (unsRes.ok) {
        const data = (await unsRes.json()) as {
          results?: Array<{
            id: string;
            urls: { regular: string; small: string };
            user: { name: string };
            width: number;
            height: number;
          }>;
        };
        for (const p of data.results ?? []) {
          photos.push({
            id: `unsplash-${p.id}`,
            url: p.urls.regular,
            thumb: p.urls.small,
            photographer: p.user.name,
            source: "unsplash",
            width: p.width,
            height: p.height,
          });
        }
      }
    } catch (err) {
      console.warn("[ads:creative:stock-search:unsplash]", err);
    }
  }

  return NextResponse.json({ photos });
}
