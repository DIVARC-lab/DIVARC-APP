import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { createClient } from "@/lib/supabase/server";
import { AdsPrivacyForm } from "./AdsPrivacyForm";

export const metadata = { title: "Mes préférences publicitaires" };

/* /settings/privacy/ads — Préférences user RGPD/ePrivacy.
 *
 * Conformité :
 *   - Consent toggle pour personnalisation (case non pré-cochée)
 *   - Opt-out comportemental + géo
 *   - Liste catégories blocables
 *   - Liste annonceurs masqués (lecture seule, géré via "Why this ad")
 *   - Lien transparency-report-ads + library publique
 *   - Bouton export RGPD art. 20
 */
export default async function AdsPrivacyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prefs } = await supabase
    .from("user_ad_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

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
          <KickerLabel>· Confidentialité publicitaire</KickerLabel>
          <DisplayHeading
            size="lg"
            className="mt-2 !leading-[1.05] !text-[36px] sm:!text-[44px]"
          >
            Mes <em className="italic text-gold-deep">préférences</em>{" "}
            publicitaires
          </DisplayHeading>
          <p className="mt-3 text-[14px] text-night-soft leading-relaxed">
            Tu décides comment DIVARC te montre des publicités. Les
            personnalisations sont <strong>désactivées par défaut</strong>
            (RGPD art. 7 — case non pré-cochée). Active uniquement ce qui
            te convient.
          </p>
        </header>

        <AdsPrivacyForm
          initial={
            prefs ?? {
              user_id: user.id,
              personalized_ads_consent: false,
              behavioral_data_consent: false,
              location_data_consent: false,
              blocked_categories: [],
              blocked_advertisers: [],
              removed_interests: [],
              consent_updated_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          }
        />

        <section className="px-5 sm:px-8 pt-8">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
            <span className="text-gold-deep">·</span> Transparence
          </h2>
          <ul className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
            <LinkRow
              href="/legal/ads-library"
              title="Bibliothèque publique des publicités"
              description="Toutes les ads diffusées sur DIVARC dans l'UE (DSA art. 39)"
            />
            <LinkRow
              href="/legal/transparency-report"
              title="Rapport de transparence DSA art. 24"
              description="Volumes modération + signalements + délais de traitement"
            />
            <LinkRow
              href="/settings/algorithm/transparency"
              title="Comment fonctionne mon algorithme"
              description="Critères du ranker recsys (DSA art. 27)"
            />
          </ul>
        </section>

        <section className="px-5 sm:px-8 pt-8">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
            <span className="text-gold-deep">·</span> Mes droits RGPD
          </h2>
          <ul className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line text-[13px]">
            <li className="px-4 py-3">
              <strong className="text-night">Art. 15 — droit d&apos;accès :</strong>{" "}
              demande l&apos;export complet de ton profil publicitaire à{" "}
              <a
                href="mailto:dpo@divarc.app"
                className="text-gold-deep hover:underline"
              >
                dpo@divarc.app
              </a>
              .
            </li>
            <li className="px-4 py-3">
              <strong className="text-night">Art. 17 — droit à l&apos;effacement :</strong>{" "}
              supprime ton profil d&apos;intérêts publicitaires depuis{" "}
              <Link
                href="/settings/algorithm"
                className="text-gold-deep hover:underline"
              >
                Recommandations
              </Link>
              .
            </li>
            <li className="px-4 py-3">
              <strong className="text-night">Art. 21 — droit d&apos;opposition :</strong>{" "}
              désactive simplement le toggle « Publicités personnalisées »
              ci-dessus.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function LinkRow({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="block px-4 py-3 hover:bg-bg-soft transition-colors"
      >
        <p className="text-[13.5px] font-semibold text-night">{title}</p>
        <p className="text-[12px] text-night-muted">{description}</p>
      </Link>
    </li>
  );
}
