type ArcMarkProps = {
  className?: string;
  size?: number;
  animate?: boolean;
};

export function ArcMark({ className, size = 320, animate = true }: ArcMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="arc-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F4B942" />
          <stop offset="100%" stopColor="#B88A2A" />
        </linearGradient>
        <linearGradient id="arc-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#142A55" />
          <stop offset="100%" stopColor="#0A1F44" />
        </linearGradient>
        <radialGradient id="arc-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F4B942" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#F4B942" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#F4B942" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Glow */}
      <circle cx="200" cy="160" r="140" fill="url(#arc-glow)" />

      {/* Outer night ring */}
      <circle
        cx="160"
        cy="160"
        r="138"
        stroke="url(#arc-night)"
        strokeWidth="2"
        opacity="0.18"
      />
      <circle
        cx="160"
        cy="160"
        r="120"
        stroke="url(#arc-night)"
        strokeWidth="1"
        opacity="0.10"
      />

      {/* Vertical bar (the D's spine) */}
      <line
        x1="80"
        y1="50"
        x2="80"
        y2="270"
        stroke="url(#arc-gold)"
        strokeWidth="14"
        strokeLinecap="round"
        className={animate ? "animate-draw-arc" : undefined}
      />

      {/* Big arc forming the D's curve */}
      <path
        d="M 80 50 Q 260 50 260 160 Q 260 270 80 270"
        stroke="url(#arc-night)"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
        className={animate ? "animate-draw-arc" : undefined}
        style={animate ? { animationDelay: "0.3s" } : undefined}
      />

      {/* Inner secondary arc */}
      <path
        d="M 80 90 Q 220 90 220 160 Q 220 230 80 230"
        stroke="url(#arc-gold)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
        className={animate ? "animate-draw-arc" : undefined}
        style={animate ? { animationDelay: "0.6s" } : undefined}
      />

      {/* Connection nodes */}
      <circle cx="80" cy="50" r="9" fill="#F4B942" />
      <circle cx="80" cy="270" r="9" fill="#F4B942" />
      <circle cx="260" cy="160" r="6" fill="#0A1F44" />
      <circle cx="220" cy="160" r="3" fill="#F4B942" />
    </svg>
  );
}
