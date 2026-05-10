import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* GET /api/posts/places/search?q=<query>&country=FR&proximity=lng,lat
 *
 * Proxy de recherche de lieux via Mapbox Places API.
 *
 * Auth : authenticated only.
 *
 * Si MAPBOX_ACCESS_TOKEN absent → 503 graceful (UI affiche fallback
 * « Recherche indisponible »).
 *
 * Réponse :
 *   { places: [{ id, name, address, city, country, lat, lng, category }] }
 */

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const country = url.searchParams.get("country")?.slice(0, 2) ?? "fr";
  const proximity = url.searchParams.get("proximity"); // "lng,lat"

  if (q.length < 2) {
    return NextResponse.json({ places: [] });
  }

  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        places: [],
        unavailable: true,
        error: "Mapbox non configuré (MAPBOX_ACCESS_TOKEN manquant).",
      },
      { status: 200 },
    );
  }

  const params = new URLSearchParams({
    access_token: token,
    language: "fr",
    country,
    limit: "8",
    /* poi + address pour avoir lieux + rues. */
    types: "poi,address,place,locality,neighborhood",
  });
  if (proximity) params.set("proximity", proximity);

  let res: Response;
  try {
    res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params}`,
      {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json" },
      },
    );
  } catch (err) {
    console.warn("[posts:places:search]", err);
    return NextResponse.json(
      { places: [], error: "Erreur réseau Mapbox." },
      { status: 200 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { places: [], error: `Mapbox HTTP ${res.status}` },
      { status: 200 },
    );
  }

  const json = (await res.json().catch(() => ({}))) as {
    features?: Array<{
      id: string;
      text: string;
      place_name: string;
      properties?: { category?: string; address?: string };
      center: [number, number];
      context?: Array<{ id: string; text: string; short_code?: string }>;
    }>;
  };

  const places = (json.features ?? []).map((f) => {
    const cityCtx = f.context?.find(
      (c) => c.id.startsWith("place.") || c.id.startsWith("locality."),
    );
    const countryCtx = f.context?.find((c) => c.id.startsWith("country."));
    return {
      id: f.id,
      name: f.text,
      address: f.place_name,
      city: cityCtx?.text ?? null,
      country:
        countryCtx?.short_code?.toUpperCase().slice(0, 2) ?? null,
      lat: f.center[1],
      lng: f.center[0],
      category: f.properties?.category ?? null,
    };
  });

  return NextResponse.json({ places });
}
