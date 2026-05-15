/* Logo DIVARC + Wordmark — SVG vector haute qualité.
 *
 * Caractéristiques visuelles reproduites :
 *  - D doré stylisé italique avec biseaux diagonaux haut-gauche et
 *    bas-gauche (donne le look cursive moderne)
 *  - Counter intérieur strict respectant les proportions de la marque
 *  - Couleur gold deep DIVARC : #F5BE3D
 *  - Wordmark : D doré + I-V-A-R-C en sans-serif géométrique épuré
 *    (stroke uniforme, tracking large, sommets pointus pour V/A)
 *  - Couleur lettres : #0A1F44 (night DIVARC) sur fond clair,
 *    #F5F5DD (cream) sur fond sombre (override via prop letterColor)
 *
 * Avantages SVG vs PNG :
 *  - Net à toute taille (favicon 16px → splash screen 1024px)
 *  - 2-3 KB inline vs 50-100 KB PNG
 *  - Couleurs adaptables dark mode via prop
 *  - 0 network request (inline)
 */

type LogoProps = {
  /** Taille en pixels (le SVG est carré). Défaut 40. */
  size?: number;
  className?: string;
  /** Couleur du D. Défaut gold deep DIVARC. */
  color?: string;
};

/* Path D italique stylisé — viewBox 100×100, sommets aux biseaux
 * gauches pour le look cursive de la marque. fillRule="evenodd"
 * crée le trou du counter intérieur. */
const D_PATH =
  "M 30 22 L 50 18 C 78 18 88 35 88 50 C 88 65 78 82 50 82 L 30 78 L 30 22 Z " +
  "M 42 32 L 50 30 C 65 30 75 40 75 50 C 75 60 65 70 50 70 L 42 68 L 42 32 Z";

export function Logo({
  size = 40,
  className,
  color = "#F5BE3D",
}: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DIVARC"
      role="img"
    >
      <path d={D_PATH} fill={color} fillRule="evenodd" />
    </svg>
  );
}

type WordmarkProps = {
  /** Hauteur en pixels (largeur calculée auto via aspect ratio). Défaut 28. */
  height?: number;
  className?: string;
  /** Couleur des lettres I-V-A-R-C. Défaut night marine #0A1F44.
   *  Pour dark mode, passer #F5F5DD ou similaire. */
  letterColor?: string;
  /** Couleur du D doré. Défaut gold deep #F5BE3D. */
  dColor?: string;
};

/* Wordmark "DIVARC" — viewBox 620×100.
 *
 * Composition :
 *  - D doré (chemin réutilisé du logo, scale 0.85)
 *  - Espacement uniforme entre les lettres (~30px tracking)
 *  - I, V, A, R, C dessinés en paths stroke pour finesse uniforme
 *  - strokeWidth 7 = ~7% de la hauteur de la lettre, harmonieux
 *  - strokeLinecap="square" pour le rendu géométrique (pas arrondi)
 *
 * Lettres : chaque path utilise des coordonnées explicites pour un
 * tracking visuellement régulier (compte tenu de la largeur variable
 * de chaque glyphe : I étroit, A/V medium, R/D larges). */
export function Wordmark({
  height = 28,
  className,
  letterColor = "#0A1F44",
  dColor = "#F5BE3D",
}: WordmarkProps) {
  /* Aspect ratio 6.2:1 (620×100). */
  const width = Math.round(height * 6.2);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 620 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DIVARC"
      role="img"
    >
      {/* D doré — scale 0.85 du logo, positionné à gauche */}
      <g transform="translate(0 10) scale(0.85)">
        <path d={D_PATH} fill={dColor} fillRule="evenodd" />
      </g>

      {/* I — ligne verticale épaisse */}
      <line
        x1="135"
        y1="20"
        x2="135"
        y2="85"
        stroke={letterColor}
        strokeWidth="7"
        strokeLinecap="square"
      />

      {/* V — deux diagonales convergentes (pointe en bas) */}
      <path
        d="M 175 20 L 215 85 L 255 20"
        stroke={letterColor}
        strokeWidth="7"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* A — deux diagonales convergentes (pointe en haut), pas de barre horizontale */}
      <path
        d="M 290 85 L 325 20 L 360 85"
        stroke={letterColor}
        strokeWidth="7"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />

      {/* R — barre verticale + boucle haut + jambe diagonale */}
      <path
        d="M 395 20 L 395 85 M 395 20 L 432 20 C 452 20 462 32 462 45 C 462 58 452 70 432 70 L 395 70 M 432 70 L 465 85"
        stroke={letterColor}
        strokeWidth="7"
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />

      {/* C — arc circulaire ouvert à droite */}
      <path
        d="M 605 30 C 595 18 575 15 560 22 C 540 32 530 50 535 65 C 540 82 560 92 580 88 C 595 85 600 78 605 72"
        stroke={letterColor}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
