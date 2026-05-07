type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 40, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DIVARC"
    >
      <rect width="120" height="120" rx="24" fill="#0A1F44" />
      <path
        d="M40 30 L40 90"
        stroke="#F4B942"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M40 30 Q90 30 90 60 Q90 90 40 90"
        stroke="#F8F9FB"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="40" cy="30" r="5" fill="#F4B942" />
      <circle cx="40" cy="90" r="5" fill="#F4B942" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={`flex items-center gap-2 font-semibold tracking-tight ${className ?? ""}`}
    >
      <Logo size={28} />
      <span className="text-night text-xl">DIVARC</span>
    </span>
  );
}
