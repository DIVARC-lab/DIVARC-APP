// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* On mocke `sonner` avant l'import du SUT — sinon `toast.success` /
 * `toast.error` lèvent (sonner attend un Toaster monté). */
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from "sonner";
import { runAction } from "./clientAction";

describe("runAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls onSuccess and shows success toast for { ok: true } result", async () => {
    const onSuccess = vi.fn();
    const result = await runAction(
      async () => ({ ok: true, foo: "bar" }) as const,
      { successMessage: "Done!", onSuccess },
    );
    expect(result).toEqual({ ok: true, foo: "bar" });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Done!");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("supports a function as successMessage receiving the result", async () => {
    type R = { ok: true; offerId: string };
    await runAction(
      async (): Promise<R> => ({ ok: true, offerId: "abc-123" }),
      { successMessage: (r) => `Offer ${r.offerId} sent` },
    );
    expect(toast.success).toHaveBeenCalledWith("Offer abc-123 sent");
  });

  it("calls onError and shows the result.error for { ok: false }", async () => {
    const onError = vi.fn();
    const result = await runAction(
      async () => ({ ok: false, error: "Solde insuffisant." }) as const,
      { onError },
    );
    expect(result).toEqual({ ok: false, error: "Solde insuffisant." });
    expect(onError).toHaveBeenCalledWith("Solde insuffisant.");
    expect(toast.error).toHaveBeenCalledWith("Solde insuffisant.");
  });

  it("uses errorMessage override over result.error", async () => {
    await runAction(async () => ({ ok: false, error: "Server-side msg" }) as const, {
      errorMessage: "Custom override",
    });
    expect(toast.error).toHaveBeenCalledWith("Custom override");
  });

  it("respects silent: true and does not toast", async () => {
    await runAction(async () => ({ ok: false, error: "fail" }) as const, {
      silent: true,
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("catches network errors and shows 'Connexion interrompue'", async () => {
    const result = await runAction(async () => {
      throw new Error("Failed to fetch");
    });
    expect(result).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("Connexion interrompue. Réessaie.");
  });

  it("catches unknown errors and shows generic message", async () => {
    await runAction(async () => {
      throw new Error("RangeError-like");
    });
    expect(toast.error).toHaveBeenCalledWith(
      "Une erreur inattendue est survenue.",
    );
  });

  it("forwards the action's return value when ok=true", async () => {
    const result = await runAction(
      async () => ({ ok: true, count: 42 }) as const,
    );
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.count).toBe(42);
    }
  });
});
