/* ffmpeg.wasm wrapper — concaténation multi-clips côté client (V3.10).
 *
 * Stack :
 *   - @ffmpeg/ffmpeg (UMD WASM bundle ~10MB, chargé lazy via dynamic import)
 *   - @ffmpeg/util pour fetchFile (Blob/File → Uint8Array)
 *
 * Architecture :
 *   1. loadFFmpeg() : singleton, charge le wasm core via CDN unpkg
 *   2. concatClips(clips[]) :
 *      - écrit chaque clip dans le FS virtuel ffmpeg
 *      - crée un fichier "list.txt" au format demuxer concat
 *      - lance `ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4`
 *      - lit output.mp4 et retourne un Blob
 *   3. terminate() : cleanup wasm worker
 *
 * Limitations V3.10 :
 *   - tous les clips doivent avoir le même codec + résolution (sinon
 *     concat demuxer échoue). En pratique, MediaRecorder produit du
 *     webm/vp8 cohérent. On accepte le risque V3.10 + fallback en re-encode
 *     si concat copy échoue (V4).
 *   - pas de transitions entre clips (cuts secs)
 *   - durée max totale = 90s (cap reel V3) — checked côté caller
 *
 * Le chargement est lazy : la première utilisation déclenche le download
 * du wasm core (~10MB). Affiche un loader pendant ce temps. */

/* Types stub : @ffmpeg/ffmpeg n'est résolu qu'après `npm install`. On
 * laisse les types as any pour ne pas casser la build pré-install — le
 * runtime dynamic import fonctionne normalement. */
type FFmpegLike = {
  load: (opts: { coreURL: string; wasmURL: string }) => Promise<void>;
  on: (event: string, cb: (data: { progress: number }) => void) => void;
  writeFile: (name: string, data: Uint8Array) => Promise<void>;
  readFile: (name: string) => Promise<Uint8Array | string>;
  deleteFile: (name: string) => Promise<void>;
  exec: (args: string[]) => Promise<number>;
  terminate: () => void;
};

let ffmpegInstance: FFmpegLike | null = null;
let loadPromise: Promise<FFmpegLike> | null = null;

const FFMPEG_CDN_BASE =
  "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

export async function loadFFmpeg(
  onProgress?: (progress: number) => void,
): Promise<FFmpegLike> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    /* Dynamic import pour éviter de SSR le wasm. Casts en FFmpegLike car
     * les types ne sont pas résolus avant `npm install`. */
    const ffmpegModule = (await import(
      /* @vite-ignore */ "@ffmpeg/ffmpeg"
    )) as { FFmpeg: new () => FFmpegLike };
    const utilModule = (await import(
      /* @vite-ignore */ "@ffmpeg/util"
    )) as {
      toBlobURL: (url: string, mime: string) => Promise<string>;
    };
    const ffmpeg = new ffmpegModule.FFmpeg();

    if (onProgress) {
      ffmpeg.on("progress", (data) => onProgress(data.progress));
    }

    /* Charge le core depuis CDN (cached par le browser). */
    await ffmpeg.load({
      coreURL: await utilModule.toBlobURL(
        `${FFMPEG_CDN_BASE}/ffmpeg-core.js`,
        "text/javascript",
      ),
      wasmURL: await utilModule.toBlobURL(
        `${FFMPEG_CDN_BASE}/ffmpeg-core.wasm`,
        "application/wasm",
      ),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}

/* Concat séquentiel de plusieurs Blob vidéo via demuxer concat. Retourne
 * un Blob MP4 unique. */
export async function concatClips(
  clips: Blob[],
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  if (clips.length === 0) {
    throw new Error("Pas de clips à concaténer.");
  }
  if (clips.length === 1) {
    return clips[0]!;
  }

  const ffmpeg = await loadFFmpeg(onProgress);
  const utilModule = (await import(/* @vite-ignore */ "@ffmpeg/util")) as {
    fetchFile: (input: Blob | File | string) => Promise<Uint8Array>;
  };
  const { fetchFile } = utilModule;

  /* Écrit chaque clip dans le FS virtuel + génère list.txt. */
  const inputNames: string[] = [];
  for (let i = 0; i < clips.length; i++) {
    const name = `clip_${i}.webm`;
    await ffmpeg.writeFile(name, await fetchFile(clips[i]!));
    inputNames.push(name);
  }

  const listContent = inputNames.map((n) => `file '${n}'`).join("\n");
  await ffmpeg.writeFile("list.txt", new TextEncoder().encode(listContent));

  /* Concat demuxer (copy = pas de re-encode, plus rapide). Fallback en
   * re-encode si copy échoue (codecs incompatibles). */
  const outputName = "output.mp4";
  try {
    await ffmpeg.exec([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "list.txt",
      "-c",
      "copy",
      outputName,
    ]);
  } catch {
    /* Re-encode fallback en cas d'échec du copy. */
    await ffmpeg.exec([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "list.txt",
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
  const blob = new Blob([buffer], { type: "video/mp4" });

  /* Cleanup FS virtuel. */
  for (const name of inputNames) {
    await ffmpeg.deleteFile(name).catch(() => undefined);
  }
  await ffmpeg.deleteFile("list.txt").catch(() => undefined);
  await ffmpeg.deleteFile(outputName).catch(() => undefined);

  return blob;
}

export function terminateFFmpeg(): void {
  if (ffmpegInstance) {
    ffmpegInstance.terminate();
    ffmpegInstance = null;
    loadPromise = null;
  }
}
