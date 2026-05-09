import { defineConfig, devices } from "@playwright/test";

/* Config minimale pour visual checks DIVARC.
 * Mobile-first : viewport iPhone 14 (390x844). */
export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  projects: [
    {
      name: "iphone-14",
      /* Chromium avec viewport iPhone 14 (390x844) — pas de webkit
         pour éviter d'avoir à installer un 2e browser. */
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
          "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 " +
          "Mobile/15E148 Safari/604.1",
      },
    },
  ],
});
