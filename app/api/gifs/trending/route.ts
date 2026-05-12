import { NextResponse } from "next/server";

/* Trending Tenor — affiché par défaut quand l'user ouvre le picker GIF
 * sans avoir tapé de recherche. */

export async function GET() {
  const apiKey = process.env.TENOR_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "TENOR_API_KEY non configurée",
      },
      { status: 503 },
    );
  }

  try {
    const url = new URL("https://tenor.googleapis.com/v2/featured");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("limit", "24");
    url.searchParams.set("media_filter", "tinygif,mediumgif,gif");
    url.searchParams.set("contentfilter", "high");
    url.searchParams.set("locale", "fr_FR");

    const res = await fetch(url.toString(), {
      next: { revalidate: 300 }, // cache 5min
    });
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        { error: `Tenor API ${res.status}: ${txt}` },
        { status: 502 },
      );
    }
    const data = await res.json();
    return NextResponse.json({ results: data.results ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur réseau Tenor" },
      { status: 500 },
    );
  }
}
