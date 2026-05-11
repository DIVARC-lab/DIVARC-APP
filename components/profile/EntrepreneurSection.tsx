import { Rocket, TrendingUp } from "lucide-react";
import type {
  EntrepreneurCompany,
  EntrepreneurFundraisingStatus,
  EntrepreneurInvestment,
} from "@/lib/database.types";

const STAGE_LABELS: Record<
  NonNullable<EntrepreneurCompany["company_stage"]>,
  string
> = {
  idea: "Idée",
  mvp: "MVP",
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c_plus: "Series C+",
  profitable: "Rentable",
  acquired: "Racheté",
  shutdown: "Fermé",
  ipo: "IPO",
};

const FOUNDER_STATUS_LABELS: Record<
  EntrepreneurCompany["founder_status"],
  string
> = {
  founder: "Founder",
  co_founder: "Co-founder",
  ceo: "CEO",
  cto: "CTO",
  cfo: "CFO",
  coo: "COO",
  president: "Président",
  managing_director: "Directeur général",
  board_member: "Membre du board",
  advisor: "Advisor",
  other: "Autre",
};

const ROUND_LABELS: Record<NonNullable<EntrepreneurInvestment["round"]>, string> = {
  pre_seed: "Pre-Seed",
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c: "Series C",
  series_d_plus: "Series D+",
  bridge: "Bridge",
  crowdfunding: "Crowdfunding",
  angel: "Angel",
  other: "Autre",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", USD: "$", XAF: "FCFA", XOF: "CFA", MAD: "MAD",
  TND: "TND", DZD: "DZD", CAD: "CA$", CHF: "CHF", GBP: "£",
};

type Props = {
  companies: EntrepreneurCompany[];
  investments: EntrepreneurInvestment[];
  fundraising: EntrepreneurFundraisingStatus | null;
};

export function EntrepreneurSection({
  companies,
  investments,
  fundraising,
}: Props) {
  const hasAny =
    companies.length > 0 || investments.length > 0 || fundraising?.is_open;
  if (!hasAny) {
    return (
      <div className="rounded-2xl bg-white border border-line p-6 text-center">
        <Rocket className="w-6 h-6 text-night-dim mx-auto mb-2" aria-hidden />
        <p className="text-[13px] text-night-muted">
          Aucune info entrepreneur pour l&apos;instant.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Fundraising bandeau (top) */}
      {fundraising?.is_open ? (
        <FundraisingBanner fundraising={fundraising} />
      ) : null}

      {/* Sociétés fondées */}
      {companies.length > 0 ? (
        <section className="rounded-2xl bg-white border border-line overflow-hidden">
          <header className="px-5 py-4 border-b border-line flex items-center gap-2">
            <Rocket className="w-4 h-4 text-gold-deep" aria-hidden />
            <h2 className="text-[14px] font-bold text-night">
              Sociétés fondées
            </h2>
            <span className="text-[12px] text-night-muted">
              · {companies.length}
            </span>
          </header>
          <ul className="divide-y divide-line">
            {companies.map((c) => (
              <li key={c.id} className="px-5 py-4 flex gap-4">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-bg-soft border border-line flex items-center justify-center text-night-muted font-bold text-[16px]">
                  {c.company_logo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={c.company_logo_url}
                      alt=""
                      className="w-full h-full rounded-xl object-cover"
                    />
                  ) : (
                    c.company_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-semibold text-night">
                    {c.company_name}
                  </h3>
                  <p className="text-[12.5px] text-night-soft">
                    {FOUNDER_STATUS_LABELS[c.founder_status]} · {c.role}
                    {c.company_stage ? (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-gold/10 text-gold-deep text-[10.5px] font-bold uppercase tracking-wider">
                        {STAGE_LABELS[c.company_stage]}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[12px] text-night-muted">
                    {c.founded_year ?? "?"}
                    {c.is_current
                      ? " – Présent"
                      : c.exit_year
                        ? ` – ${c.exit_year}`
                        : ""}
                  </p>
                  {c.description ? (
                    <p className="mt-2 text-[13px] text-night-soft line-clamp-3">
                      {c.description}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Investments */}
      {investments.length > 0 ? (
        <section className="rounded-2xl bg-white border border-line overflow-hidden">
          <header className="px-5 py-4 border-b border-line flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gold-deep" aria-hidden />
            <h2 className="text-[14px] font-bold text-night">
              Portfolio investissement
            </h2>
            <span className="text-[12px] text-night-muted">
              · {investments.length}
            </span>
          </header>
          <ul className="divide-y divide-line">
            {investments.map((inv) => {
              const showAmount =
                inv.is_amount_public && inv.amount != null && inv.currency;
              const symbol = inv.currency
                ? (CURRENCY_SYMBOLS[inv.currency] ?? inv.currency)
                : "";
              return (
                <li
                  key={inv.id}
                  className="px-5 py-3.5 flex items-center gap-3"
                >
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-bg-soft border border-line flex items-center justify-center text-night-muted font-bold">
                    {inv.company_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-night">
                      {inv.company_name}
                      {inv.round ? (
                        <span className="ml-2 text-[11px] font-bold uppercase tracking-wider text-gold-deep">
                          {ROUND_LABELS[inv.round]}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11.5px] text-night-muted">
                      {showAmount
                        ? `${inv.amount}${symbol}`
                        : "Montant non public"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function FundraisingBanner({
  fundraising,
}: {
  fundraising: EntrepreneurFundraisingStatus;
}) {
  const symbol = fundraising.currency
    ? (CURRENCY_SYMBOLS[fundraising.currency] ?? fundraising.currency)
    : "";
  const target = fundraising.target_amount;
  const raised = fundraising.raised_amount ?? 0;
  const pct = target ? Math.min((raised / target) * 100, 100) : 0;

  return (
    <aside
      role="status"
      className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent p-4 sm:p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-gold-deep text-white flex items-center justify-center shrink-0">
          <TrendingUp className="w-5 h-5" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-gold-deep">
            Levée en cours
          </p>
          <p className="mt-0.5 text-[13.5px] text-night">
            {fundraising.round_type
              ? ROUND_LABELS[fundraising.round_type as keyof typeof ROUND_LABELS] ?? fundraising.round_type
              : "Round ouvert"}
            {target ? (
              <>
                <span className="text-night-dim"> · </span>
                <span className="font-bold">
                  {target}
                  {symbol}
                </span>
                <span className="text-night-muted"> objectif</span>
              </>
            ) : null}
          </p>
          {target ? (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-night/10 overflow-hidden">
                <div
                  className="h-full bg-gold-deep transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-night-muted">
                {raised}{symbol} levés ({pct.toFixed(0)}%)
              </p>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {fundraising.contact_email ? (
              <a
                href={`mailto:${fundraising.contact_email}`}
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-night text-cream text-[12px] font-semibold hover:bg-night-soft"
              >
                Contact investisseurs
              </a>
            ) : null}
            {fundraising.pitch_deck_url ? (
              <a
                href={fundraising.pitch_deck_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-full border border-line text-night text-[12px] font-semibold hover:bg-bg-soft"
              >
                Pitch deck
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
