import { type NextRequest, NextResponse } from "next/server";

/* Proxy Tenor v2 API. Évite d'exposer la clé API côté client.
 * Requires TENOR_API_KEY env var.
 * https://developers.google.com/tenor/guides/quickstart */

export async function GET(req: NextRequest) {
  const apiKey = process.env.TENOR_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "TENOR_API_KEY non configurée sur Vercel. Crée une clé sur https://developers.google.com/tenor/guides/quickstart et ajoute-la en env var.",
      },
      { status: 503 },
    );
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Param 'q' manquant" }, { status: 400 });
  }

  try {
    const tenorUrl = new URL("https://tenor.googleapis.com/v2/search");
    tenorUrl.searchParams.set("key", apiKey);
    tenorUrl.searchParams.set("q", q);
    tenorUrl.searchParams.set("limit", "24");
    tenorUrl.searchParams.set("media_filter", "tinygif,mediumgif,gif");
    tenorUrl.searchParams.set("contentfilter", "high");
    tenorUrl.searchParams.set("locale", "fr_FR");

    const res = await fetch(tenorUrl.toString(), {
      next: { revalidate: 60 }, // cache 1min côté Vercel edge
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
