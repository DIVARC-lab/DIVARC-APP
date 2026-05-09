"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/ConfirmDialog";

/* Bouton "Supprimer mon profil de recommandation" — RGPD art. 17.
 *
 * Confirmation via useConfirm (ConfirmDialog DIVARC-style, pas confirm()
 * natif). DELETE /api/me/algorithm-data wipe events + profile + settings.
 *
 * Au succès, refresh la page pour re-fetch un état vide. */
export function DeleteProfileButton() {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  async function handleDelete() {
    const ok = await confirm({
      title: "Supprimer mon profil d'intérêts ?",
      description:
        "Toutes les données utilisées pour personnaliser ton feed seront supprimées : interactions trackées, profil agrégé, paramètres. Un nouveau profil se reconstruira à partir de tes futures interactions. Cette action est définitive.",
      confirmLabel: "Supprimer mes données",
      variant: "destructive",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        const response = await fetch("/api/me/algorithm-data", {
          method: "DELETE",
        });
        if (!response.ok) {
          toast.error("Suppression impossible. Réessaie.");
          return;
        }
        toast.success("Profil supprimé. Tes futures interactions le reconstruiront.");
        router.refresh();
      } catch {
        toast.error("Erreur réseau. Réessaie.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="w-full flex items-center gap-3 text-left transition-colors group disabled:opacity-60"
    >
      {pending ? (
        <Loader2
          className="w-5 h-5 text-red-600 animate-spin"
          aria-hidden
        />
      ) : (
        <Trash2 className="w-5 h-5 text-red-600" aria-hidden />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-600 group-hover:text-red-700">
          Supprimer mon profil de recommandation
        </p>
        <p className="text-xs text-muted">
          RGPD art. 17 — droit à l&apos;oubli
        </p>
      </div>
      <span className="text-red-600">→</span>
    </button>
  );
}
