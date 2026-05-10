import { AlertTriangle, ExternalLink, FileSearch, Shield } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { isCurrentUserAdmin } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Pharos / NCMEC — File de signalements" };

/* /admin/legal/pharos-queue — File des incidents critiques à transmettre
 * aux autorités françaises (Pharos) et internationales (NCMEC).
 *
 * Pharos n'a pas d'API publique : la soumission se fait manuellement
 * via internet-signalement.gouv.fr. Cette page liste les incidents
 * "à soumettre" avec un lien direct + un bouton pour enregistrer la
 * référence Pharos une fois soumis.
 *
 * NCMEC : si NCMEC_API_KEY est configurée, le cron csam-pharos-ncmec
 * soumet automatiquement. Sinon, transmission manuelle via cybertipline.org.
 */
export default async function PharosQueuePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isCurrentUserAdmin())) notFound();

  const { data: pendingIncidents } = await supabase
    .from("moderation_critical_incidents")
    .select("*")
    .in("status", ["detected", "authorities_notified"])
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: closedIncidents } = await supabase
    .from("moderation_critical_incidents")
    .select("*")
    .eq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="bg-bg-soft min-h-screen pb-12">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 pt-8">
        <header className="mb-6">
          <KickerLabel>· Trust & Safety · Autorités</KickerLabel>
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <DisplayHeading
              size="lg"
              className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
            >
              Pharos / NCMEC — Incidents critiques
            </DisplayHeading>
            <Link
              href="/admin/moderation"
              className="text-[12px] font-bold text-night-muted hover:text-night"
            >
              ← Modération
            </Link>
          </div>
          <p className="mt-3 text-[14px] text-night-soft max-w-3xl leading-relaxed">
            File des incidents nécessitant un signalement aux autorités
            (CSAM, terrorisme, menaces imminentes, NCII). Pharos n&apos;a
            pas d&apos;API publique : le signalement se fait manuellement
            via{" "}
            <a
              href="https://www.internet-signalement.gouv.fr"
              target="_blank"
              rel="noreferrer"
              className="text-gold-deep underline"
            >
              internet-signalement.gouv.fr
            </a>
            . NCMEC : automatique si <code>NCMEC_API_KEY</code> configurée,
            sinon manuel via{" "}
            <a
              href="https://www.cybertipline.org"
              target="_blank"
              rel="noreferrer"
              className="text-gold-deep underline"
            >
              cybertipline.org
            </a>
            .
          </p>
        </header>

        <section className="mb-8">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-muted mb-3">
            <span className="text-red-600">·</span> Incidents en attente (
            {pendingIncidents?.length ?? 0})
          </h2>
          {(pendingIncidents?.length ?? 0) === 0 ? (
            <p className="rounded-2xl border border-line bg-white p-6 text-center text-[13px] text-night-muted">
              Aucun incident en attente. La file est à jour.
            </p>
          ) : (
            <ul className="space-y-3">
              {pendingIncidents!.map((inc) => (
                <li
                  key={inc.id}
                  className="rounded-2xl border border-red-200 bg-red-50/30 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0"
                    >
                      <AlertTriangle className="w-5 h-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3 flex-wrap">
                        <p className="text-[14px] font-semibold text-red-900">
                          {labelIncidentType(inc.incident_type)} ·{" "}
                          <span className="font-mono text-[12px]">
                            {inc.id.slice(0, 8).toUpperCase()}
                          </span>
                        </p>
                        <p className="text-[11px] text-red-800">
                          {new Date(inc.created_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      <p className="mt-1 text-[12.5px] text-red-900">
                        Détecté par{" "}
                        <strong>{inc.detected_by}</strong> · statut{" "}
                        <strong>{inc.status}</strong>
                      </p>
                      <dl className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11.5px]">
                        <KV
                          label="NCMEC"
                          value={
                            inc.ncmec_submitted_at
                              ? `Soumis ${new Date(inc.ncmec_submitted_at).toLocaleDateString("fr-FR")}`
                              : "Non soumis"
                          }
                        />
                        <KV
                          label="Pharos"
                          value={
                            inc.pharos_submitted_at
                              ? `Soumis ${new Date(inc.pharos_submitted_at).toLocaleDateString("fr-FR")} (réf ${inc.pharos_reference ?? "?"})`
                              : "À soumettre manuellement"
                          }
                        />
                        <KV
                          label="Auteur"
                          value={
                            inc.perpetrator_email ??
                            inc.perpetrator_user_id ??
                            "Inconnu"
                          }
                        />
                      </dl>
                      {!inc.pharos_submitted_at ? (
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <a
                            href="https://www.internet-signalement.gouv.fr"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-night text-cream text-[12px] font-semibold hover:bg-night/90"
                          >
                            <ExternalLink
                              className="w-3.5 h-3.5"
                              aria-hidden
                            />
                            Soumettre à Pharos
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {(closedIncidents?.length ?? 0) > 0 ? (
          <section>
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-muted mb-3">
              <FileSearch className="w-3.5 h-3.5 inline mr-1" aria-hidden />
              Incidents clôturés (20 derniers)
            </h2>
            <ul className="rounded-2xl border border-line bg-white divide-y divide-line">
              {closedIncidents!.map((inc) => (
                <li
                  key={inc.id}
                  className="px-4 py-3 text-[12.5px] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-night truncate">
                      {labelIncidentType(inc.incident_type)} · #
                      {inc.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-night-muted text-[11px]">
                      Clôturé{" "}
                      {inc.closed_at
                        ? new Date(inc.closed_at).toLocaleDateString("fr-FR")
                        : "?"}
                    </p>
                  </div>
                  {inc.pharos_reference ? (
                    <span className="text-[10px] font-mono text-night-muted">
                      Pharos {inc.pharos_reference}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <aside className="mt-8 rounded-2xl border border-line bg-white p-5 text-[12.5px] text-night-soft leading-relaxed">
          <p className="font-semibold text-night mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gold-deep" aria-hidden />
            Procédure de soumission Pharos
          </p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              Cliquer « Soumettre à Pharos » → ouvre{" "}
              <code>internet-signalement.gouv.fr</code>.
            </li>
            <li>
              Joindre l&apos;evidence depuis le bucket Storage (chemin
              indiqué dans <code>evidence_storage_path</code>).
            </li>
            <li>
              Une fois soumis, revenir ici, cliquer sur l&apos;incident
              et enregistrer la <strong>référence Pharos</strong>{" "}
              communiquée.
            </li>
            <li>
              Le statut passe automatiquement à{" "}
              <code>authorities_notified</code> puis <code>closed</code>{" "}
              quand toutes les autorités ont accusé réception.
            </li>
          </ol>
        </aside>
      </div>
    </div>
  );
}

function labelIncidentType(t: string): string {
  return (
    {
      csam: "CSAM (pédopornographie)",
      terrorism: "Apologie du terrorisme",
      imminent_violence: "Menace imminente",
      revenge_porn: "Diffusion intime non consentie",
    } as Record<string, string>
  )[t] ?? t;
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-red-700 font-bold">
        {label}
      </dt>
      <dd className="text-red-900">{value}</dd>
    </div>
  );
}
