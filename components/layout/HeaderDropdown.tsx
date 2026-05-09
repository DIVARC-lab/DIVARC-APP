"use client";

import {
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/* HeaderDropdown — wrapper générique pour les 4 dropdowns du header
 * (Notifs / Messages / Profile / MenuGrid).
 *
 * Stack : @floating-ui/react pour positionnement intelligent (flip si pas
 * de place en bas, shift si déborde du viewport, ancrage au trigger).
 *
 * API :
 *  - `trigger` est rendu par le caller (souvent un bouton rond)
 *  - `children` = contenu du dropdown
 *  - L'état open/close est interne (pattern Radix-like). Si besoin
 *    contrôlé, exposer open/onOpenChange en props plus tard.
 *
 * Animation : opacity + translateY -8px → 0 sur 150ms.
 *
 * Fermeture : clic outside (useDismiss), Escape (useDismiss), sélection
 * d'un item dans le contenu (le caller gère via onSelect ou close).
 */

type HeaderDropdownProps = {
  /** Le bouton trigger (ex : icon button rond). Reçoit ref + listeners. */
  renderTrigger: (props: {
    ref: (el: HTMLElement | null) => void;
    open: boolean;
    triggerProps: React.ButtonHTMLAttributes<HTMLButtonElement>;
  }) => React.ReactNode;
  /** Contenu du dropdown. Reçoit `close` pour fermer manuellement. */
  children: (props: { close: () => void }) => React.ReactNode;
  /** Largeur du dropdown en px. Défaut 360. */
  width?: number;
  /** Alignement du dropdown par rapport au trigger. Défaut "end" (right-aligned). */
  align?: "start" | "end";
};

export function HeaderDropdown({
  renderTrigger,
  children,
  width = 360,
  align = "end",
}: HeaderDropdownProps) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: align === "end" ? "bottom-end" : "bottom-start",
    middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context, { outsidePress: true });
  const role = useRole(context, { role: "menu" });
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const close = () => setOpen(false);

  return (
    <>
      {renderTrigger({
        ref: refs.setReference,
        open,
        triggerProps: getReferenceProps() as React.ButtonHTMLAttributes<HTMLButtonElement>,
      })}
      {open ? (
        <div
          ref={refs.setFloating}
          style={{ ...floatingStyles, width }}
          {...getFloatingProps()}
          className={cn(
            "z-50 max-h-[80vh] overflow-hidden rounded-2xl bg-surface border border-line shadow-[0_24px_60px_-20px_rgba(10,31,68,0.45)]",
            /* Animation simple via Tailwind transitions natives ; pour une
               anim plus fluide, motion serait préférable mais on garde
               léger ici. */
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150",
          )}
        >
          {children({ close })}
        </div>
      ) : null}
    </>
  );
}
