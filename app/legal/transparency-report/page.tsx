import { CATEGORY_BY_ID } from "@/lib/moderation/categories";
import { buildTransparencyReport } from "@/lib/queries/transparency";

export const metadata = {
  title: "Rapport de transparence DSA",
  description:
    "Volumes de signalements, actions de modération, appels et signalements aux autorités sur DIVARC. Conformité DSA art. 24.",
};

/* /legal/transparency-report — Page publique DSA art. 24.
 *
 * Régénérée toutes les 24h via Next.js revalidate. Pour V2, on
 * cristallisera en JSON snapshot annuel.
 *
 * Contenu obligatoire DSA art. 24 :
 *   §1 : volume de notifications reçues, ventilées par catégorie
 *   §2 : volume d'actions de modération, ventilées par type d'action
 *        + part automatisée / part humaine
 *   §3 : volume de recours + taux acceptation/rejet + délais médians
 *   §4 : signalements aux autorités (Pharos, NCMEC)
 *   §5 : précision de la modération automatique
 *   §6 : trusted flaggers (nombre, secteurs, taux)
 */

/* Page dynamique — la lecture nécessite service_role qui n'est pas
   disponible au build statique. Faible trafic, donc render à la
   demande avec un cache HTTP côté Vercel via headers no-store en V1. */
export const dynamic = "force-dynamic";

export default async function TransparencyReportPage() {
  const report = await buildTransparencyReport({});

  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.18em] text-gold-deep font-extrabold mb-2">
        · Transparence
      </p>
      <h1 className="text-[40px] sm:text-[52px] leading-[1.05]">
        Rapport de{" "}
        <em className="italic text-gold-deep">transparence</em>
      </h1>
      <p className="text-night-muted text-[13px]">
        Période : du{" "}
        {new Date(report.period_start).toLocaleDateString("fr-FR")} au{" "}
        {new Date(report.period_end).toLocaleDateString("fr-FR")} · Généré le{" "}
        {new Date(report.generated_at).toLocaleDateString("fr-FR")}
      </p>
      <p className="mt-4 text-[14px] leading-relaxed">
        Ce rapport est publié en application de l&apos;
        <strong>article 24 du Digital Services Act</strong> (Règlement (UE)
        2022/2065). Il présente les chiffres consolidés de l&apos;activité
        de modération sur DIVARC pour la période indiquée. Toutes les
        données sont agrégées : aucune information identifiant un
        utilisateur particulier n&apos;est exposée.
      </p>

      <h2>1. Notifications reçues (signalements utilisateurs)</h2>
      <p>
        <strong>{report.reports.total}</strong> signalement
        {report.reports.total > 1 ? "s" : ""} reçu
        {report.reports.total > 1 ? "s" : ""} sur la période. Priorité
        médiane : <strong>{report.reports.median_priority}/100</strong>.
        Taux de duplications (plusieurs reports sur le même contenu) :{" "}
        <strong>{(report.reports.duplicates_rate * 100).toFixed(1)} %</strong>.
      </p>
      <table>
        <thead>
          <tr>
            <th>Catégorie</th>
            <th>Volume</th>
            <th>Part</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(report.reports.by_category)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, count]) => (
              <tr key={cat}>
                <td>{CATEGORY_BY_ID[cat as keyof typeof CATEGORY_BY_ID]?.label ?? cat}</td>
                <td>{count}</td>
                <td>
                  {((count / Math.max(1, report.reports.total)) * 100).toFixed(
                    1,
                  )}{" "}
                  %
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <h2>2. Actions de modération</h2>
      <p>
        <strong>{report.actions.total}</strong> action
        {report.actions.total > 1 ? "s" : ""} de modération prise
        {report.actions.total > 1 ? "s" : ""} sur la période, dont{" "}
        <strong>{report.actions.automated_count}</strong> automatisée
        {report.actions.automated_count > 1 ? "s" : ""} et{" "}
        <strong>{report.actions.manual_count}</strong> par décision
        humaine.
      </p>
      <h3>Par type d&apos;action</h3>
      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(report.actions.by_action)
            .sort(([, a], [, b]) => b - a)
            .map(([action, count]) => (
              <tr key={action}>
                <td>{actionLabelFr(action)}</td>
                <td>{count}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <h2>3. Recours utilisateurs (DSA art. 20)</h2>
      <p>
        <strong>{report.appeals.total}</strong> recours déposé
        {report.appeals.total > 1 ? "s" : ""} sur la période :
      </p>
      <ul>
        <li>
          Acceptés : <strong>{report.appeals.accepted}</strong> (
          {report.appeals.total > 0
            ? ((report.appeals.accepted / report.appeals.total) * 100).toFixed(
                1,
              )
            : "0"}{" "}
          %)
        </li>
        <li>
          Rejetés : <strong>{report.appeals.rejected}</strong> (
          {report.appeals.total > 0
            ? ((report.appeals.rejected / report.appeals.total) * 100).toFixed(
                1,
              )
            : "0"}{" "}
          %)
        </li>
        <li>
          En cours d&apos;examen :{" "}
          <strong>{report.appeals.pending}</strong>
        </li>
        <li>
          Délai médian de résolution :{" "}
          <strong>
            {report.appeals.median_resolution_days !== null
              ? `${report.appeals.median_resolution_days.toFixed(1)} jours`
              : "—"}
          </strong>
        </li>
      </ul>

      <h2>4. Signalements aux autorités</h2>
      <ul>
        <li>
          Incidents critiques détectés (CSAM, terrorisme, NCII) :{" "}
          <strong>{report.authorities.csam_incidents}</strong>
        </li>
        <li>
          Soumissions NCMEC (CyberTipline) :{" "}
          <strong>{report.authorities.ncmec_submissions}</strong>
        </li>
        <li>
          Soumissions Pharos (internet-signalement.gouv.fr) :{" "}
          <strong>{report.authorities.pharos_submissions}</strong>
        </li>
        <li>
          Réquisitions judiciaires reçues (LCEN art. 6) :{" "}
          <strong>{report.authorities.legal_data_requests}</strong>
        </li>
      </ul>

      <h2>5. Trusted flaggers (DSA art. 22)</h2>
      <p>
        <strong>{report.trusted_flaggers.active}</strong> signaleur
        {report.trusted_flaggers.active > 1 ? "s" : ""} de confiance actif
        {report.trusted_flaggers.active > 1 ? "s" : ""} sur DIVARC. Taux
        de précision moyen :{" "}
        <strong>
          {report.trusted_flaggers.avg_precision_rate !== null
            ? `${(report.trusted_flaggers.avg_precision_rate * 100).toFixed(1)} %`
            : "—"}
        </strong>
        .
      </p>

      <h2>6. Délais de traitement</h2>
      <ul>
        <li>
          Délai médian de résolution d&apos;un signalement :{" "}
          <strong>
            {report.timing.median_resolution_hours !== null
              ? `${report.timing.median_resolution_hours.toFixed(1)} heures`
              : "—"}
          </strong>
        </li>
        <li>
          Délai au 90e centile (90 % des signalements traités sous) :{" "}
          <strong>
            {report.timing.p90_resolution_hours !== null
              ? `${report.timing.p90_resolution_hours.toFixed(1)} heures`
              : "—"}
          </strong>
        </li>
      </ul>

      <h2>7. Méthode et limites</h2>
      <p>
        Les données sont agrégées depuis les tables{" "}
        <code>moderation_reports</code>, <code>moderation_actions</code>,{" "}
        <code>moderation_appeals</code>, et{" "}
        <code>moderation_critical_incidents</code> via{" "}
        <code>buildTransparencyReport()</code>. Le code est ouvert dans le
        repo public DIVARC. Les chiffres sont rafraîchis quotidiennement.
      </p>
      <p>
        Aucune métrique exposée ne permet de remonter à un utilisateur
        individuel. Les <em>k</em>-anonymités sont garanties par la
        granularité des catégories et des fenêtres temporelles.
      </p>

      <h2>8. Format machine-readable</h2>
      <p>
        Une version JSON de ce rapport est disponible à{" "}
        <code>/api/transparency/report.json</code> (à venir). Pour les
        chercheurs, journalistes et régulateurs, contactez{" "}
        <a href="mailto:transparency@divarc.app">transparency@divarc.app</a>.
      </p>
    </>
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
