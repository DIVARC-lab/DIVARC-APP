import type { MutableRefObject, RefCallback, Ref } from "react";

/* mergeRefs — combine plusieurs refs (callback ou object) en une seule
 * ref callback. Pattern standard React utilisé quand un même élément
 * doit être observé par plusieurs hooks (impression + dwell + autres).
 *
 * Usage :
 *   <article ref={mergeRefs(impressionRef, dwellRef)}>...</article>
 */
export function mergeRefs<T>(
  ...refs: Array<Ref<T> | undefined | null>
): RefCallback<T> {
  return (value: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref && typeof ref === "object") {
        (ref as MutableRefObject<T | null>).current = value;
      }
    }
  };
}
