import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/* Style forcé light : neutralise la conversion DS tokens en dark mode
   (l'user macOS dark mode ne doit pas casser la lisibilité du wizard).
   Même pattern que app/page.tsx (landing). */
const forcedLightStyle = {
  "--night": "#0a1f44",
  "--night-soft": "#142a55",
  "--night-muted": "#2a3d6b",
  "--night-dim": "#4b5b87",
  "--bg": "#fff8e8",
  "--bg-deep": "#f3eddc",
  "--bg-soft": "#fdf2d8",
  "--fg": "#0a1f44",
  "--fg-muted": "rgba(10,31,68,0.7)",
  "--fg-subtle": "rgba(10,31,68,0.5)",
  "--line": "#e6e9f0",
  "--line-strong": "#d2d7e2",
  "--muted": "#6b7280",
  "--muted-strong": "#4b5b87",
  "--surface": "#ffffff",
  "--surface-2": "#faf6ec",
  "--color-bg": "#fff8e8",
  "--color-bg-deep": "#f3eddc",
  "--color-fg": "#0a1f44",
  "--color-night": "#0a1f44",
  "--color-night-soft": "#142a55",
  "--color-night-muted": "#2a3d6b",
  "--color-night-dim": "#4b5b87",
  "--color-line": "#e6e9f0",
  "--color-surface": "#ffffff",
  "--color-muted": "#6b7280",
  colorScheme: "light",
} as React.CSSProperties;

export default async function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div
      data-theme="light"
      style={forcedLightStyle}
      className="min-h-screen bg-[#fff8e8] text-[#0a1f44]"
    >
      {children}
    </div>
  );
}
