import { NextResponse } from "next/server";

/* Trending Giphy — affiché par défaut quand l'user ouvre le picker GIF
 * sans avoir tapé de recherche. */

type GiphyGif = {
  id: string;
  url: string;
  images: {
    fixed_height_small?: { url: string; width: string; height: string };
    downsized?: { url: string; width: string; height: string };
    original?: { url: string; width: string; height: string };
  };
};

export async function GET() {
  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "GIPHY_API_KEY non configurée",
      },
      { status: 503 },
    );
  }

  try {
    const url = new URL("https://api.giphy.com/v1/gifs/trending");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("limit", "24");
    url.searchParams.set("rating", "pg-13");

    const res = await fetch(url.toString(), {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        { error: `Giphy API ${res.status}: ${txt}` },
        { status: 502 },
      );
    }
    const data = await res.json();
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
