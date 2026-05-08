import { cn } from "@/lib/utils/cn";

type DisplayHeadingProps = {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
  /** Default size. Override via className for one-off cases. */
  size?: "sm" | "md" | "lg" | "xl";
  /** Render the entire heading in italic (otherwise only nested
   *  <em> tags get italic — pattern Sage). */
  italicAll?: boolean;
};

const SIZES: Record<NonNullable<DisplayHeadingProps["size"]>, string> = {
  sm: "text-[22px]",
  md: "text-[28px] sm:text-[32px]",
  lg: "text-[34px] sm:text-[40px]",
  xl: "text-[40px] sm:text-[54px]",
};

/** Instrument Serif heading. The display voice of DIVARC.
 *  By default the heading itself is upright; wrap an accent word in
 *  <em className="italic">word</em> for the gold italic emphasis used
 *  throughout the proto (« Ce que tes proches *racontent*. »). */
export function DisplayHeading({
  children,
  className,
  as: Tag = "h1",
  size = "md",
  italicAll = false,
}: DisplayHeadingProps) {
  return (
    <Tag
      className={cn(
        "font-display leading-[1.05] tracking-[-0.02em] text-night text-balance",
        italicAll && "italic",
        SIZES[size],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
