/* Logo DIVARC + Wordmark — SVG vector source officiel du designer.
 *
 * 3 marques visuelles distinctes selon le contexte :
 *
 * 1) Logo (marque primaire) — viewBox 1024×1024 carré
 *    Style "iD" cursive : arc gauche night + point doré (figure
 *    un i) + grand D night. Utilisé en TopBar mobile, contextes
 *    fond clair. Optionnel `withBackground` ajoute fond cream.
 *
 * 2) Icon (app icon PWA) — voir app/icon.tsx, app/apple-icon.tsx
 *    Style "D doré sur night gradient" : D plein gold + arc détaché
 *    sur dégradé #0A1F44 → #12306A. Utilisé pour favicon,
 *    apple-touch-icon, manifest PWA.
 *
 * 3) Wordmark — viewBox crop pour cadrer le DIVARC complet
 *    D doré stylisé (arc + body) + I-V-A-R-C en lettres night
 *    pleines (paths filled, pas stroke). Lettres customisables
 *    via prop `letterColor` (dark mode = cream). */

const NIGHT = "#0A1F44";
const GOLD = "#F4B942";
const CREAM = "#F8F9FB";

/* ====== Logo (marque primaire — D night + arc i + point doré) ====== */

const LOGO_ARC =
  "M286 734 C250 570 270 440 340 315 L410 315 C350 435 335 565 374 734 Z";
const LOGO_D =
  "M420 172 H610 C760 172 875 295 875 453 C875 610 760 734 610 734 H375 L456 650 H594 C690 650 765 565 765 453 C765 340 690 255 594 255 H500 Z";
const LOGO_DOT = { cx: 367, cy: 265, r: 33 };

type LogoProps = {
  /** Taille en pixels (le SVG est carré). Défaut 40. */
  size?: number;
  className?: string;
  /** Rendu avec fond cream. Défaut transparent. */
  withBackground?: boolean;
};

export function Logo({ size = 40, className, withBackground = false }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DIVARC"
      role="img"
    >
      {withBackground ? (
        <rect width="1024" height="1024" fill={CREAM} />
      ) : null}
      <path d={LOGO_ARC} fill={NIGHT} />
      <circle cx={LOGO_DOT.cx} cy={LOGO_DOT.cy} r={LOGO_DOT.r} fill={GOLD} />
      <path d={LOGO_D} fill={NIGHT} />
    </svg>
  );
}

/* ====== Wordmark (D doré + IVARC) ====== */

type WordmarkProps = {
  /** Hauteur en pixels (largeur calculée auto via aspect ratio). Défaut 28. */
  height?: number;
  className?: string;
  /** Couleur des lettres I-V-A-R-C + corps du D. Défaut night marine.
   *  Pour dark mode, passer cream/white via cette prop. */
  letterColor?: string;
  /** Couleur de l'arc doré du D. Défaut gold standard #F4B942. */
  dArcColor?: string;
};

export function Wordmark({
  height = 28,
  className,
  letterColor = NIGHT,
  dArcColor = GOLD,
}: WordmarkProps) {
  /* viewBox crop pour cadrer juste le wordmark (le SVG source a
   * un background rect 1920×1080 mais le wordmark occupe seulement
   * une bande horizontale au milieu). Crop : x=320 y=380 w=1380 h=240
   * → aspect ratio 5.75:1. */
  const aspect = 1380 / 240;
  const width = Math.round(height * aspect);
  return (
    <svg
      width={width}
      height={height}
      viewBox="320 380 1380 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DIVARC"
      role="img"
    >
      {/* Symbole D — translaté (340, 420) puis paths internes */}
      <g transform="translate(340 420)">
        {/* Arc or */}
        <path
          d="M0 0 C40 35 40 125 0 160 L28 160 C66 122 66 38 28 0 Z"
          fill={dArcColor}
        />
        {/* Partie night du D */}
        <path
          d="M54 0 H102 C152 0 188 34 188 80 C188 126 152 160 102 160 H54 L72 136 H100 C136 136 162 112 162 80 C162 48 136 24 100 24 H72 Z"
          fill={letterColor}
        />
      </g>

      {/* I — rectangle simple */}
      <rect x="655" y="423" width="18" height="160" fill={letterColor} />

      {/* V — path filled (forme épaisse, pas stroke) */}
      <path
        d="M770 423 L820 583 L870 423 H900 L835 583 H805 L740 423 Z"
        fill={letterColor}
      />

      {/* A — path filled, deux jambes diagonales */}
      <path
        d="M1015 583 L1080 423 H1110 L1175 583 H1145 L1095 455 L1045 583 Z"
        fill={letterColor}
      />

      {/* R — outer + inner counter (fillRule evenodd pour le trou) */}
      <path
        d="M1290 423 H1360 C1412 423 1445 452 1445 500 C1445 534 1426 558 1392 568 L1452 583 H1416 L1362 570 H1320 V583 H1290 Z M1320 448 V545 H1358 C1392 545 1415 528 1415 500 C1415 470 1392 448 1358 448 Z"
        fill={letterColor}
        fillRule="evenodd"
      />

      {/* C — arc épais filled */}
      <path
        d="M1660 454 C1638 434 1614 424 1586 424 C1528 424 1486 462 1486 503 C1486 546 1528 584 1586 584 C1614 584 1638 574 1660 552 L1682 572 C1654 602 1622 614 1582 614 C1508 614 1454 565 1454 503 C1454 441 1508 394 1582 394 C1622 394 1654 406 1682 434 Z"
        fill={letterColor}
      />
    </svg>
  );
}
