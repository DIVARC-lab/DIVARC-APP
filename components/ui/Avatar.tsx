import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: "w-9 h-9 text-xs",
  md: "w-12 h-12 text-sm",
  lg: "w-16 h-16 text-lg",
  xl: "w-24 h-24 text-2xl",
};

const PIXEL_SIZE: Record<AvatarSize, number> = {
  sm: 36,
  md: 48,
  lg: 64,
  xl: 96,
};

type AvatarProps = {
  src: string | null;
  fullName: string | null;
  size?: AvatarSize;
  className?: string;
  priority?: boolean;
};

export function Avatar({
  src,
  fullName,
  size = "md",
  className,
  priority,
}: AvatarProps) {
  const initials = computeInitials(fullName);
  const px = PIXEL_SIZE[size];
  const validSrc = isValidImageSource(src) ? src : null;

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full bg-night/10 border border-line overflow-hidden flex items-center justify-center select-none",
        SIZE_CLASSES[size],
        className,
      )}
      aria-label={fullName ? `Avatar de ${fullName}` : "Avatar"}
    >
      <span
        className="absolute inset-0 flex items-center justify-center font-bold text-night"
        aria-hidden
      >
        {initials}
      </span>
      {validSrc ? (
        <Image
          src={validSrc}
          alt=""
          fill
          priority={priority}
          sizes={`${px}px`}
          className="object-cover relative z-10"
          unoptimized={validSrc.includes("?")}
        />
      ) : null}
    </div>
  );
}

function isValidImageSource(src: string | null): src is string {
  if (!src || typeof src !== "string") return false;
  if (!src.startsWith("https://") && !src.startsWith("/")) return false;
  return true;
}

function computeInitials(fullName: string | null): string {
  if (!fullName) return "D";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "D";
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
