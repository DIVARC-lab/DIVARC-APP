import { test } from "@playwright/test";
import path from "node:path";

/* Visual check pour DIVARC.
 *
 * Usage :
 *   SCREENSHOT_LABEL=before-postcard pnpm exec playwright test tests/visual-check.spec.ts
 *
 * Captures :
 *   tests/screenshots/feed-{label}.png       — page /feed actuelle (auth requise)
 *   tests/screenshots/target-bold.png        — design cible (HTML statique du handoff)
 *
 * Auth :
 *   Le test login utilise les vars TEST_USER_EMAIL + TEST_USER_PASSWORD si présentes.
 *   Sinon il capture /login pour signaler le blocage.
 */

const LABEL = process.env.SCREENSHOT_LABEL ?? "untitled";
const SCREENSHOT_DIR = "tests/screenshots";

test.describe("Visual check", () => {
  test("capture /feed (current implementation)", async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (email && password) {
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/mot de passe/i).fill(password);
      await page.getByRole("button", { name: /connect/i }).click();
      await page.waitForURL(/\/(feed|dashboard|welcome)/, { timeout: 15_000 });
    }

    await page.goto("/feed");
    /* Si redirect vers /login, on capture quand même pour signaler. */
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `feed-${LABEL}.png`),
      fullPage: true,
    });

    const url = page.url();
    if (url.includes("/login")) {
       
      console.warn(
        `[visual-check] auth bloquée — capture sur ${url}. ` +
          `Ajoute TEST_USER_EMAIL + TEST_USER_PASSWORD pour capturer /feed.`,
      );
    }
  });

  test("capture target design (handoff HTML)", async ({ page }) => {
    /* Le HTML maître est servi en static — utilise file:// directement. */
    const fileUrl = `file://${path.resolve("design_handoff_divarc_refonte/DIVARC Feed Redesign.html")}`;
    await page.goto(fileUrl);
    await page.waitForLoadState("networkidle");
    /* Le HTML contient les 3 viewports côte à côte. On screenshot la zone
       "Bold mobile" (premier iPhone à gauche). */
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "target-bold-full.png"),
      fullPage: true,
    });
  });
});
