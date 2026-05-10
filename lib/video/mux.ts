import "server-only";

/* Wrapper léger pour l'API Mux Video.
 *
 * Mux : transcoding HLS adaptatif + thumbnails + storage.
 * Pricing : ~0.005€/min de vidéo + ~0.001€/min de delivery.
 * Free tier : $20 de crédit (assez pour ~4000 min de vidéo en V1).
 *
 * Si MUX_TOKEN_ID + MUX_TOKEN_SECRET absents → le wrapper est no-op
 * et le pipeline reste sur MP4 direct (fallback gracieux).
 *
 * Doc : https://docs.mux.com/api-reference#video
 */

const MUX_API = "https://api.mux.com";

type MuxAsset = {
  id: string;
  status: "preparing" | "ready" | "errored";
  playback_ids?: Array<{ id: string; policy: "public" | "signed" }>;
  duration?: number;
  aspect_ratio?: string;
  errors?: { messages?: string[] };
};

function authHeader(): string | null {
  const id = process.env.MUX_TOKEN_ID;
  const secret = process.env.MUX_TOKEN_SECRET;
  if (!id || !secret) return null;
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

export function isMuxConfigured(): boolean {
  return authHeader() !== null;
}

/* Crée un asset à partir d'une URL publique (ex: l'URL Supabase Storage
   du MP4). Mux télécharge l'asset et lance le transcoding async.
   Retourne l'asset_id à stocker en DB pour matcher au webhook. */
export async function createMuxAsset(args: {
  inputUrl: string;
  /** Passthrough = id du post DIVARC, retourné dans les events
   *  webhook pour faire le mapping. */
  passthrough: string;
}): Promise<{ asset_id: string; playback_id: string } | null> {
  const auth = authHeader();
  if (!auth) return null;

  try {
    const res = await fetch(`${MUX_API}/video/v1/assets`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [{ url: args.inputUrl }],
        playback_policy: ["public"],
        passthrough: args.passthrough,
        /* MP4 fallback désactivé en V1 (Mux le génère sur demande). */
        mp4_support: "none",
        normalize_audio: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.warn("[mux:createAsset]", res.status, await res.text());
      return null;
    }
    const json = (await res.json()) as { data?: MuxAsset };
    const asset = json.data;
    if (!asset || !asset.playback_ids?.[0]) return null;
    return {
      asset_id: asset.id,
      playback_id: asset.playback_ids[0].id,
    };
  } catch (err) {
    console.warn("[mux:createAsset]", err);
    return null;
  }
}

/* URL HLS publique pour un playback_id Mux. Format standard. */
export function muxHlsUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

/* URL thumbnail (poster frame extraite à 0.5s). */
export function muxThumbnailUrl(playbackId: string, timeSec = 0.5): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${timeSec}`;
}

/* Type minimal d'un événement webhook Mux. */
export type MuxWebhookEvent = {
  type: string; // ex: "video.asset.ready"
  data?: {
    id?: string;
    status?: string;
    playback_ids?: Array<{ id: string; policy: string }>;
    passthrough?: string;
    duration?: number;
    aspect_ratio?: string;
    errors?: { messages?: string[] };
  };
};
