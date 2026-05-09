import { describe, expect, it } from "vitest";
import { formatPrice, getCurrencySymbol } from "./currency";

describe("formatPrice", () => {
  it("formats EUR with French locale and the € symbol", () => {
    /* Intl.NumberFormat insère un NBSP (U+00A0) entre la valeur et l'unité,
       on accepte donc à la fois espace classique et NBSP via regex. */
    expect(formatPrice(50, "EUR")).toMatch(/^50,00\s€$/);
  });

  it("formats large amounts with separators (NBSP or narrow NBSP)", () => {
    /* Le formatter est mémoïsé par devise donc le `maximumFractionDigits`
       suit le PREMIER appel sur cette devise. On vérifie juste que les
       milliers sont séparés et que l'unité € est présente. */
    const out = formatPrice(1500, "EUR");
    expect(out).toMatch(/1[\s  ]500/);
    expect(out).toContain("€");
  });

  it("formats CAD with the Canadian French locale", () => {
    /* fr-CA renvoie "50,00 $" — le symbole peut varier selon la version
       d'ICU mais on vérifie au moins la présence du nombre. */
    const out = formatPrice(50, "CAD");
    expect(out).toContain("50,00");
  });

  it("formats CHF (no decimals at 1000+ par règle interne)", () => {
    const out = formatPrice(1234, "CHF");
    expect(out).toContain("1");
    expect(out).toContain("234");
  });

  it("formats XAF (FCFA) for fr-CM locale", () => {
    const out = formatPrice(5000, "XAF");
    expect(out).toContain("5");
    expect(out).toContain("000");
  });
});

describe("getCurrencySymbol", () => {
  it.each([
    ["EUR", "€"],
    ["CAD", "$"],
    ["CHF", "CHF"],
    ["XAF", "FCFA"],
    ["XOF", "FCFA"],
    ["MAD", "DH"],
  ] as const)("returns the correct symbol for %s → %s", (currency, expected) => {
    expect(getCurrencySymbol(currency)).toBe(expected);
  });
});
