import { ArrowLeft, Scale, Shield } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { CATEGORY_BY_ID } from "@/lib/moderation/categories";
import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/primitives/Container";

export const metadata = {
  title: "Mon historique de modération",
};

/* /settings/moderation — vue user des actions de modération sur son compte.
 *
 * DSA art. 17 : transparence sur les décisions prises.
 * DSA art. 20 : possibilité de contester chaque action appealable.
 * RGPD art. 15 : droit d'accès aux infos sur les sanctions personnelles.
 *
 * RLS : moderation_actions filtré par target_user_id = auth.uid (cf 0046).
 */
export default async function UserModerationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: actions },
    { data: appeals },
    { data: activeSanctions },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("moderation_actions")
      .select(
        "id, action, category, reason_user, legal_basis, appealable, appeal_deadline, created_at",
      )
      .eq("target_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("moderation_appeals")
      .select("id, action_id, status, sla_deadline, resolution_note, created_at")
      .eq("appellant_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_sanctions")
      .select("id, level, type, reason, starts_at, expires_at, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("starts_at", { ascending: false }),
    supabase
      .from("profiles")
      .select(
        "trust_score, warnings_count, content_removed_count, timeouts_received",
      )
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const appealsByActionId = new Map(
    (appeals ?? []).map((a) => [a.action_id, a]),
  );

  return (
    <div className="bg-bg-soft min-h-screen pb-24">
      <Container maxWidth="text" paddingX="none">
        <header className="px-5 sm:px-8 pt-8 pb-6">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
          >
            <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
            Paramètres
          </Link>
          <KickerLabel>· Modération</KickerLabel>
          <DisplayHeading
            size="lg"
            className="mt-2 !leading-[1.05] !text-[36px] sm:!text-[44px]"
          >
            Mon historique de{" "}
            <em className="italic text-gold-deep">modération</em>
          </DisplayHeading>
          <p className="mt-3 text-[14px] text-night-soft leading-relaxed">
            Toutes les décisions prises sur ton compte, leur motif, et la
            possibilité de les contester (DSA art. 20).
          </p>
        </header>

        {profile ? (
          <section className="px-5 sm:px-8 pb-5">
            <div className="rounded-2xl bg-white border border-line p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Score de confiance" value={`${profile.trust_score ?? 50}/100`} />
              <Stat label="Avertissements" value={profile.warnings_count ?? 0} />
              <Stat
                label="Contenus retirés"
                value={profile.content_removed_count ?? 0}
              />
              <Stat
                label="Timeouts subis"
                value={profile.timeouts_received ?? 0}
              />
            </div>
          </section>
        ) : null}

        {(activeSanctions?.length ?? 0) > 0 ? (
          <section className="px-5 sm:px-8 pb-5">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
              <span className="text-gold-deep">·</span> Sanction active
            </h2>
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 space-y-2">
              {activeSanctions!.map((s) => (
                <div key={s.id} className="text-[13px] text-red-900">
                  <p className="font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4" aria-hidden />
                    {sanctionLabel(s.type, s.level)}
                  </p>
                  <p className="mt-1">{s.reason}</p>
                  {s.expires_at ? (
                    <p className="text-red-700 text-[12px] mt-1">
                      Expire le{" "}
                      {new Date(s.expires_at).toLocaleString("fr-FR")}.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="px-5 sm:px-8 pb-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
            <span className="text-gold-deep">·</span> Décisions de modération
          </h2>
          {(actions?.length ?? 0) === 0 ? (
            <p className="text-[13px] text-night-muted bg-white border border-line rounded-2xl p-4 text-center">
              Aucune décision de modération sur ton compte. Continue comme ça.
            </p>
          ) : (
            <ul className="space-y-3">
              {actions!.map((a) => {
                const cat = CATEGORY_BY_ID[a.category];
                const appeal = appealsByActionId.get(a.id);
                const canAppeal =
                  a.appealable &&
                  (!a.appeal_deadline ||
                    new Date(a.appeal_deadline).getTime() > Date.now()) &&
                  !appeal;
                return (
                  <li
                    key={a.id}
                    className="rounded-2xl bg-white border border-line p-4"
                  >
                    <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1.5">
                      <p className="text-[14px] font-semibold text-night">
                        {actionLabelFr(a.action)} ·{" "}
                        <span className="text-night-muted">
                          {cat?.label ?? a.category}
                        </span>
                      </p>
                      <p className="text-[11px] text-night-muted">
                        {new Date(a.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="text-[13px] text-night-soft leading-relaxed whitespace-pre-wrap">
                      {a.reason_user}
                    </p>
                    {a.legal_basis ? (
                      <p className="text-[11.5px] text-night-muted mt-1.5 italic">
                        Base légale : {a.legal_basis}
                      </p>
                    ) : null}

                    {appeal ? (
                      <AppealStatus appeal={appeal} />
                    ) : canAppeal ? (
                      <Link
                        href={`/settings/moderation/appeal/${a.id}`}
                        className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-1.5 rounded-full bg-night text-cream text-[12px] font-semibold hover:bg-night/90"
                      >
                        <Scale className="w-3.5 h-3.5" aria-hidden />
                        Contester cette décision
                      </Link>
                    ) : a.appealable && a.appeal_deadline ? (
                      <p className="text-[11px] text-night-muted mt-3 italic">
                        Délai d&apos;appel dépassé. Tu peux saisir{" "}
                        <a
                          href="https://www.arcom.fr"
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          l&apos;ARCOM
                        </a>{" "}
                        (organe de règlement extra-judiciaire DSA art. 21).
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </Container>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="text-[16px] font-semibold text-night mt-0.5">{value}</p>
    </div>
  );
}

function actionLabelFr(action: string): string {
  return (
    {
      no_action: "Aucune action",
      warn: "Avertissement",
      hide: "Masquage",
      delete: "Suppression",
      restrict_24h: "Restriction 24 h",
      restrict_7d: "Restriction 7 jours",
      restrict_30d: "Restriction 30 jours",
      suspend: "Suspension",
      ban_permanent: "Bannissement",
      escalate: "Escalade",
      authority_report: "Signalement aux autorités",
    } as Record<string, string>
  )[action] ?? action;
}

function sanctionLabel(type: string, level: number): string {
  if (type === "warning") return "Avertissement";
  if (type === "readonly") {
    if (level === 2) return "Restriction 24 h (lecture seule)";
    if (level === 3) return "Restriction 7 jours (lecture seule)";
    if (level === 4) return "Restriction 30 jours (lecture seule)";
    return "Restriction temporaire";
  }
  if (type === "suspended") return "Suspension du compte";
  if (type === "banned") return "Bannissement définitif";
  return type;
}

function AppealStatus({
  appeal,
}: {
  appeal: {
    id: string;
    status: string;
    sla_deadline: string;
    resolution_note: string | null;
  };
}) {
  const colors = {
    pending: "bg-amber-50 text-amber-900 border-amber-200",
    assigned: "bg-blue-50 text-blue-900 border-blue-200",
    accepted: "bg-emerald-50 text-emerald-900 border-emerald-200",
    rejected: "bg-red-50 text-red-900 border-red-200",
    escalated_external: "bg-violet-50 text-violet-900 border-violet-200",
  };
  const cls =
    colors[appeal.status as keyof typeof colors] ??
    "bg-bg-soft text-night-muted border-line";
  const label =
    {
      pending: "Recours en attente d'examen",
      assigned: "Recours assigné à un modérateur",
      accepted: "Recours accepté — décision révisée",
      rejected: "Recours rejeté",
      escalated_external:
        "Recours transmis à un organe extra-judiciaire (ARCOM)",
    }[appeal.status] ?? appeal.status;

  return (
    <div className={`mt-3 rounded-xl border px-3 py-2 text-[12px] ${cls}`}>
      <p className="font-semibold">{label}</p>
      {appeal.status === "pending" || appeal.status === "assigned" ? (
        <p className="mt-0.5">
          Délai opérationnel : décision sous le{" "}
          {new Date(appeal.sla_deadline).toLocaleDateString("fr-FR")}.
        </p>
      ) : null}
      {appeal.resolution_note ? (
        <p className="mt-0.5">{appeal.resolution_note}</p>
      ) : null}
    </div>
  );
}
