import { cn } from "@/lib/utils/cn";

type KickerLabelProps = {
  children: React.ReactNode;
  className?: string;
  /** Show the leading "·" prefix (default true). */
  prefix?: boolean;
};

/** Tiny gold uppercase label that sits above section titles.
 *  "Cercles", "Tendances", "Réseau pro", etc. */
export function KickerLabel({
  children,
  className,
  prefix = true,
}: KickerLabelProps) {
  return (
    <span
      className={cn(
        "text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep",
        className,
      )}
    >
      {prefix ? "· " : null}
      {children}
    </span>
  );
}
