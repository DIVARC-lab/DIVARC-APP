import { ImageResponse } from "next/og";

/* apple-touch-icon (180×180 PNG) requis par iOS Safari pour "Ajouter
 * à l'écran d'accueil". Sans ce fichier, iOS utilise une capture
 * d'écran générique au lieu de l'icône.
 *
 * Note : iOS ajoute automatiquement le border-radius et le mask
 * (squircle). Donc on ne met PAS de border-radius dans le SVG.
 * Le fond est carré plein pour que le squircle iOS le rogne
 * proprement. */

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          width={120}
          height={120}
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
