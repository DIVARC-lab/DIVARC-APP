"use client";

import { useEffect } from "react";
import type { Theme } from "@/lib/database.types";

const THEME_STORAGE_KEY = "divarc-theme";

type ThemeProviderProps = {
  initialTheme: Theme;
};

/** Applies the theme on the html element and keeps it in sync with the user
 * preference + system changes. */
export function ThemeProvider({ initialTheme }: ThemeProviderProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, initialTheme);
    } catch {
      /* ignore */
    }

    applyTheme(initialTheme);

    if (initialTheme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [initialTheme]);

  return null;
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  html.setAttribute("data-theme", resolved);
}

/** Inline script injected before React hydration to avoid a flash of wrong
 * theme. Reads localStorage + system preference. */
export const themeBootstrapScript = `
(function () {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}') || 'system';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = stored === 'dark' || (stored === 'system' && prefersDark) ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

/** Client-side helper used by the preferences form. Updates DOM + localStorage
 * immediately so the user sees the change before the server roundtrip. */
export function setThemeImmediate(theme: Theme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
}
