"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
  Shield,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";

/* PixelHelperButton — bouton de test du DIVARC Pixel sur un site externe.
 * Ouvre une modal qui crawl l'URL fournie et détecte :
 *   - Si le pixel est installé (init avec UUID matching)
 *   - Quels events sont trackés
 *   - Si chargé en async, dans head ou body
 *   - Warnings de bonne pratique
 */

type TestResult = {
  installed: boolean;
  pixel_id_found: string | null;
  pixel_id_match: boolean;
  events_detected: string[];
  loads_async: boolean;
  placement: "head" | "body" | "unknown";
  warnings: string[];
  html_excerpt: string;
  fetched_at: string;
};

export function PixelHelperButton({
  pixelId,
  defaultDomain,
}: {
  pixelId: string;
  defaultDomain?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-line text-[11.5px] font-bold text-night hover:bg-bg-soft"
      >
        <Search className="w-[12px] h-[12px]" aria-hidden />
        Tester le pixel
      </button>
      {open ? (
        <PixelHelperModal
          pixelId={pixelId}
          defaultDomain={defaultDomain}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function PixelHelperModal({
  pixelId,
  defaultDomain,
  onClose,
}: {
  pixelId: string;
  defaultDomain?: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(
    defaultDomain ? `https://${defaultDomain}` : "",
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const test = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ads/pixels/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixel_id: pixelId, url }),
      });
      const json = (await res.json().catch(() => ({}))) as
        | TestResult
        | { error: string };
      if ("error" in json) {
        setError(json.error);
        return;
      }
      setResult(json);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-cream rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <header className="flex items-center justify-between px-4 py-3 border-b border-line">
          <p className="text-[14px] font-bold text-night flex items-center gap-1.5">
            <Shield className="w-[14px] h-[14px] text-gold-deep" aria-hidden />
            Pixel Helper
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-night-muted hover:text-night"
            aria-label="Fermer"
          >
            <X className="w-[16px] h-[16px]" aria-hidden />
          </button>
        </header>

        <div className="px-4 py-3 space-y-3 overflow-y-auto">
          <p className="text-[11.5px] text-night-soft leading-snug">
            Renseigne l&apos;URL d&apos;une page de ton site où le pixel{" "}
            <span className="font-mono">{pixelId.slice(0, 8)}…</span> est censé
            être installé. On va crawler la page (5 MB max, 15s timeout) pour
            vérifier l&apos;installation.
          </p>

          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void test();
                }
              }}
              placeholder="https://monsite.com"
              className="flex-1 px-3 py-2 rounded-lg border border-line bg-white text-[12.5px] font-mono"
            />
            <button
              type="button"
              onClick={test}
              disabled={loading || !url.trim()}
              className="px-4 py-2 rounded-lg bg-night text-cream text-[12px] font-bold disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              {loading ? (
                <Loader2 className="w-[14px] h-[14px] animate-spin" aria-hidden />
              ) : (
                <Search className="w-[14px] h-[14px]" aria-hidden />
              )}
              Tester
            </button>
          </div>

          {error ? (
            <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-[12px] text-red-800 inline-flex items-start gap-2">
              <AlertTriangle
                className="w-[14px] h-[14px] mt-0.5 shrink-0"
                aria-hidden
              />
              <span>{error}</span>
            </div>
          ) : null}

          {result ? (
            <div className="space-y-3">
              {/* Installed status. */}
              <div
                className={`rounded-xl border p-3 flex items-start gap-3 ${
                  result.installed && result.pixel_id_match
                    ? "bg-emerald-50 border-emerald-200"
                    : result.installed
                      ? "bg-amber-50 border-amber-200"
                      : "bg-red-50 border-red-200"
                }`}
              >
                {result.installed && result.pixel_id_match ? (
                  <CheckCircle2
                    className="w-[20px] h-[20px] text-emerald-600 shrink-0"
                    aria-hidden
                  />
                ) : result.installed ? (
                  <AlertTriangle
                    className="w-[20px] h-[20px] text-amber-600 shrink-0"
                    aria-hidden
                  />
                ) : (
                  <XCircle
                    className="w-[20px] h-[20px] text-red-600 shrink-0"
                    aria-hidden
                  />
                )}
                <div>
                  <p
                    className={`text-[13px] font-bold ${
                      result.installed && result.pixel_id_match
                        ? "text-emerald-800"
                        : result.installed
                          ? "text-amber-900"
                          : "text-red-800"
                    }`}
                  >
                    {result.installed && result.pixel_id_match
                      ? "Pixel correctement installé"
                      : result.installed
                        ? "Pixel installé avec un autre ID"
                        : "Pixel non détecté"}
                  </p>
                  {result.pixel_id_found ? (
                    <p className="text-[11.5px] mt-0.5 font-mono text-night-soft">
                      ID trouvé : {result.pixel_id_found}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Details grid. */}
              <div className="grid grid-cols-2 gap-2">
                <Detail label="Placement">
                  {result.placement === "head"
                    ? "<head>"
                    : result.placement === "body"
                      ? "<body>"
                      : "—"}
                </Detail>
                <Detail label="Async loading">
                  {result.loads_async ? "Oui" : "Non"}
                </Detail>
                <Detail label="Events détectés" full>
                  {result.events_detected.length === 0
                    ? "Aucun"
                    : result.events_detected.map((e) => (
                        <span
                          key={e}
                          className="inline-block mr-1 mb-1 px-2 py-0.5 rounded bg-night text-cream text-[10px] font-mono"
                        >
                          {e}
                        </span>
                      ))}
                </Detail>
              </div>

              {/* Warnings. */}
              {result.warnings.length > 0 ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <p className="text-[11.5px] font-bold text-amber-900 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-[12px] h-[12px]" aria-hidden />
                    Recommandations
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-900">
                    {result.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* HTML excerpt. */}
              {result.html_excerpt ? (
                <details className="rounded-xl bg-night text-cream overflow-hidden">
                  <summary className="px-3 py-2 text-[11px] uppercase tracking-wider font-bold cursor-pointer hover:bg-cream/5">
                    Extrait HTML détecté
                  </summary>
                  <pre className="px-3 py-2 text-[10.5px] font-mono whitespace-pre-wrap break-all">
                    {result.html_excerpt}
                  </pre>
                </details>
              ) : null}

              {!result.installed ? (
                <div className="rounded-xl bg-bg-soft border border-line p-3 text-[11.5px] text-night-soft leading-snug">
                  <p className="font-bold text-night mb-1">
                    Le pixel n&apos;est pas détecté. Checklist :
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>
                      Le snippet est bien dans le <code>&lt;head&gt;</code>
                      (pas après <code>&lt;/body&gt;</code>) ?
                    </li>
                    <li>
                      L&apos;ID utilisé est bien{" "}
                      <code className="font-mono">{pixelId}</code> ?
                    </li>
                    <li>
                      La page n&apos;est pas derrière un{" "}
                      <code>robots.txt</code> ou auth basic ?
                    </li>
                    <li>
                      Le bandeau de consentement laisse-t-il charger le
                      script (RGPD opt-in) ?
                    </li>
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div
      className={`rounded-xl bg-white border border-line p-2.5 ${
        full ? "col-span-2" : ""
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider font-bold text-night-muted">
        {label}
      </p>
      <div className="text-[12.5px] font-semibold text-night mt-0.5">
        {children}
      </div>
    </div>
  );
}
