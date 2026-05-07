import type { Currency, SalaryPeriod } from "@/lib/database.types";
import { formatPrice } from "@/lib/utils/currency";
import { SALARY_PERIOD_META } from "@/lib/utils/jobs";

type SalaryRangeProps = {
  min: number | null;
  max: number | null;
  currency: Currency | null;
  period: SalaryPeriod | null;
  className?: string;
};

export function SalaryRange({
  min,
  max,
  currency,
  period,
  className,
}: SalaryRangeProps) {
  if (!currency || !period || (min == null && max == null)) {
    return (
      <span className={className ?? "text-sm text-muted"}>
        Salaire à discuter
      </span>
    );
  }

  const periodLabel = SALARY_PERIOD_META[period];

  if (min != null && max != null && min !== max) {
    return (
      <span className={className ?? "text-sm font-semibold text-night"}>
        {formatPrice(min, currency)} – {formatPrice(max, currency)}{" "}
        <span className="font-normal text-muted">{periodLabel}</span>
      </span>
    );
  }

  const value = min ?? max ?? 0;
  return (
    <span className={className ?? "text-sm font-semibold text-night"}>
      {formatPrice(value, currency)}{" "}
      <span className="font-normal text-muted">{periodLabel}</span>
    </span>
  );
}
