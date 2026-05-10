"use client";

import { Globe, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";

/* État 1 du WebsiteAnalyzer — input URL + CTA "Analyser avec l'IA". */

export function UrlInput({
  onSubmit,
  pending,
}: {
  onSubmit: (url: string) => void;
  pending: boolean;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let normalized = url.trim();
    if (!normalized) {
      setError("Entre l'URL de ton site web.");
      return;
    }
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }
    try {
      const u = new URL(normalized);
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        setError("URL invalide.");
        return;
      }
    } catch {
      setError("URL invalide.");
      return;
    }
    setError(null);
    onSubmit(normalized);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <span
          aria-hidden
          className="inline-flex w-16 h-16 rounded-2xl bg-gold/15 text-gold-deep items-center justify-center mb-4"
        >
          <Wand2 className="w-8 h-8" aria-hidden />
        </span>
        <h2 className="font-display text-[32px] sm:text-[40px] leading-[1.05] tracking-[-0.02em] text-night">
          Crée ta campagne avec{" "}
          <em className="italic text-gold-deep">l&apos;IA</em>
        </h2>
        <p className="mt-3 text-[14px] text-night-soft max-w-lg mx-auto leading-relaxed">
          Colle l&apos;URL de ton site web. DIVARC analyse ton business et
          propose automatiquement <strong>ton audience cible</strong>,{" "}
          <strong>tes mots-clés</strong>, <strong>tes visuels</strong>,{" "}
          <strong>tes textes d&apos;annonce</strong> et{" "}
          <strong>ton budget optimal</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Globe
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-night-muted"
            aria-hidden
          />
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            disabled={pending}
            placeholder="https://monsite.fr"
            autoFocus
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-line bg-white text-[15px] text-night placeholder:text-night-muted focus:outline-none focus:border-night transition-colors disabled:opacity-50"
          />
        </div>
        {error ? (
          <p className="text-[12.5px] text-red-700 px-2">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending || url.trim().length === 0}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-night text-cream text-[14px] font-semibold disabled:opacity-50 hover:bg-night/90 shadow-soft"
        >
          <Sparkles className="w-4 h-4" aria-hidden />
          Analyser avec l&apos;IA
        </button>
      </form>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Hint
          icon="🔍"
          title="Analyse complète"
          desc="Crawl + extraction structurée + analyse IA en ~40s"
        />
        <Hint
          icon="✨"
          title="Smart Campaign"
          desc="Lance ta campagne en 1 clic, validée par l'IA"
        />
        <Hint
          icon="🎯"
          title="Mode Expert"
          desc="Personnalise tout dans le builder avancé"
        />
      </div>

      <p className="mt-6 text-center text-[11.5px] text-night-muted">
        DIVARC respecte ton site (robots.txt + politesse 200ms entre les
        requêtes). Aucun changement n&apos;est fait sur ton site.
      </p>
    </div>
  );
}

function Hint({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-line p-3.5">
      <p className="text-[20px] mb-1" aria-hidden>
        {icon}
      </p>
      <p className="text-[12.5px] font-semibold text-night">{title}</p>
      <p className="text-[11px] text-night-muted leading-snug mt-0.5">
        {desc}
      </p>
    </div>
  );
}
