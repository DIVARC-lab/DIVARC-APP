import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSellerDac7Yearly } from "@/lib/queries/marketplaceReviews";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Déclaration fiscale DAC7",
};

export default async function Dac7Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rows = await getSellerDac7Yearly(user.id);

  return (
    <div className="bg-bg-soft min-h-[calc(100dvh-56px)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <Link
          href="/wallet/seller"
          className="inline-flex items-center gap-2 text-[12px] text-night-dim hover:text-night mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
          Retour au compte vendeur
        </Link>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
          · Conformité fiscale
        </span>
        <h1 className="mt-1 font-display text-[28px] sm:text-[36px] text-night text-balance leading-tight">
          Reporting DAC7
        </h1>
        <p className="mt-2 text-[14px] text-night-soft leading-relaxed max-w-prose">
          Depuis le 1er janvier 2023, la directive européenne DAC7 (UE 2021/514)
          impose aux plateformes comme DIVARC de déclarer les revenus de
          leurs vendeurs lorsqu'ils dépassent <strong>30 ventes</strong> ou{" "}
          <strong>2000 € de revenus</strong> sur une année civile.
        </p>

        <section className="mt-6 rounded-2xl bg-white border border-line overflow-hidden">
          <header className="px-4 py-3 border-b border-line">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-night-dim">
              · Tes revenus annuels
            </p>
          </header>
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-night-dim">
              Aucune vente finalisée à reporter pour le moment.
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead className="bg-bg-soft text-night-dim">
                <tr>
                  <th className="text-left font-bold px-4 py-2.5">Année</th>
                  <th className="text-right font-bold px-4 py-2.5">
                    Ventes
                  </th>
                  <th className="text-right font-bold px-4 py-2.5">
                    Revenu net (€)
                  </th>
                  <th className="text-right font-bold px-4 py-2.5">
                    Déclaration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.year}>
                    <td className="px-4 py-2.5 font-semibold text-night">
                      {r.year}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {r.totalOrders.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {r.totalRevenueEur.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      €
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.hasDac7Threshold ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
                          Reportable
                        </span>
                      ) : (
                        <span className="text-night-dim text-[12px]">
                          Sous seuil
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="mt-4 rounded-2xl bg-night text-cream p-5 flex items-start gap-3">
          <FileText
            className="w-4 h-4 mt-0.5 text-gold shrink-0"
            aria-hidden
          />
          <div className="space-y-1">
            <p className="text-[12px] font-bold text-cream">
              DIVARC déclare automatiquement
            </p>
            <p className="text-[12px] text-cream/70 leading-relaxed">
              Si tu dépasses les seuils sur une année, DIVARC transmet
              automatiquement tes informations (identité, IBAN, total des
              ventes) à l'administration fiscale française (DGFiP) avant le
              31 janvier de l'année suivante. Tu reçois une copie du rapport
              par email.
            </p>
            <p className="text-[12px] text-cream/70 leading-relaxed mt-2">
              Ces revenus restent imposables selon ton régime fiscal personnel
              (BIC, BNC, micro-entreprise…). Consulte ton expert-comptable.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
