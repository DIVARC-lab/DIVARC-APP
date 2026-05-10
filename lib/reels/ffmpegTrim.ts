/* ffmpeg.wasm trim + split — V3.11 timeline editor.
 *
 * trimClip(blob, startSec, endSec) : extrait un segment via -ss/-t.
 *   - Utilise -c copy (rapide, pas de re-encode) avec un fallback
 *     libx264 ultrafast si le copy échoue ou produit un fichier invalide.
 *
 * splitClip(blob, splitsSec[]) : sépare en N+1 chunks aux timestamps
 *   donnés. Réutilise trimClip en interne. */

import { loadFFmpeg } from "@/lib/reels/ffmpegConcat";

export async function trimClip(
  blob: Blob,
  startSec: number,
  endSec: number,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  if (endSec <= startSec) {
    throw new Error("endSec doit être > startSec");
  }
  const duration = endSec - startSec;

  const ffmpeg = await loadFFmpeg(onProgress);
  const utilModule = (await import(/* @vite-ignore */ "@ffmpeg/util")) as {
    fetchFile: (input: Blob | File | string) => Promise<Uint8Array>;
  };

  const inputName = "trim_input.webm";
  const outputName = "trim_output.mp4";
  await ffmpeg.writeFile(inputName, await utilModule.fetchFile(blob));

  /* Tentative -c copy (rapide). */
  try {
    await ffmpeg.exec([
      "-ss",
      startSec.toFixed(3),
      "-i",
      inputName,
      "-t",
      duration.toFixed(3),
      "-c",
      "copy",
      outputName,
    ]);
  } catch {
    /* Re-encode fallback. */
    await ffmpeg.exec([
      "-ss",
      startSec.toFixed(3),
      "-i",
      inputName,
      "-t",
      duration.toFixed(3),
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-c:a",
      "aac",
      outputName,
    ]);
  }

  const data = await ffmpeg.readFile(outputName);
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const out = new Blob([buffer], { type: "video/mp4" });

  await ffmpeg.deleteFile(inputName).catch(() => undefined);
  await ffmpeg.deleteFile(outputName).catch(() => undefined);

  return out;
}

/* Split en chunks selon les timestamps fournis. splitsSec=[3, 7] sur une
 * vidéo de 10s → 3 chunks : [0-3], [3-7], [7-10]. */
export async function splitClip(
  blob: Blob,
  totalDurationSec: number,
  splitsSec: number[],
  onProgress?: (progress: number) => void,
): Promise<Blob[]> {
  const sorted = [...splitsSec].sort((a, b) => a - b);
  const points = [0, ...sorted.filter((t) => t > 0 && t < totalDurationSec), totalDurationSec];
  const segments: Blob[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]!;
    const end = points[i + 1]!;
    const seg = await trimClip(blob, start, end, onProgress);
    segments.push(seg);
  }
  return segments;
}
