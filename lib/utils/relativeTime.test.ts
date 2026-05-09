import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelative } from "./relativeTime";

describe("formatRelative", () => {
  /* On fige le temps à une date précise pour rendre les tests
     déterministes — sans ça les tests dépendent du moment d'exécution. */
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-09T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'à l'instant' for sub-minute deltas", () => {
    const justNow = new Date("2026-05-09T11:59:30Z").toISOString();
    expect(formatRelative(justNow)).toBe("à l'instant");
  });

  it("formats minutes ago in French", () => {
    const fiveMinAgo = new Date("2026-05-09T11:55:00Z").toISOString();
    /* L'output exact dépend du moteur ICU (« il y a 5 minutes »). On vérifie
       au moins la présence du nombre + de l'unité. */
    const out = formatRelative(fiveMinAgo);
    expect(out).toMatch(/5/);
    expect(out.toLowerCase()).toMatch(/min/);
  });

  it("formats hours ago", () => {
    const threeHoursAgo = new Date("2026-05-09T09:00:00Z").toISOString();
    const out = formatRelative(threeHoursAgo);
    expect(out).toMatch(/3/);
    expect(out.toLowerCase()).toMatch(/h(?:eure)?/);
  });

  it("formats days ago — with numeric:'auto' renders 'avant-hier' at -2j", () => {
    const twoDaysAgo = new Date("2026-05-07T12:00:00Z").toISOString();
    const out = formatRelative(twoDaysAgo);
    /* Intl.RelativeTimeFormat numeric:'auto' renvoie "avant-hier" / "hier"
       pour -2j et -1j. On vérifie le mot "avant-hier" comme attendu en
       français. */
    expect(out.toLowerCase()).toMatch(/avant-hier|2 jours/);
  });

  it("formats days ago — at -3j renders 'il y a 3 jours'", () => {
    const threeDaysAgo = new Date("2026-05-06T12:00:00Z").toISOString();
    const out = formatRelative(threeDaysAgo);
    expect(out).toMatch(/3/);
    expect(out.toLowerCase()).toMatch(/jour/);
  });

  it("falls back to short date for ≥ 7 days", () => {
    const tenDaysAgo = new Date("2026-04-29T12:00:00Z").toISOString();
    const out = formatRelative(tenDaysAgo);
    /* Date format court fr-FR : "29 avr." ou "29 avril". */
    expect(out).toMatch(/29\s+avr/);
  });

  it("returns empty string for invalid input", () => {
    expect(formatRelative("not-a-date")).toBe("");
  });
});
