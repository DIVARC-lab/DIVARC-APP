"use client";

import { useEffect, type RefObject } from "react";

/* useHlsVideo — attache un stream HLS (.m3u8) à un <video> element.
 *
 * Stratégie :
 *   - Safari natif (iOS / macOS Safari) : assignation directe via
 *     video.src = hlsUrl (HLS supporté nativement).
 *   - Autres : on lazy-import hls.js et on attache un Hls() instance.
 *
 * Si hlsUrl est absent, on retombe sur mp4Url. La fonction unmount
 * proprement (destroy hls + release video.src).
 */
export function useHlsVideo(
  videoRef: RefObject<HTMLVideoElement | null>,
  hlsUrl: string | null | undefined,
  mp4Url: string,
) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: { destroy: () => void } | null = null;
    let cancelled = false;

    async function setup() {
      if (!video) return;
      const wantsHls = !!hlsUrl;
      const supportsNativeHls =
        wantsHls &&
        typeof video.canPlayType === "function" &&
        video.canPlayType("application/vnd.apple.mpegurl") !== "";

      if (supportsNativeHls && hlsUrl) {
        video.src = hlsUrl;
        return;
      }

      if (wantsHls) {
        try {
          const mod = await import("hls.js");
          if (cancelled || !video) return;
          const Hls = mod.default;
          if (Hls.isSupported() && hlsUrl) {
            const inst = new Hls({
              capLevelToPlayerSize: true,
              enableWorker: true,
              lowLatencyMode: false,
            });
            inst.loadSource(hlsUrl);
            inst.attachMedia(video);
            hls = inst;
            return;
          }
        } catch {
          /* hls.js échoue : on retombe sur MP4. */
        }
      }

      /* Fallback MP4 (toujours fourni). */
      video.src = mp4Url;
    }

    void setup();

    return () => {
      cancelled = true;
      if (hls) {
        try {
          hls.destroy();
        } catch {
          /* noop */
        }
      }
      if (video) {
        try {
          video.removeAttribute("src");
          video.load();
        } catch {
          /* noop */
        }
      }
    };
  }, [videoRef, hlsUrl, mp4Url]);
}
