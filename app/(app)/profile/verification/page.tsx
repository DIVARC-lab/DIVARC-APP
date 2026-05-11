import { ArrowLeft, BadgeCheck, Clock, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { createClient } from "@/lib/supabase/server";
import { safeFormatDate } from "@/lib/utils/date";
import type { IdentityVerificationRequest } from "@/lib/database.types";
import { SubmitVerificationForm } from "./SubmitVerificationForm";

export const metadata = {
  title: "Vérification d'identité",
};

/* Page /profile/verification :
 *   - Statut actuel (badge bleu si déjà vérifié)
 *   - Historique des demandes
 *   - Formulaire soumission nouvelle demande
 *
 * V1 : review admin manuel. V2 : Stripe Identity API. */

export default async function VerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("identity_verified_at, identity_verification_provider")
    .eq("id", user.id)
    .maybeSingle();

  const { data: requests } = await supabase
    .from("identity_verification_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(10);

  const reqs = (requests ?? []) as IdentityVerificationRequest[];
  const pending = reqs.find(
    (r) => r.status === "pending" || r.status === "reviewing",
  );

  return (
    <div className="min-h-screen bg-bg-soft pb-12">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-8">
        <header className="mb-6">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
          >
            <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
            Profil
          </Link>
          <KickerLabel>· Vérification</KickerLabel>
          <DisplayHeading
            size="lg"
            className="mt-2 !leading-[1.05] !text-[36px] sm:!text-[44px]"
          >
            Confirme ton identité.
          </DisplayHeading>
          <p className="mt-3 text-[14px] text-night-soft leading-relaxed">
            Gagne en crédibilité avec un badge bleu officiel DIVARC. Ta photo
            de profil et ton nom seront marqués comme vérifiés.
          </p>
        </header>

        {/* Statut actuel */}
        {profile?.identity_verified_at ? (
          <section className="rounded-2xl bg-blue-50 border border-blue-200 p-5 mb-5">
            <div className="flex items-start gap-3">
              <BadgeCheck
                className="w-8 h-8 text-[#3B82F6] fill-[#DBEAFE] shrink-0"
                aria-hidden
              />
              <div>
                <p className="text-[14px] font-bold text-night">
                  Identité vérifiée
                </p>
                <p className="mt-0.5 text-[12.5px] text-night-muted">
                  Depuis le{" "}
                  {safeFormatDate(profile.identity_verified_at, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {profile.identity_verification_provider ? (
                    <> · via {profile.identity_verification_provider}</>
                  ) : null}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* Demande en cours */}
        {pending ? (
          <section className="rounded-2xl bg-gold/5 border border-gold/30 p-5 mb-5">
            <div className="flex items-start gap-3">
              <Clock className="w-8 h-8 text-gold-deep shrink-0" aria-hidden />
              <div>
                <p className="text-[14px] font-bold text-night">
                  Demande en cours
                </p>
                <p className="mt-0.5 text-[12.5px] text-night-muted">
                  Soumise le{" "}
                  {safeFormatDate(pending.submitted_at, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  . Review sous 7 jours.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* Historique */}
        {reqs.length > 0 ? (
          <section className="rounded-2xl bg-white border border-line p-5 mb-5">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-night-muted mb-3">
              Historique
            </h2>
            <ul className="space-y-2">
              {reqs.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 py-2 border-b border-line last:border-0"
                >
                  {r.status === "approved" ? (
                    <BadgeCheck className="w-4 h-4 text-green-600" aria-hidden />
                  ) : r.status === "rejected" ? (
                    <X className="w-4 h-4 text-red-600" aria-hidden />
                  ) : (
                    <Clock className="w-4 h-4 text-night-dim" aria-hidden />
                  )}
                  <span className="text-[12.5px] text-night-soft flex-1">
                    {r.verification_type} ·{" "}
                    <strong className="capitalize">
                      {r.status === "pending"
                        ? "En attente"
                        : r.status === "reviewing"
                          ? "En review"
                          : r.status === "approved"
                            ? "Approuvée"
                            : r.status === "rejected"
                              ? "Rejetée"
                              : "Expirée"}
                    </strong>
                  </span>
                  <span className="text-[11.5px] text-night-dim">
                    {safeFormatDate(r.submitted_at, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Form (caché si vérifié OU pending) */}
        {!profile?.identity_verified_at && !pending ? (
          <section className="rounded-2xl bg-white border border-line p-5">
            <h2 className="text-[15px] font-bold text-night mb-4">
              Nouvelle demande
            </h2>
            <SubmitVerificationForm />
          </section>
        ) : null}
      </div>
    </div>
  );
}
