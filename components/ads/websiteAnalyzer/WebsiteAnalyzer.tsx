"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { WebsiteAnalysisResult } from "@/lib/database.types";
import { AnalysisProgress } from "./AnalysisProgress";
import { AnalysisResults } from "./AnalysisResults";
import { UrlInput } from "./UrlInput";

/* Composant orchestrateur du Website Analyzer.
 *
 * State machine :
 *   idle      → UrlInput
 *   analyzing → AnalysisProgress (animation 7 étapes)
 *   completed → AnalysisResults
 *   error     → message + retry button
 *
 * L'API call POST /api/ads/website-analyzer est synchrone (~30-50s).
 * Pendant l'attente, on affiche AnalysisProgress qui simule la
 * progression visuelle. Si l'API répond avant la fin de l'animation,
 * on bascule directement sur les résultats.
 */

type State =
  | { kind: "idle" }
  | { kind: "analyzing"; url: string }
  | {
      kind: "completed";
      analysisId: string;
      result: WebsiteAnalysisResult;
      cached: boolean;
    }
  | { kind: "error"; message: string; url?: string };

export function WebsiteAnalyzer({ accountId }: { accountId: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function startAnalysis(url: string) {
    setState({ kind: "analyzing", url });

    try {
      const res = await fetch("/api/ads/website-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          ad_account_id: accountId,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.status === 429) {
        setState({
          kind: "error",
          message:
            json.error ??
            "Trop d'analyses récentes. Réessaie dans une heure.",
          url,
        });
        return;
      }
      if (res.status === 502) {
        setState({
          kind: "error",
          message:
            json.error ??
            "L'analyse a échoué — vérifie que ton site est en ligne et accessible.",
          url,
        });
        return;
      }
      if (!res.ok) {
        setState({
          kind: "error",
          message: json.error ?? "Erreur inattendue.",
          url,
        });
        return;
      }

      if (json.cached) {
        toast.success("Analyse récupérée du cache (mise à jour < 30j).");
      } else {
        toast.success("Analyse terminée !");
      }

      setState({
        kind: "completed",
        analysisId: json.analysis_id,
        result: json.result,
        cached: !!json.cached,
      });
    } catch (err) {
      console.error("[WebsiteAnalyzer] fetch failed:", err);
      setState({
        kind: "error",
        message:
          "Erreur réseau. Vérifie ta connexion et réessaie. Si le problème persiste, contacte ads@divarc.app.",
        url,
      });
    }
  }

  return (
    <div className="min-h-[600px]">
      {state.kind === "idle" ? (
        <UrlInput onSubmit={startAnalysis} pending={false} />
      ) : null}

      {state.kind === "analyzing" ? (
        <AnalysisProgress url={state.url} />
      ) : null}

      {state.kind === "completed" ? (
        <AnalysisResults
          analysisId={state.analysisId}
          accountId={accountId}
          result={state.result}
        />
      ) : null}

      {state.kind === "error" ? (
        <div className="max-w-md mx-auto text-center pt-12">
          <span
            aria-hidden
            className="inline-flex w-14 h-14 rounded-2xl bg-red-50 text-red-600 items-center justify-center mb-3"
          >
            <AlertTriangle className="w-7 h-7" aria-hidden />
          </span>
          <h2 className="text-[20px] font-semibold text-night mb-2">
            L&apos;analyse n&apos;a pas pu aboutir
          </h2>
          <p className="text-[13px] text-night-muted leading-relaxed mb-4">
            {state.message}
          </p>
          <button
            type="button"
            onClick={() => setState({ kind: "idle" })}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-night text-cream text-[13px] font-semibold hover:bg-night/90"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden />
            Réessayer
          </button>
        </div>
      ) : null}
    </div>
  );
}
