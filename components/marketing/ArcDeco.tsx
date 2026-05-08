type ArcDecoProps = {
  size?: number;
  /** "gold" → trait doré sur fond clair · "night" → trait crème sur fond navy · "navy" → trait navy sur fond clair. */
  tone?: "gold" | "night" | "navy";
  /** Strength of the stroke (px). Defaults to 1.5 — we want a hairline. */
  stroke?: number;
  /** Opacity (0–1). Default 0.45 (visible mais discret). */
  opacity?: number;
  className?: string;
};

const STROKES: Record<NonNullable<ArcDecoProps["tone"]>, string> = {
  gold: "#C8A14A",
  night: "#FAF5EB",
  navy: "#0A1F44",
};

/** Decorative open arc (1 grand cercle + 1 cercle satellite + 1 dot) —
 *  l'élément graphique signature DIVARC qu'on retrouve sur quasi tous
 *  les hero cards du handoff. À placer en `absolute` en bordure des
 *  cards, en `pointer-events-none aria-hidden`. */
export function ArcDeco({
  size = 280,
  tone = "gold",
  stroke = 1.5,
  opacity = 0.45,
  className,
}: ArcDecoProps) {
  const color = STROKES[tone];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 280 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ opacity }}
      aria-hidden
    >
      {/* Grand cercle ouvert : l'arc principal */}
      <circle
        cx="140"
        cy="140"
        r="130"
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray="700 100"
        strokeDashoffset="-180"
      />
      {/* Cercle satellite secondaire */}
      <circle
        cx="225"
        cy="55"
        r="22"
        stroke={color}
        strokeWidth={stroke}
        fill="none"
      />
      {/* Petit dot solide */}
      <circle cx="55" cy="225" r="4" fill={color} />
    </svg>
  );
}
