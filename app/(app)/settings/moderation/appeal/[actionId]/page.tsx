import { ArrowLeft, Scale } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { CATEGORY_BY_ID } from "@/lib/moderation/categories";
import { createClient } from "@/lib/supabase/server";
import { AppealForm } from "./AppealForm";
import { Container } from "@/components/primitives/Container";

export const metadata = { title: "Contester une décision" };

type Params = Promise<{ actionId: string }>;

export default async function AppealPage({ params }: { params: Params }) {
  const { actionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: action } = await supabase
    .from("moderation_actions")
    .select(
      "id, action, category, reason_user, legal_basis, appealable, appeal_deadline, target_user_id, created_at",
    )
    .eq("id", actionId)
    .maybeSingle();
  if (!action) notFound();
  if (action.target_user_id !== user.id) notFound();
  if (!action.appealable) notFound();
  if (
    action.appeal_deadline &&
    new Date(action.appeal_deadline).getTime() < Date.now()
  ) {
    notFound();
  }

  const cat = CATEGORY_BY_ID[action.category];

  return (
    <div className="bg-bg-soft min-h-screen pb-24">
      <Container maxWidth="text" paddingX="none">
        <header className="px-5 sm:px-8 pt-8 pb-6">
          <Link
            href="/settings/moderation"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
          >
            <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
            Modération
          </Link>
          <KickerLabel>· Recours DSA art. 20</KickerLabel>
          <DisplayHeading
            size="lg"
            className="mt-2 !leading-[1.05] !text-[36px] sm:!text-[44px]"
          >
            Contester une <em className="italic text-gold-deep">décision</em>
          </DisplayHeading>
          <p className="mt-3 text-[14px] text-night-soft leading-relaxed">
            Explique pourquoi cette décision te semble injuste. Notre équipe
            T&S l&apos;examinera dans les 7 jours (délai légal max : 6 mois).
            Le modérateur qui révisera ne sera pas celui qui a pris la
            décision initiale.
          </p>
        </header>

        <section className="px-5 sm:px-8 pb-5">
          <div className="rounded-2xl bg-white border border-line p-4">
            <p className="text-[12px] text-night-muted uppercase tracking-wider font-bold mb-1.5">
              Décision contestée
            </p>
            <p className="text-[14px] font-semibold text-night">
              {actionLabelFr(action.action)} · {cat?.label ?? action.category}
            </p>
            <p className="text-[13px] text-night-soft mt-2 leading-relaxed whitespace-pre-wrap">
              {action.reason_user}
            </p>
            {action.legal_basis ? (
              <p className="text-[11.5px] text-night-muted mt-2 italic">
                Base légale : {action.legal_basis}
              </p>
            ) : null}
            <p className="text-[11px] text-night-muted mt-2">
              Prise le{" "}
              {new Date(action.created_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </section>

        <section className="px-5 sm:px-8">
          <AppealForm actionId={action.id} />
        </section>

        <section className="px-5 sm:px-8 pt-6">
          <div className="rounded-2xl bg-bg-soft border border-line p-4 text-[12px] text-night-soft leading-relaxed">
            <p className="font-semibold text-night mb-1.5 flex items-center gap-2">
              <Scale className="w-4 h-4 text-gold-deep" aria-hidden />
              Tes droits
            </p>
            <ul className="space-y-1 list-disc pl-4">
              <li>
                Le recours sera examiné par un modérateur différent de celui
                qui a pris la décision (DSA art. 20.6).
              </li>
              <li>
                Tu seras notifié de la nouvelle décision dans les 7 jours
                (délai opérationnel) avec un motif détaillé.
              </li>
              <li>
                Si la décision est confirmée et que tu n&apos;es toujours pas
                satisfait, tu peux saisir l&apos;
                <a
                  href="https://www.arcom.fr"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  ARCOM
                </a>
                , organe de règlement extra-judiciaire (DSA art. 21).
              </li>
            </ul>
          </div>
        </section>
      </Container>
    </div>
  );
}

function actionLabelFr(action: string): string {
  return (
    {
      warn: "Avertissement",
      hide: "Masquage",
      delete: "Suppression",
      restrict_24h: "Restriction 24 h",
      restrict_7d: "Restriction 7 jours",
      restrict_30d: "Restriction 30 jours",
      suspend: "Suspension",
      ban_permanent: "Bannissement",
    } as Record<string, string>
  )[action] ?? action;
}
