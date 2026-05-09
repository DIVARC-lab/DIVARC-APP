import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn (class merging)", () => {
  it("merges multiple classes into a single string", () => {
    expect(cn("p-4", "text-sm")).toBe("p-4 text-sm");
  });

  it("filters out falsy values", () => {
    expect(cn("p-4", false, null, undefined, "text-sm")).toBe("p-4 text-sm");
  });

  it("supports conditional objects via clsx", () => {
    expect(cn("p-4", { "bg-night": true, "bg-cream": false })).toBe(
      "p-4 bg-night",
    );
  });

  it("merges Tailwind conflicts via twMerge — last one wins", () => {
    /* twMerge doit garder uniquement le dernier p-* qui apparaît. */
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm text-night", "text-base")).toBe("text-night text-base");
  });

  it("handles arrays of classes", () => {
    expect(cn(["p-4", "text-sm"], "rounded-xl")).toBe(
      "p-4 text-sm rounded-xl",
    );
  });
});
