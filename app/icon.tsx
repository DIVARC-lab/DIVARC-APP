import { ImageResponse } from "next/og";

/* Icon principale 512×512 PNG pour le manifest PWA (Android + browsers).
 * Pas de border-radius car maskable. */

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
          background: "#0A1F44",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={340}
          height={340}
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
