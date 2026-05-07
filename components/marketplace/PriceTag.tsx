import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/currency";
import type { Currency } from "@/lib/database.types";

type PriceTagProps = {
  amount: number;
  currency: Currency;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZE_CLASSES: Record<NonNullable<PriceTagProps["size"]>, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "font-display text-4xl sm:text-5xl",
};

export function PriceTag({
  amount,
  currency,
  size = "md",
  className,
}: PriceTagProps) {
  return (
    <span
      className={cn(
        "font-bold text-night tracking-tight",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {amount > 0 ? formatPrice(amount, currency) : "Gratuit"}
    </span>
  );
}
