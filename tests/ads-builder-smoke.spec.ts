import { expect, test } from "@playwright/test";

/* Smoke test du Ads Builder DIVARC V4 — vérifie que les pages clés
 * chargent sans crash et que les composants core sont rendus.
 *
 * Auth dev :
 *   - Se base sur /api/dev/login + TEST_USER_EMAIL + TEST_USER_PASSWORD
 *   - Skip propre si pas de creds (ne casse pas la CI)
 *
 * Lancement :
 *   pnpm exec playwright test tests/ads-builder-smoke.spec.ts
 *
 * Ne crée PAS de campagne réelle (pas de submit final) — on valide
 * uniquement la navigation + rendu UI.
 */

test.describe("Ads Builder V4 smoke", () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      test.skip(true, "TEST_USER_EMAIL/PASSWORD requis pour ce smoke test.");
    }
    /* Auth via endpoint dev. */
    const res = await page.goto("/api/dev/login?next=/ads-manager");
    expect(res?.ok()).toBeTruthy();
  });

  test("dashboard ads-manager affiche les comptes", async ({ page }) => {
    await page.goto("/ads-manager");
    await page.waitForLoadState("networkidle");
    /* La page liste les comptes ou affiche le CTA création. */
    await expect(
      page.locator("text=/Comptes publicitaires|Nouveau compte/i"),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("page nouvelle campagne propose Smart vs Expert", async ({ page }) => {
    /* Nécessite qu'un account existe — on récupère le 1er depuis /ads-manager. */
    await page.goto("/ads-manager");
    await page.waitForLoadState("networkidle");
    const firstAccount = page
      .locator('a[href^="/ads-manager/"]')
      .filter({ hasText: /€|EUR|USD|Solde/i })
      .first();
    if ((await firstAccount.count()) === 0) {
      test.skip(true, "Aucun ad account — créer d'abord un compte.");
    }
    await firstAccount.click();
    await page.waitForLoadState("networkidle");
    /* Click "Nouvelle campagne". */
    await page.getByRole("link", { name: /nouvelle campagne/i }).click();
    await page.waitForLoadState("networkidle");
    /* Mode chooser doit afficher les 2 modes. */
    await expect(page.locator("text=/Smart Campaign|Mode Expert/i")).toHaveCount(
      2,
      { timeout: 10_000 },
    );
  });

  test("Expert mode wizard charge l'étape Objectif", async ({ page }) => {
    await page.goto("/ads-manager");
    await page.waitForLoadState("networkidle");
    const firstAccount = page
      .locator('a[href^="/ads-manager/"]')
      .filter({ hasText: /€|EUR|USD|Solde/i })
      .first();
    if ((await firstAccount.count()) === 0) {
      test.skip(true, "Aucun ad account.");
    }
    const href = await firstAccount.getAttribute("href");
    if (!href) test.skip(true, "Pas de href account.");
    await page.goto(`${href}/campaigns/new?mode=expert`);
    await page.waitForLoadState("networkidle");
    /* Doit afficher la progress bar + au moins le titre objectif. */
    await expect(page.locator("text=/objectif/i").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Website Analyzer page charge", async ({ page }) => {
    await page.goto("/ads-manager");
    await page.waitForLoadState("networkidle");
    const firstAccount = page
      .locator('a[href^="/ads-manager/"]')
      .filter({ hasText: /€|EUR|USD|Solde/i })
      .first();
    if ((await firstAccount.count()) === 0) test.skip(true, "Aucun ad account.");
    const href = await firstAccount.getAttribute("href");
    if (!href) test.skip(true, "Pas de href account.");
    await page.goto(`${href}/analyzer`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=/Analyse|Analyseur|URL/i").first()).toBeVisible(
      { timeout: 10_000 },
    );
  });

  test("Keyword Planner page charge", async ({ page }) => {
    await page.goto("/ads-manager");
    await page.waitForLoadState("networkidle");
    const firstAccount = page
      .locator('a[href^="/ads-manager/"]')
      .filter({ hasText: /€|EUR|USD|Solde/i })
      .first();
    if ((await firstAccount.count()) === 0) test.skip(true, "Aucun ad account.");
    const href = await firstAccount.getAttribute("href");
    if (!href) test.skip(true, "Pas de href account.");
    await page.goto(`${href}/keyword-planner`);
    await page.waitForLoadState("networkidle");
    await expect(
      page.locator("text=/keyword|mots-clés/i").first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
