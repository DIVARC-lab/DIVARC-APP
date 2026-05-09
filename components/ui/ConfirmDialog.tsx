"use client";

import { AlertTriangle, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export type ConfirmOptions = {
  /** Titre du dialog (Instrument Serif italic). */
  title: string;
  /** Body explicatif. */
  description?: string;
  /** Label du bouton de confirmation. Défaut "Confirmer". */
  confirmLabel?: string;
  /** Label du bouton d'annulation. Défaut "Annuler". */
  cancelLabel?: string;
  /** Variante du bouton confirm. `destructive` rouge pour suppressions. */
  variant?: "default" | "destructive";
};

type ConfirmRequest = ConfirmOptions & {
  resolve: (confirmed: boolean) => void;
};

type ConfirmContextValue = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/* Provider à monter haut dans le layout (typiquement (app)/layout.tsx).
 * Expose un hook useConfirm() qui renvoie une fonction async — usage :
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "...", variant: "destructive" }))) return;
 *
 * Pattern Promise-based, plus propre que window.confirm() natif :
 *  - cohérent avec la grammaire Bold (pas de modal système OS)
 *  - ne bloque pas le main thread
 *  - une seule instance dans l'app */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  const confirm = useCallback<ConfirmContextValue>((opts) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ ...opts, resolve });
    });
  }, []);

  const handleClose = useCallback(
    (confirmed: boolean) => {
      if (!request) return;
      request.resolve(confirmed);
      setRequest(null);
    },
    [request],
  );

  useEffect(() => {
    if (!request) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose(false);
      if (event.key === "Enter") handleClose(true);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [request, handleClose]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-night/40 backdrop-blur-sm"
          onClick={() => handleClose(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-bg border border-line shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)]"
          >
            <div className="px-6 pt-6 pb-3">
              <div className="flex items-start gap-4">
                <div
                  aria-hidden
                  className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                    request.variant === "destructive"
                      ? "bg-red-50 text-red-600"
                      : "bg-gold/15 text-gold-deep",
                  )}
                >
                  <AlertTriangle className="w-5 h-5" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <h2
                    id="confirm-title"
                    className="font-display italic text-xl text-night leading-tight"
                  >
                    {request.title}
                  </h2>
                  {request.description ? (
                    <p className="mt-2 text-sm text-night-soft leading-relaxed">
                      {request.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  aria-label="Fermer"
                  className="w-9 h-9 rounded-full hover:bg-night/5 text-night-muted hover:text-night flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </div>

            <footer className="flex items-center justify-end gap-2 px-6 pb-6 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleClose(false)}
              >
                {request.cancelLabel ?? "Annuler"}
              </Button>
              <Button
                type="button"
                variant={
                  request.variant === "destructive" ? "danger" : "primary"
                }
                onClick={() => handleClose(true)}
                autoFocus
              >
                {request.confirmLabel ?? "Confirmer"}
              </Button>
            </footer>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within <ConfirmProvider>");
  }
  return ctx;
}
