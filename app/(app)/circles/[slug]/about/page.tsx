import { Info } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { getCircleBySlug } from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import { getCircleCategory } from "@/lib/circles/categories";

type Params = Promise<{ slug: string }>;

export const metadata = {
  title: "À propos du cercle",
};

/* Onglet "À propos" — placeholder V1 minimal.
 * Chantier 3.8 : description markdown + règles + stats publiques + vitality_score. */
export default async function CircleAboutTab({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  const category = getCircleCategory(circle.primary_category);
  const createdAt = new Date(circle.created_at).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="px-5 sm:px-8">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-4 h-4 text-gold-deep" aria-hidden />
        <KickerLabel>À propos</KickerLabel>
      </div>

      {circle.description ? (
        <div className="rounded-2xl bg-white border border-line p-4 sm:p-5 mb-4">
          <p className="text-[14px] text-night-soft leading-relaxed whitespace-pre-line">
            {circle.description}
          </p>
        </div>
      ) : null}

      <dl className="rounded-2xl bg-white border border-line divide-y divide-line overflow-hidden mb-4">
        <Row label="Créé le" value={createdAt} />
        <Row label="Catégorie" value={category?.label ?? "—"} />
        <Row label="Langue" value={circle.language.toUpperCase()} />
        {circle.is_local && circle.location_city ? (
          <Row
            label="Localisation"
            value={`${circle.location_city}${circle.location_country ? ` · ${circle.location_country}` : ""}`}
          />
        ) : null}
        <Row
          label="Type"
          value={
            circle.is_private || circle.type === "private"
              ? "Privé"
              : "Public"
          }
        />
      </dl>

      <p className="text-[11px] text-night-dim text-center">
        Règles, stats publiques et score de vitalité arrivent bientôt.
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-3">
      <dt className="text-[12px] text-night-dim font-medium">{label}</dt>
      <dd className="text-[13px] font-semibold text-night text-right truncate">
        {value}
      </dd>
    </div>
  );
}
