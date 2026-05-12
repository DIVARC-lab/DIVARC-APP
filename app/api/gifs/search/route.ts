import { type NextRequest, NextResponse } from "next/server";

/* Proxy Giphy v1 API. Tenor a été discontinué pour les nouveaux projets
 * Google Cloud → on utilise Giphy à la place (free tier généreux).
 * Création clé : https://developers.giphy.com/dashboard/ */

export async function GET(req: NextRequest) {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GIPHY_API_KEY non configurée sur Vercel. Crée une clé gratuite sur https://developers.giphy.com/dashboard/ et ajoute-la en env var.",
      },
      { status: 503 },
    );
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Param 'q' manquant" }, { status: 400 });
  }

  try {
    const giphyUrl = new URL("https://api.giphy.com/v1/gifs/search");
    giphyUrl.searchParams.set("api_key", apiKey);
    giphyUrl.searchParams.set("q", q);
    giphyUrl.searchParams.set("limit", "24");
    giphyUrl.searchParams.set("rating", "pg-13");
    giphyUrl.searchParams.set("lang", "fr");

    const res = await fetch(giphyUrl.toString(), {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        { error: `Giphy API ${res.status}: ${txt}` },
        { status: 502 },
      );
    }
    const data = await res.json();
    /* Normalise le format Giphy → notre format unifié (compatible
       avec le composant StickersAndGifsSheet qui suit Tenor v2). */
    const normalized = (data.data ?? []).map((g: GiphyGif) => ({
      id: g.id,
      url: g.url,
      media_formats: {
        tinygif: g.images.fixed_height_small
          ? {
              url: g.images.fixed_height_small.url,
              dims: [
                Number(g.images.fixed_height_small.width),
                Number(g.images.fixed_height_small.height),
              ],
            }
          : undefined,
        mediumgif: g.images.downsized
          ? {
              url: g.images.downsized.url,
              dims: [
                Number(g.images.downsized.width),
                Number(g.images.downsized.height),
              ],
            }
          : undefined,
        gif: g.images.original
          ? {
              url: g.images.original.url,
              dims: [
                Number(g.images.original.width),
                Number(g.images.original.height),
              ],
            }
          : undefined,
      },
    }));
    return NextResponse.json({ results: normalized });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur réseau Giphy" },
      { status: 500 },
    );
  }
}

type GiphyGif = {
  id: string;
  url: string;
  images: {
    fixed_height_small?: { url: string; width: string; height: string };
    downsized?: { url: string; width: string; height: string };
    original?: { url: string; width: string; height: string };
  };
};
