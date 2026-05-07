export function formatDateSeparator(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const yesterday = today - 86_400_000;
  const sevenDaysAgo = today - 7 * 86_400_000;

  const dateStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();

  if (dateStart === today) return "Aujourd'hui";
  if (dateStart === yesterday) return "Hier";
  if (dateStart > sevenDaysAgo) {
    return date.toLocaleDateString("fr-FR", { weekday: "long" });
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
  }
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
