import { cn } from "@/lib/utils/cn";
import type { CustomStatus, PresenceStatus } from "@/lib/database.types";

type Size = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
};

const RING_CLASSES: Record<Size, string> = {
  sm: "ring-[1.5px]",
  md: "ring-2",
  lg: "ring-2",
};

type PresenceDotProps = {
  status: PresenceStatus;
  customStatus?: CustomStatus;
  size?: Size;
  className?: string;
  /** Cache le point quand offline (par défaut). */
  hideOffline?: boolean;
};

export function PresenceDot({
  status,
  customStatus,
  size = "md",
  className,
  hideOffline = true,
}: PresenceDotProps) {
  // Invisible mode override is already applied server-side via get_visible_presence
  if (status === "offline" && hideOffline) return null;

  let color = "bg-muted";
  let label = "Hors ligne";

  if (status === "online") {
    if (customStatus === "dnd") {
      color = "bg-red-500";
      label = "Ne pas déranger";
    } else if (customStatus === "busy") {
      color = "bg-amber-500";
      label = "Occupé";
    } else {
      color = "bg-emerald-500";
      label = "En ligne";
    }
  } else if (status === "away") {
    color = "bg-amber-400";
    label = "Absent";
  }

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block rounded-full ring-white",
        SIZE_CLASSES[size],
        RING_CLASSES[size],
        color,
        className,
      )}
    />
  );
}
