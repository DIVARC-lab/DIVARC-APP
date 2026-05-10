import { ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Bibliothèque publique d'annonces — DIVARC",
  description:
    "Toutes les publicités diffusées sur DIVARC dans l'UE, conforme DSA art. 39. Conservation 1 an minimum.",
};

/* /legal/ads-library — Page publique DSA art. 39.
 *
 * Accessible SANS connexion. Liste toutes les ads diffusées sur DIVARC
 * dans l'UE avec :
 *   - Annonceur (raison sociale)
 *   - Période diffusion
 *   - Creative snapshot (image, texte, headline, destination URL)
 *   - Targeting principal anonymisé (jamais le détail individuel)
 *   - Range impressions + range spend (pas de chiffres exacts)
 *   - Bouton "Signaler cette ad"
 *
 * Conservation 1 an minimum après fin de diffusion (art. 39).
 */

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  active?: string;
  advertiser?: string;
}>;

export default async function AdsLibraryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q, active, advertiser } = await searchParams;

  const supabase = await createClient();

  let query = supabase
    .from("ads_library_entries")
    .select("*")
    .order("first_served_at", { ascending: false })
    .limit(60);

  if (active === "true") query = query.eq("is_active", true);
  if (advertiser) query = query.ilike("business_name", `%${advertiser}%`);
  if (q) {
    /* Postgres ilike sur le snapshot creative — V1 simple, V2 full-text. */
    query = query.or(
      `business_name.ilike.%${q}%,creative_snapshot->>headline.ilike.%${q}%,creative_snapshot->>primary_text.ilike.%${q}%`,
    );
  }

  const { data: entries } = await query;

  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.18em] text-gold-deep font-extrabold mb-2">
        · Transparence DSA art. 39
      </p>
      <h1 className="text-[40px] sm:text-[52px] leading-[1.05]">
        Bibliothèque publique des{" "}
        <em className="italic text-gold-deep">publicités</em>
      </h1>
      <p className="text-night-muted text-[13px]">
        Toutes les publicités diffusées sur DIVARC dans l&apos;Union européenne.
        Conservation 1 an minimum après la fin de diffusion.
      </p>

      <p className="mt-4 text-[14px] leading-relaxed">
        Cette page est publiée en application de l&apos;
        <strong>article 39 du Digital Services Act</strong>. Les chiffres
        d&apos;impressions et de dépense sont communiqués en{" "}
        <em>plages anonymisées</em> pour respecter la confidentialité
        commerciale tout en garantissant la transparence du système. Aucune
        information individuelle d&apos;utilisateur n&apos;est exposée.
      </p>

      <form action="/legal/ads-library" className="mt-6 not-prose">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-muted"
              aria-hidden
            />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Rechercher annonceur ou texte"
              className="w-full pl-9 pr-3 py-2 rounded-full border border-line bg-white text-[13px] focus:outline-none focus:border-night"
            />
          </div>
          <label className="flex items-center gap-1.5 text-[12px] text-night-soft">
            <input
              type="checkbox"
              name="active"
              value="true"
              defaultChecked={active === "true"}
              className="accent-night"
            />
            Actives uniquement
          </label>
          <button
            type="submit"
            className="px-4 py-2 rounded-full bg-night text-cream text-[12px] font-semibold hover:bg-night/90"
          >
            Rechercher
          </button>
        </div>
      </form>

      <h2 className="not-prose mt-8 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted">
        · {entries?.length ?? 0} annonce(s) trouvée(s)
      </h2>

      {!entries || entries.length === 0 ? (
        <p className="text-night-muted">Aucune annonce ne correspond.</p>
      ) : (
        <ul className="not-prose mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {entries.map((e) => (
            <AdLibraryCard key={e.id} entry={e} />
          ))}
        </ul>
      )}

      <h2 className="mt-12">Comment ces données sont-elles produites ?</h2>
      <p>
        À chaque création d&apos;ad sur DIVARC, un snapshot du creative et un
        résumé du targeting (âge, genre, pays, catégories d&apos;intérêts —
        jamais l&apos;individuel) sont enregistrés dans cette bibliothèque.
        Les chiffres de diffusion sont mis à jour quotidiennement et
        communiqués en ranges (1K-5K, 5K-10K, etc.) pour ne pas exposer
        d&apos;information stratégique au-delà de la transparence requise.
      </p>

      <h2>API publique</h2>
      <p>
        Une API GET <code>/api/transparency/ads</code> est disponible pour les
        chercheurs, journalistes et régulateurs (rate-limited mais accessible
        sans authentification — V2). Pour des accès en volume contacte{" "}
        <a href="mailto:transparency@divarc.app">transparency@divarc.app</a>.
      </p>

      <h2>Signaler une publicité</h2>
      <p>
        Si une publicité te paraît trompeuse, illégale ou inappropriée, tu
        peux la signaler via le bouton « Signaler » sur sa fiche. Notre équipe
        Trust &amp; Safety l&apos;examinera selon nos règles communautaires.
      </p>
    </>
  );
}

function AdLibraryCard({
  entry,
}: {
  entry: {
    id: string;
    business_name: string;
    campaign_objective: string | null;
    creative_snapshot: Record<string, unknown>;
    targeting_summary: Record<string, unknown>;
    placements: string[];
    is_active: boolean;
    first_served_at: string;
    last_served_at: string | null;
    impressions_range: string | null;
    spend_range: string | null;
    paid_for_by: string | null;
  };
}) {
  const creative = entry.creative_snapshot as {
    headline?: string;
    primary_text?: string;
    media_url?: string;
    destination_url?: string;
  };
  const targeting = entry.targeting_summary as {
    age_range?: string;
    genders?: string[];
    countries?: string[];
    interests_categories?: string[];
  };

  return (
    <li className="rounded-2xl bg-white border border-line overflow-hidden">
      {creative.media_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={creative.media_url}
          alt=""
          className="w-full h-48 object-cover bg-bg-soft"
        />
      ) : (
        <div className="w-full h-32 bg-bg-soft" />
      )}
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1.5">
          <p className="text-[14px] font-semibold text-night truncate">
            {entry.business_name}
          </p>
          <span
            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
              entry.is_active
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-bg-soft text-night-muted border-line"
            }`}
          >
            {entry.is_active ? "Active" : "Terminée"}
          </span>
        </div>
        {creative.headline ? (
          <p className="text-[13.5px] font-semibold text-night mt-1">
            {creative.headline}
          </p>
        ) : null}
        {creative.primary_text ? (
          <p className="text-[12px] text-night-soft mt-1 line-clamp-2">
            {creative.primary_text}
          </p>
        ) : null}
        {entry.paid_for_by ? (
          <p className="text-[11px] text-night-muted italic mt-2">
            Payé par : {entry.paid_for_by}
          </p>
        ) : null}

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <KV label="Période" value={periodStr(entry.first_served_at, entry.last_served_at)} />
          <KV label="Pays" value={(targeting.countries ?? []).join(", ")} />
          <KV label="Tranche d'âge" value={targeting.age_range ?? "—"} />
          <KV label="Genre" value={(targeting.genders ?? []).join(", ")} />
          <KV
            label="Intérêts"
            value={(targeting.interests_categories ?? []).join(", ")}
          />
          <KV label="Placements" value={entry.placements.join(", ")} />
          <KV label="Impressions" value={entry.impressions_range ?? "—"} />
          <KV label="Dépense" value={entry.spend_range ?? "—"} />
        </dl>

        <div className="mt-3 flex items-center justify-between gap-2">
          {creative.destination_url ? (
            <a
              href={creative.destination_url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[11.5px] text-gold-deep hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" aria-hidden />
              URL destination
            </a>
          ) : (
            <span />
          )}
          <Link
            href={`/legal/ads-library/${entry.id}/report`}
            className="text-[11.5px] text-red-700 hover:underline"
          >
            Signaler
          </Link>
        </div>
      </div>
    </li>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted font-bold">
        {label}
      </dt>
      <dd className="text-night-soft truncate">{value || "—"}</dd>
    </div>
  );
}

function periodStr(start: string, end: string | null): string {
  const s = new Date(start).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
  if (!end) return `Depuis ${s}`;
  const e = new Date(end).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
  return `${s} → ${e}`;
}
