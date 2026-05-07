export function safeDate(value: string | number | Date | null | undefined): Date {
  if (value == null) return new Date();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : new Date();
}

export function safeFormatDate(
  value: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale: string = "fr-FR",
): string {
  const date = safeDate(value);
  try {
    return date.toLocaleDateString(locale, options);
  } catch {
    return "";
  }
}

export function safeDaysSince(
  value: string | number | Date | null | undefined,
): number {
  const date = safeDate(value);
  const ms = Date.now() - date.getTime();
  if (!Number.isFinite(ms)) return 1;
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)) + 1);
}
