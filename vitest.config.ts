import path from "node:path";
import { defineConfig } from "vitest/config";

/* Vitest config DIVARC — focus sur la logique métier pure (validations
 * Zod, helpers, hooks) côté serveur et client. Les tests d'intégration
 * Supabase ne sont pas couverts ici (seraient faits via Playwright +
 * une instance test). */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    include: [
      "lib/**/*.test.ts",
      "lib/**/*.test.tsx",
      "components/**/*.test.tsx",
    ],
    exclude: ["node_modules", ".next", "tests/**"],
    globals: true,
  },
});
