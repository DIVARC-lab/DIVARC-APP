"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AppealForm({ actionId }: { actionId: string }) {
  const router = useRouter();
  const [explanation, setExplanation] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (explanation.trim().length < 20) {
      toast.error(
        "Détaille un peu plus ton recours (au moins 20 caractères).",
      );
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/moderation/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_id: actionId,
          user_explanation: explanation.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.info(json.error ?? "Tu as déjà un recours en cours.");
        router.push("/settings/moderation");
        return;
      }
      if (!res.ok) {
        toast.error(json.error ?? "Impossible d'envoyer le recours.");
        return;
      }
      toast.success("Recours enregistré. Notre équipe va l'examiner.");
      router.push("/settings/moderation");
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-line p-4 space-y-3">
      <label
        htmlFor="explanation"
        className="block text-[13px] font-semibold text-night"
      >
        Pourquoi cette décision est-elle injuste ?
      </label>
      <textarea
        id="explanation"
        rows={6}
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
        maxLength={2000}
        placeholder="Décris le contexte, ton intention, ce qui a pu être mal interprété…"
        className="w-full px-3.5 py-3 rounded-2xl border border-line bg-white text-[14px] text-night focus:outline-none focus:border-night resize-none"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-night-muted">
          {explanation.length} / 2000 caractères
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={pending || explanation.trim().length < 20}
          className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-night text-cream text-[13px] font-semibold disabled:opacity-50 hover:bg-night/90"
        >
          {pending ? "Envoi…" : "Envoyer le recours"}
        </button>
      </div>
    </div>
  );
}
