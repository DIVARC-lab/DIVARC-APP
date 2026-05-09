import { describe, expect, it } from "vitest";
import { listingFormSchema } from "./listing";

describe("listingFormSchema", () => {
  const valid = {
    title: "Vélo Peugeot vintage",
    description: "Cadre acier, freins remplacés.",
    price_amount: 250,
    price_currency: "EUR",
    category: "vehicules",
    condition: "used",
    location: "Paris 11e",
  };

  it("accepts a fully valid listing payload", () => {
    const result = listingFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects a title under 3 characters", () => {
    const result = listingFormSchema.safeParse({ ...valid, title: "Ok" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/3 caractères/);
    }
  });

  it("rejects a negative price", () => {
    const result = listingFormSchema.safeParse({ ...valid, price_amount: -10 });
    expect(result.success).toBe(false);
  });

  it("rejects an unsupported category", () => {
    const result = listingFormSchema.safeParse({
      ...valid,
      category: "weapons",
    });
    expect(result.success).toBe(false);
  });

  it("transforms an empty description into null", () => {
    const result = listingFormSchema.safeParse({ ...valid, description: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
    }
  });

  it("transforms an empty location into null", () => {
    const result = listingFormSchema.safeParse({ ...valid, location: "   " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.location).toBeNull();
    }
  });

  it("rejects condition outside the allowed enum", () => {
    const result = listingFormSchema.safeParse({
      ...valid,
      condition: "broken",
    });
    expect(result.success).toBe(false);
  });

  it("caps title at 120 characters", () => {
    const longTitle = "a".repeat(121);
    const result = listingFormSchema.safeParse({ ...valid, title: longTitle });
    expect(result.success).toBe(false);
  });

  it("caps description at 4000 characters", () => {
    const longDesc = "a".repeat(4001);
    const result = listingFormSchema.safeParse({
      ...valid,
      description: longDesc,
    });
    expect(result.success).toBe(false);
  });
});
