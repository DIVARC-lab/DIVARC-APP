"use client";

/* Jauge de définition d'audience — style Meta "Audience definition".
 *
 * Affiche un meter horizontal en 3 zones :
 *   trop spécifique (rouge) | parfait (vert) | trop large (amber)
 *
 * Plus l'audience est "good" (entre 10K et 1M users actifs), plus
 * l'aiguille est dans la zone verte.
 */

export function AudienceMeter({
  estimatedSize,
}: {
  estimatedSize: number | null;
}) {
  if (estimatedSize === null) {
    return (
      <div className="rounded-xl bg-bg-soft border border-line p-3">
        <p className="text-[11px] text-night-muted">
          L&apos;estimation s&apos;affichera ici quand tu remplis l&apos;audience.
        </p>
      </div>
    );
  }

  /* < 1k → trop spécifique (k-anonymity), 1k-10M → bon, > 10M → trop large. */
  let zone: "narrow" | "good" | "broad";
  let position: number; // 0-100
  let label: string;
  let advice: string;

  if (estimatedSize < 1000) {
    zone = "narrow";
    position = 8;
    label = "Trop spécifique";
    advice =
      "Élargis ton ciblage (ajoute des intérêts ou des pays) pour atteindre plus de monde.";
  } else if (estimatedSize < 10_000) {
    zone = "narrow";
    position = 25;
    label = "Spécifique";
    advice = "Audience étroite — performant si pertinent, sinon élargis.";
  } else if (estimatedSize < 100_000) {
    zone = "good";
    position = 45;
    label = "Bon équilibre";
    advice = "Audience bien dimensionnée pour la plupart des objectifs.";
  } else if (estimatedSize < 1_000_000) {
    zone = "good";
    position = 65;
    label = "Bon équilibre";
    advice = "Audience large mais ciblée — bonne portée potentielle.";
  } else if (estimatedSize < 10_000_000) {
    zone = "broad";
    position = 80;
    label = "Large";
    advice = "Audience très large — ajoute des intérêts pour cibler mieux.";
  } else {
    zone = "broad";
    position = 95;
    label = "Trop large";
    advice = "Précise davantage tes critères pour un meilleur CTR.";
  }

  const colorClass =
    zone === "narrow"
      ? "bg-red-500"
      : zone === "good"
        ? "bg-emerald-500"
        : "bg-amber-500";
  const labelClass =
    zone === "narrow"
      ? "text-red-700"
      : zone === "good"
        ? "text-emerald-700"
        : "text-amber-700";

  return (
    <div className="rounded-xl bg-white border border-line p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wider font-bold text-night-muted">
          Définition de l&apos;audience
        </p>
        <p className={`text-[12px] font-bold ${labelClass}`}>{label}</p>
      </div>

      {/* Meter avec gradient 3 zones + aiguille */}
      <div className="relative h-2 rounded-full overflow-hidden bg-bg-soft">
        <div className="absolute inset-0 flex">
          <div className="w-1/3 bg-red-200" />
          <div className="w-1/3 bg-emerald-200" />
          <div className="w-1/3 bg-amber-200" />
        </div>
        <div
          className={`absolute top-0 bottom-0 w-1 ${colorClass} rounded-full transition-all duration-500`}
          style={{ left: `${position}%` }}
          aria-hidden
        />
      </div>

      <div className="flex items-baseline justify-between gap-2 text-[11px] text-night-muted">
        <span>Trop spécifique</span>
        <span>Optimal</span>
        <span>Trop large</span>
      </div>

      <p className="text-[12px] text-night-soft leading-snug">{advice}</p>

      <div className="pt-2 border-t border-line flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wider font-bold text-night-muted">
          Reach estimé
        </span>
        <span className="text-[18px] font-bold text-night">
          {formatRange(estimatedSize)}
        </span>
      </div>
    </div>
  );
}

function formatRange(n: number): string {
  if (n < 1000) return `< 1 k`;
  if (n < 10_000) {
    const lower = Math.floor(n / 1000) * 1000;
    return `${(lower / 1000).toFixed(0)}k - ${((lower + 1000) / 1000).toFixed(0)}k`;
  }
  if (n < 100_000) {
    const lower = Math.floor(n / 10_000) * 10_000;
    return `${(lower / 1000).toFixed(0)}k - ${((lower + 10_000) / 1000).toFixed(0)}k`;
  }
  if (n < 1_000_000) {
    const lower = Math.floor(n / 100_000) * 100_000;
    return `${(lower / 1000).toFixed(0)}k - ${((lower + 100_000) / 1000).toFixed(0)}k`;
  }
  return `${(n / 1_000_000).toFixed(1)} M+`;
}
