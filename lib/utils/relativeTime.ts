const formatter = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

export function formatRelative(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  const diffMs = date.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60_000);
  const absMin = Math.abs(diffMin);

  if (absMin < 1) return "à l'instant";
  if (absMin < 60) return formatter.format(diffMin, "minute");

  const diffHour = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffHour) < 24) return formatter.format(diffHour, "hour");

  const diffDay = Math.round(diffMs / 86_400_000);
  if (Math.abs(diffDay) < 7) return formatter.format(diffDay, "day");

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function formatTimestamp(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";

  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
