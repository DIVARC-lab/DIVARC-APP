import { ImageResponse } from "next/og";

/* apple-touch-icon (180×180 PNG) requis par iOS Safari pour "Ajouter
 * à l'écran d'accueil". Sans ce fichier, iOS utilise une capture
 * d'écran générique au lieu de l'icône.
 *
 * iOS applique automatiquement le mask squircle → on rend le fond
 * carré plein (rx 0 ici) pour que le rognage natif iOS soit propre. */

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
            "linear-gradient(180deg, #0A1F44 0%, #12306A 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1024 1024"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M380 290 H610 C760 290 845 390 845 512 C845 634 760 734 610 734 H430 L500 650 H600 C690 650 760 595 760 512 C760 429 690 374 600 374 H470 Z"
            fill="#F4B942"
          />
          <path
            d="M300 690 C370 620 390 560 390 512 C390 464 370 404 300 334 H380 C445 404 475 462 475 512 C475 562 445 620 380 690 Z"
            fill="#F4B942"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
