import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FeedMode } from "@/lib/database.types";
import { FeedSettingsForm } from "./_components/FeedSettingsForm";

export const metadata = {
  title: "Réglages du feed — DIVARC",
  description:
    "Active ou désactive les garde-fous anti-toxicité de ton feed. Tu décides.",
};

export default async function FeedSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("user_algorithm_settings")
    .select(
      "anti_doomscroll_enabled, author_diversity_enabled, signal_filter_enabled, default_feed_mode",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const initial = {
    anti_doomscroll_enabled: settings?.anti_doomscroll_enabled ?? true,
    author_diversity_enabled: settings?.author_diversity_enabled ?? true,
    signal_filter_enabled: settings?.signal_filter_enabled ?? true,
    default_feed_mode: (settings?.default_feed_mode ?? "fresh") as FeedMode,
  };

  return (
    <div className="min-h-[100dvh] bg-bg-soft">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-7 py-8 pb-[max(calc(64px+env(safe-area-inset-bottom)),96px)] space-y-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-[13px] text-night-muted hover:text-night"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Réglages
        </Link>

        <header className="space-y-2">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
            · Réglages du feed
          </p>
          <h1 className="font-display text-[36px] sm:text-[44px] leading-[1.05] tracking-[-0.02em] text-night text-balance">
            Tu décides
            <br />
            <em className="italic text-gold-deep">ce que tu vois</em>.
          </h1>
          <p className="text-[14px] text-night-soft leading-relaxed max-w-[480px]">
            DIVARC active 3 garde-fous par défaut pour protéger ton attention.
            Tu peux les désactiver à tout moment. Aucune dégradation cachée si
            tu le fais.
          </p>
          <Link
            href="/about/feed-algorithm"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-night-dim hover:text-gold-deep transition-colors"
          >
            <Eye className="w-3 h-3" aria-hidden />
            Voir la page transparence complète
          </Link>
        </header>

        <FeedSettingsForm initial={initial} />
      </div>
    </div>
  );
}
