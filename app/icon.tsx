import { ImageResponse } from "next/og";

/* Icon principale 512×512 PNG pour le manifest PWA (Android + browsers).
 *
 * Design : D doré italique stylisé DIVARC sur fond gradient night marine.
 * Pas de border-radius (maskable : Android/Chrome rognent eux-mêmes). */

export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(160deg, #14182a 0%, #0a1f44 50%, #1b2d52 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={340}
          height={340}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 30 22 L 50 18 C 78 18 88 35 88 50 C 88 65 78 82 50 82 L 30 78 L 30 22 Z M 42 32 L 50 30 C 65 30 75 40 75 50 C 75 60 65 70 50 70 L 42 68 L 42 32 Z"
            fill="#F5BE3D"
            fillRule="evenodd"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
