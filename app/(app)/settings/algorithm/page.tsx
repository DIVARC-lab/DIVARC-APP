import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Clock,
  Download,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { createClient } from "@/lib/supabase/server";
import { AlgorithmSettingsForm } from "./AlgorithmSettingsForm";
import { DeleteProfileButton } from "./DeleteProfileButton";

export const metadata = {
  title: "Mes recommandations",
};

/* Page /settings/algorithm — transparence + contrôle utilisateur sur le
 * système de recommandation. Conformité RGPD/DSA :
 *  - Toggles de consentement granulaires (RGPD art. 7)
 *  - Mode chronologique strict (DSA art. 38, exempt mais implémenté)
 *  - Export du profil d'intérêts (RGPD art. 15)
 *  - Suppression complète du profil (RGPD art. 17)
 *  - Liste des topics détectés + bouton retirer (transparence)
 */
export default async function AlgorithmSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  /* Lecture parallèle settings + profile pour pré-remplir la page. */
  const [{ data: settings }, { data: profile }] = await Promise.all([
    supabase
      .from("user_algorithm_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_interest_profiles")
      .select("topic_affinity, events_processed_count, last_updated")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  /* Top 20 topics depuis topic_affinity (vide en V1, sera rempli quand
     on ajoutera l'indexation contenu). */
  const topicAffinity = (profile?.topic_affinity ?? {}) as Record<
    string,
    number
  >;
  const topTopics = Object.entries(topicAffinity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20);

  return (
    <div className="bg-bg-soft min-h-screen pb-24">
      <div className="mx-auto w-full max-w-2xl">
        <header className="px-5 sm:px-8 pt-8 pb-6">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
          >
            <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
            Paramètres
          </Link>
          <KickerLabel>· Recommandations & algorithme</KickerLabel>
          <DisplayHeading
            size="lg"
            className="mt-2 !leading-[1.05] !text-[36px] sm:!text-[44px]"
          >
            Tu décides ce que tu vois.
          </DisplayHeading>
          <p className="mt-3 text-[14px] text-night-soft leading-relaxed">
            DIVARC adapte ton feed à tes intérêts. Tu gardes le contrôle :
            désactive la personnalisation, vois en ordre chronologique, ou
            efface ton profil quand tu veux.
          </p>
        </header>

        {/* Lien transparence DSA art. 27 — détaille les critères du ranker
            avec leurs poids réels + agrégats personnels. */}
        <section className="px-5 sm:px-8 pb-4">
          <Link
            href="/settings/algorithm/transparency"
            className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white border border-line hover:bg-bg-soft transition-colors"
          >
            <span
              aria-hidden
              className="w-10 h-10 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
            >
              <ScrollText className="w-5 h-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-night">
                Comment ton feed est trié
              </p>
              <p className="text-[12px] text-night-muted">
                Critères, poids, garde-fous · transparence DSA art. 27
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-night-dim" aria-hidden />
          </Link>
        </section>

        {/* Stats du profil actuel */}
        {profile ? (
          <section className="px-5 sm:px-8 pb-4">
            <div className="rounded-2xl bg-white border border-line p-4 flex items-center gap-3">
              <span
                aria-hidden
                className="w-10 h-10 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
              >
                <BarChart3 className="w-5 h-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 text-sm text-night-soft">
                <p>
                  <strong className="text-night">
                    {profile.events_processed_count ?? 0}
                  </strong>{" "}
                  interactions analysées
                </p>
                {profile.last_updated ? (
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" aria-hidden />
                    Mis à jour {new Date(profile.last_updated).toLocaleDateString("fr-FR")}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* Form interactif (toggles, etc.) */}
        <AlgorithmSettingsForm
          initialSettings={
            settings ?? {
              user_id: user.id,
              chronological_mode: false,
              personalization_consent: false,
              location_consent: false,
              contacts_consent: false,
              ads_consent: false,
              consent_timestamp: null,
              hidden_topics: [],
              hidden_users: [],
              manual_topics: [],
              updated_at: new Date().toISOString(),
            }
          }
          topTopics={topTopics}
        />

        {/* RGPD : export + delete */}
        <section className="px-5 sm:px-8 pt-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
            <span className="text-gold-deep">·</span> RGPD
          </h2>
          <div className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
            <a
              href="/api/me/algorithm-data"
              className="flex items-center gap-3 px-4 py-4 hover:bg-bg-soft transition-colors"
              download
            >
              <Download className="w-5 h-5 text-night-dim" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-night">
                  Exporter mon profil d&apos;intérêts
                </p>
                <p className="text-xs text-muted">
                  Téléchargement JSON (RGPD art. 15)
                </p>
              </div>
              <span className="text-night-dim">→</span>
            </a>
            <DeleteProfileItem />
          </div>
        </section>
      </div>
    </div>
  );
}

/* Server component qui rend un client component pour la confirmation. */
function DeleteProfileItem() {
  return (
    <div className="px-4 py-4">
      <DeleteProfileButton />
    </div>
  );
}
