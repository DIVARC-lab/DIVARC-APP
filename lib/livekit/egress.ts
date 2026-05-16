import "server-only";

/* Étape 21 — Helpers LiveKit Egress pour VOD basique.
 *
 * RoomCompositeEgress : enregistre la "vue composite" de la room (layout
 * grille auto avec tous les publishers visibles) en MP4. Output options :
 *   - S3 (Supabase Storage S3-compatible OU AWS S3)
 *   - Azure Blob
 *   - GCS
 *   - File (sur le serveur LiveKit, déconseillé)
 *
 * Pour V1 : S3 vers Supabase Storage. Config via env vars
 * SUPABASE_STORAGE_S3_* (à configurer côté admin avant utilisation).
 * Si les env vars manquent, on retourne une erreur claire — pas de
 * fallback (V2 ajoutera LiveKit Cloud temporaire).
 */

import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  ImageFileSuffix,
  ImageOutput,
  S3Upload,
} from "livekit-server-sdk";

function getEgressClient(): EgressClient | null {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
  if (!apiKey || !apiSecret || !wsUrl) return null;
  const httpUrl = wsUrl.replace(/^wss?:/, "https:");
  return new EgressClient(httpUrl, apiKey, apiSecret);
}

function getStorageConfig(): {
  bucket: string;
  endpoint: string;
  region: string;
  accessKey: string;
  secret: string;
} | null {
  const bucket = process.env.SUPABASE_STORAGE_VOD_BUCKET ?? "live-vod";
  const endpoint = process.env.SUPABASE_STORAGE_S3_ENDPOINT;
  const region = process.env.SUPABASE_STORAGE_S3_REGION ?? "eu-west-3";
  const accessKey = process.env.SUPABASE_STORAGE_S3_ACCESS_KEY_ID;
  const secret = process.env.SUPABASE_STORAGE_S3_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKey || !secret) return null;
  return { bucket, endpoint, region, accessKey, secret };
}

export function isEgressConfigured(): boolean {
  return getEgressClient() !== null && getStorageConfig() !== null;
}

type StartResult =
  | {
      ok: true;
      egressId: string;
      filepath: string;
      thumbnailPrefix: string;
    }
  | { ok: false; error: string };

export async function startRoomRecording(
  roomName: string,
): Promise<StartResult> {
  const client = getEgressClient();
  if (!client) return { ok: false, error: "LiveKit non configuré." };
  const storage = getStorageConfig();
  if (!storage) return { ok: false, error: "Storage VOD non configuré." };

  /* Filename horodaté + roomName slug pour éviter collisions. */
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filepath = `vod/${roomName}/${stamp}.mp4`;
  /* Étape 23 — Capture parallèle d'images pour thumbnails.
     filename_prefix = thumbnails/{room}/{stamp}_
     filename_suffix = INDEX → _000000.jpg, _000001.jpg, ... */
  const thumbnailPrefix = `thumbnails/${roomName}/${stamp}_`;

  const s3Upload = new S3Upload({
    accessKey: storage.accessKey,
    secret: storage.secret,
    region: storage.region,
    bucket: storage.bucket,
    endpoint: storage.endpoint,
    forcePathStyle: true,
  });

  /* Second upload pour les images (même bucket, même creds). */
  const s3UploadThumbs = new S3Upload({
    accessKey: storage.accessKey,
    secret: storage.secret,
    region: storage.region,
    bucket: storage.bucket,
    endpoint: storage.endpoint,
    forcePathStyle: true,
  });

  const fileOutput = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath,
    output: { case: "s3", value: s3Upload },
  });

  const imageOutput = new ImageOutput({
    captureInterval: 30 /* 1 image toutes les 30 secondes */,
    width: 640,
    height: 360,
    filenamePrefix: thumbnailPrefix,
    filenameSuffix: ImageFileSuffix.IMAGE_SUFFIX_INDEX,
    output: { case: "s3", value: s3UploadThumbs },
  });

  try {
    const info = await client.startRoomCompositeEgress(
      roomName,
      { file: fileOutput, images: imageOutput },
      {
        layout: "grid",
        audioOnly: false,
        videoOnly: false,
      },
    );
    return { ok: true, egressId: info.egressId, filepath, thumbnailPrefix };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Egress start failed",
    };
  }
}

export async function stopRoomRecording(
  egressId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = getEgressClient();
  if (!client) return { ok: false, error: "LiveKit non configuré." };
  try {
    await client.stopEgress(egressId);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Egress stop failed",
    };
  }
}
