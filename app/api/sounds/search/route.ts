import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/* GET /api/sounds/search?q=<query>&category=<cat>
 *
 * Recherche multi-source :
 *   1. Table sounds locale (sons originaux DIVARC + Pixabay déjà cachés)
 *   2. Si < 10 résultats, fetch Pixabay Music API + cache dans sounds
 *
 * Si q vide : retourne les tendances (top usage_count).
 *
 * Auth : authenticated.
 *
 * Pixabay : si PIXABAY_API_KEY absent → fallback table locale only.
 *
 * Doc Pixabay : https://pixabay.com/api/docs/#api_music
 */

export const runtime = "nodejs";
export const maxDuration = 15;

const CATEGORIES_FR: Record<string, string> = {
  trending: "Tendances",
  hiphop: "Hip-Hop",
  pop: "Pop",
  electronic: "Électronique",
  acoustic: "Acoustique",
  cinematic: "Cinématique",
  funny: "Drôle",
  emotional: "Émotionnel",
  ambient: "Ambient",
  rock: "Rock",
};

type PixabayTrack = {
  id: number;
  title: string;
  name?: string;
  artists?: Array<{ name: string }>;
  duration: number;
  audio?: string;
  audio_id?: string;
  cover_url?: string;
  tags?: string[];
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
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const category = url.searchParams.get("category") ?? null;

  /* === 1. Recherche table sounds locale. === */
  const sb = await createClient();
  let query = sb
    .from("sounds")
    .select("id, title, artist, duration_seconds, audio_url, artwork_url, source, usage_count, is_explicit")
    .order("usage_count", { ascending: false })
    .limit(30);

  if (q.length >= 1) {
    /* Fuzzy match via gin_trgm (index ajouté en migration 0054). */
    query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  }

  const { data: localSounds } = await query;
  const localList = localSounds ?? [];

  /* === 2. Si pas assez de résultats locaux, fetch Pixabay. === */
  let pixabayList: typeof localList = [];
  const pxKey = process.env.PIXABAY_API_KEY;
  const shouldFetchPixabay =
    pxKey && q.length >= 2 && localList.length < 10;

  if (shouldFetchPixabay) {
    try {
      const res = await fetch(
        `https://pixabay.com/api/music/?key=${pxKey}&q=${encodeURIComponent(q)}&per_page=15`,
        {
          signal: AbortSignal.timeout(8000),
          headers: { Accept: "application/json" },
        },
      );
      if (res.ok) {
        const json = (await res.json()) as { hits?: PixabayTrack[] };
        const hits = json.hits ?? [];
        if (hits.length > 0) {
          /* Cache async dans sounds (non-bloquant, ne casse pas la réponse). */
          const admin = createAdminClient();
          const rows = hits.map((h) => ({
            title: (h.title ?? h.name ?? "Sans titre").slice(0, 200),
            artist:
              (h.artists?.map((a) => a.name).join(", ") ??
                "Pixabay")
                .slice(0, 120),
            duration_seconds: Math.max(1, Math.min(600, h.duration ?? 30)),
            audio_url: h.audio ?? "",
            artwork_url: h.cover_url ?? null,
            source: "pixabay" as const,
            license_info: { provider: "pixabay", track_id: h.id },
            is_explicit: false,
          }));
          /* Filter rows avec audio_url valide + dédup contre la table
             (le onConflict nécessiterait une UNIQUE constraint sur
             audio_url, on évite via lookup). */
          const validRows = rows.filter((r) => r.audio_url.length > 0);
          if (validRows.length > 0) {
            const urls = validRows.map((r) => r.audio_url);
            const { data: existing } = await admin
              .from("sounds")
              .select(
                "id, title, artist, duration_seconds, audio_url, artwork_url, source, usage_count, is_explicit",
              )
              .in("audio_url", urls);
            const existingUrls = new Set(
              ((existing ?? []) as Array<{ audio_url: string }>).map(
                (e) => e.audio_url,
              ),
            );
            const toInsert = validRows.filter(
              (r) => !existingUrls.has(r.audio_url),
            );
            let newlyInserted: typeof localList = [];
            if (toInsert.length > 0) {
              const { data: ins } = await admin
                .from("sounds")
                .insert(toInsert)
                .select(
                  "id, title, artist, duration_seconds, audio_url, artwork_url, source, usage_count, is_explicit",
                );
              newlyInserted = ins ?? [];
            }
            pixabayList = [...(existing ?? []), ...newlyInserted];
          }
        }
      }
    } catch (err) {
      console.warn("[sounds:search:pixabay]", err);
    }
  }

  /* Merge + dédup par audio_url. */
  const allSounds = [...localList, ...pixabayList];
  const seen = new Set<string>();
  const merged = allSounds.filter((s) => {
    if (seen.has(s.audio_url)) return false;
    seen.add(s.audio_url);
    return true;
  });

  void category; // used for UI filtering V1.5+, not yet enforced server-side

  return NextResponse.json({
    sounds: merged,
    pixabay_available: !!pxKey,
    categories: CATEGORIES_FR,
  });
}
