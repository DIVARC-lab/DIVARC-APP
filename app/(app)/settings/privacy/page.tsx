import { AlertTriangle, ArrowLeft, Download, Lock } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { Container } from "@/components/primitives/Container";

export const metadata = {
  title: "Confidentialité & RGPD",
};

/* Page /settings/privacy V1 :
 *   - Export RGPD (lien direct API)
 *   - Suppression compte avec grâce 30j
 *   - V2 : sections_visibility granulaire par section profil
 *   - V2 : ViewAs picker (voir profil tel que vu par...)
 *   - V2 : QR code partage */

export default async function PrivacyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("scheduled_deletion_at, deletion_requested_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-bg-soft pb-12">
      <Container maxWidth="text" paddingX="lg" paddingY="2xl">
        <header className="mb-6">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
          >
            <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
            Paramètres
          </Link>
          <KickerLabel>· Confidentialité & RGPD</KickerLabel>
          <DisplayHeading
            size="lg"
            className="mt-2 !leading-[1.05] !text-[36px] sm:!text-[44px]"
          >
            Tes données t&apos;appartiennent.
          </DisplayHeading>
        </header>

        <section className="rounded-2xl bg-white border border-line p-5 mb-5">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-[14px] font-bold text-night">
                Exporter mes données
              </h2>
              <p className="mt-0.5 text-[12.5px] text-night-muted">
                Téléchargement JSON complet : profil, posts, reels, relations,
                expériences, recommandations. RGPD art. 15.
              </p>
              <a
                href="/api/me/export"
                download
                className="mt-3 inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-night text-cream text-[12.5px] font-semibold hover:bg-night-soft transition-colors"
              >
                <Download className="w-3.5 h-3.5" aria-hidden />
                Télécharger maintenant
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white border border-line p-5 mb-5">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-night/5 text-night-muted flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-[14px] font-bold text-night">
                Visibilité granulaire (V2)
              </h2>
              <p className="mt-0.5 text-[12.5px] text-night-muted">
                Bientôt : règle la visibilité section par section (public,
                amis, amis d&apos;amis, privé) depuis ton profil v2.
              </p>
            </div>
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl bg-white border border-red-200 p-5">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-[14px] font-bold text-night">
                Supprimer mon compte
              </h2>
              <p className="mt-0.5 text-[12.5px] text-night-muted">
                Période de grâce de 30 jours. Tu peux annuler à tout moment en
                te reconnectant pendant cette période. Après expiration,
                suppression définitive irréversible.
              </p>
              <DeleteAccountSection
                scheduledDeletionAt={profile?.scheduled_deletion_at ?? null}
                deletionRequestedAt={profile?.deletion_requested_at ?? null}
              />
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
