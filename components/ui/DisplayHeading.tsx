import { cn } from "@/lib/utils/cn";

type DisplayHeadingProps = {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
  /** Default size. Override via className for one-off cases. */
  size?: "sm" | "md" | "lg" | "xl";
};

const SIZES: Record<NonNullable<DisplayHeadingProps["size"]>, string> = {
  sm: "text-[22px]",
  md: "text-[28px] sm:text-[32px]",
  lg: "text-[34px] sm:text-[40px]",
  xl: "text-[40px] sm:text-[54px]",
};

/** Italic Instrument Serif heading. The display voice of DIVARC.
 *  Wrap an accent word in <em className="italic">word</em> to keep it
 *  visually emphasized (the wrapper is already italic so <em> doubles
 *  down via colour or boldness if needed). */
export function DisplayHeading({
  children,
  className,
  as: Tag = "h1",
  size = "md",
}: DisplayHeadingProps) {
  return (
    <Tag
      className={cn(
        "font-display italic leading-[1.05] tracking-[-0.02em] text-night text-balance",
        SIZES[size],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
