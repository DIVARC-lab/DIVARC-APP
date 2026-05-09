"use client";

import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

/* Refonte audit S5 (handoff feed-profile L40-43) — top bar flottante
 * sur le cover navy : back (history.back si possible, sinon /feed) + more
 * (stub).
 *
 * Glass : w-9 h-9 r-full bg cream/15 backdrop-blur border cream/20 cream icon.
 */
export function ProfileTopBar() {
  const router = useRouter();

  function handleBack() {
    /* Pas de window.history.length fiable cross-browser ; on tente
       router.back() et fallback /feed si on est landed direct. */
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/feed");
    }
  }

  return (
    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
      <button
        type="button"
        onClick={handleBack}
        aria-label="Retour"
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,248,232,0.15)] backdrop-blur-md border border-[rgba(255,248,232,0.2)] text-cream hover:bg-[rgba(255,248,232,0.25)] transition-colors"
      >
        <ArrowLeft className="w-[15px] h-[15px]" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Plus d'options"
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,248,232,0.15)] backdrop-blur-md border border-[rgba(255,248,232,0.2)] text-cream hover:bg-[rgba(255,248,232,0.25)] transition-colors"
      >
        <MoreHorizontal className="w-[15px] h-[15px]" aria-hidden />
      </button>
    </div>
  );
}
