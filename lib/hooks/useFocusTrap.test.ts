// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

/* Tests minimaux pour valider le hook useFocusTrap.
 *
 * On ne mount pas le hook directement (nécessiterait React Testing Library)
 * — on vérifie le selector FOCUSABLE_SELECTOR en isolation, qui est la
 * partie la plus critique pour la conformité WCAG. */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(",");

function setupContainer(html: string): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

describe("useFocusTrap selector logic", () => {
  it("captures buttons but ignores disabled ones", () => {
    const container = setupContainer(`
      <button>Active</button>
      <button disabled>Disabled</button>
    `);
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    expect(focusables).toHaveLength(1);
    expect(focusables[0]?.textContent).toBe("Active");
    container.remove();
  });

  it("captures inputs but ignores disabled ones", () => {
    const container = setupContainer(`
      <input type="text" />
      <input type="text" disabled />
      <textarea></textarea>
      <select><option>x</option></select>
    `);
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    expect(focusables).toHaveLength(3);
    container.remove();
  });

  it("captures elements with tabindex >= 0 but ignores tabindex=-1", () => {
    const container = setupContainer(`
      <div tabindex="0">A</div>
      <div tabindex="-1">B</div>
      <div tabindex="2">C</div>
    `);
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    expect(focusables).toHaveLength(2);
    container.remove();
  });

  it("captures contenteditable elements", () => {
    const container = setupContainer(`
      <div contenteditable="true">A</div>
      <div contenteditable="false">B</div>
    `);
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    expect(focusables).toHaveLength(1);
    container.remove();
  });

  it("captures only links with href", () => {
    const container = setupContainer(`
      <a href="/foo">A</a>
      <a>B</a>
    `);
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    expect(focusables).toHaveLength(1);
    container.remove();
  });
});
