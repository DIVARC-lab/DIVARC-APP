import { ImageResponse } from "next/og";

/* Génère dynamiquement l'apple-touch-icon (180×180 PNG) requis par
 * iOS Safari pour "Ajouter à l'écran d'accueil". Sans ce fichier,
 * iOS refuse l'install ou utilise une capture d'écran générique. */

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
          background: "#0A1F44",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
        }}
      >
        <svg
          width={120}
          height={120}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M40 30 L40 90"
            stroke="#F4B942"
            strokeWidth={10}
            strokeLinecap="round"
          />
          <path
            d="M40 30 Q90 30 90 60 Q90 90 40 90"
            stroke="#F8F9FB"
            strokeWidth={10}
            strokeLinecap="round"
            fill="none"
          />
          <circle cx={40} cy={30} r={7} fill="#F4B942" />
          <circle cx={40} cy={90} r={7} fill="#F4B942" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
