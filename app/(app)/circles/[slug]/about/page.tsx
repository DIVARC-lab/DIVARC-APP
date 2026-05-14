import {
  AlertTriangle,
  BarChart3,
  Flag,
  Globe,
  Info,
  Lock,
  MapPin,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { getCircleCategory } from "@/lib/circles/categories";
import { getCircleBySlug, listCircleRules } from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import type { CircleRule } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

type Params = Promise<{ slug: string }>;

export const metadata = {
  title: "À propos du cercle",
};

/* Onglet "À propos" v2 — description + règles iconées + infos + stats publiques.
 * Bouton "Signaler ce cercle" en bas (lien vers la modération globale). */
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

  const rules = await listCircleRules(circle.id);

  const category = getCircleCategory(circle.primary_category);
  const createdAt = new Date(circle.created_at).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isPrivate = circle.is_private || circle.type === "private";
  const isPublic = circle.visibility === "public";
  const typeLabel = isPrivate ? "Privé" : "Public";
  const visibilityLabel = isPublic
    ? "Découvrable"
    : circle.visibility === "unlisted"
      ? "Sur lien direct uniquement"
      : "Sur invitation";

  const vitality = circle.vitality_score ?? 0;
  const engagementPct = (circle.engagement_rate ?? 0) * 100;

  return (
    <section className="px-5 sm:px-8 pb-10 space-y-6">
      {/* DESCRIPTION */}
      {circle.description ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-gold-deep" aria-hidden />
            <KickerLabel>À propos</KickerLabel>
          </div>
          <div className="rounded-2xl bg-white border border-line p-4 sm:p-5">
            <p className="text-[14px] text-night-soft leading-relaxed whitespace-pre-line">
              {circle.description}
            </p>
          </div>
        </div>
      ) : null}

      {/* RÈGLES */}
      {rules.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-gold-deep" aria-hidden />
            <KickerLabel>Règles du cercle</KickerLabel>
          </div>
          <ol className="rounded-2xl bg-white border border-line divide-y divide-line overflow-hidden">
            {rules.map((rule) => (
              <RuleItem key={rule.id} rule={rule} />
            ))}
          </ol>
        </div>
      ) : null}

      {/* INFORMATIONS */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-gold-deep" aria-hidden />
          <KickerLabel>Informations</KickerLabel>
        </div>
        <dl className="rounded-2xl bg-white border border-line divide-y divide-line overflow-hidden">
          <InfoRow label="Créé le" value={createdAt} />
          {category ? (
            <InfoRow label="Catégorie" value={category.label} />
          ) : null}
          <InfoRow label="Langue" value={circle.language.toUpperCase()} />
          {circle.is_local && circle.location_city ? (
            <InfoRow
              label="Localisation"
              value={`${circle.location_city}${circle.location_country ? ` · ${circle.location_country}` : ""}`}
              icon={MapPin}
            />
          ) : null}
          <InfoRow
            label="Type"
            value={typeLabel}
            icon={isPrivate ? Lock : undefined}
          />
          <InfoRow label="Visibilité" value={visibilityLabel} />
          {circle.tags && circle.tags.length > 0 ? (
            <InfoRow
              label="Tags"
              value={circle.tags
                .slice(0, 8)
                .map((t) => `#${t}`)
                .join("  ")}
            />
          ) : null}
        </dl>
      </div>

      {/* STATISTIQUES PUBLIQUES */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-gold-deep" aria-hidden />
          <KickerLabel>Statistiques publiques</KickerLabel>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatTile
            label="Membres total"
            value={circle.members_count.toLocaleString("fr-FR")}
            tone="night"
          />
          <StatTile
            label="Actifs cette semaine"
            value={circle.active_members_count_7d.toLocaleString("fr-FR")}
            tone="emerald"
            icon={Sparkles}
          />
          <StatTile
            label="Posts (7j)"
            value={circle.posts_count_7d.toLocaleString("fr-FR")}
            tone="gold"
            icon={TrendingUp}
          />
          <StatTile
            label="Engagement"
            value={`${engagementPct.toFixed(1)}%`}
            tone="violet"
          />
        </div>

        {/* Score de Vitalité */}
        <div className="mt-3 rounded-2xl bg-gradient-to-br from-night to-night-soft text-cream p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold">
                · Vitalité
              </p>
              <p className="mt-1 font-display italic text-[28px] leading-none">
                {vitality.toFixed(1)}
                <span className="text-cream/60 text-[14px] not-italic font-normal ml-1">
                  / 100
                </span>
              </p>
            </div>
            <p className="text-[10px] text-cream/70 text-right max-w-[180px]">
              Score recalculé chaque jour selon posts, engagement, nouveaux
              membres, rétention. Formule transparente.
            </p>
          </div>
          <div className="mt-3 h-2 rounded-full bg-cream/15 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold-deep rounded-full"
              style={{ width: `${Math.min(vitality, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* CTA Signaler */}
      <div className="pt-3">
        <Link
          href={`/legal/transparency-report?circle=${circle.id}`}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white border border-error/30 text-error text-[12px] font-bold hover:bg-error-bg transition-colors"
        >
          <Flag className="w-3.5 h-3.5" aria-hidden />
          Signaler ce cercle
        </Link>
        <p className="mt-2 text-[10px] text-night-dim leading-relaxed max-w-prose">
          L&apos;équipe modération DIVARC examine chaque signalement dans les
          48h. Tu peux aussi quitter le cercle à tout moment depuis les
          notifications.
        </p>
      </div>
    </section>
  );
}

function RuleItem({ rule }: { rule: CircleRule }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span
        aria-hidden
        className={cn(
          "shrink-0 inline-flex w-7 h-7 rounded-lg items-center justify-center text-[11px] font-extrabold",
          rule.is_critical
            ? "bg-error-bg text-error"
            : "bg-bg-soft text-night",
        )}
      >
        {rule.is_critical ? (
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
        ) : (
          rule.position
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-bold text-night leading-tight">
          {rule.title}
          {rule.is_critical ? (
            <span className="ml-2 text-[9.5px] font-extrabold uppercase tracking-wider text-error">
              · Règle critique
            </span>
          ) : null}
        </p>
        {rule.description ? (
          <p className="mt-1 text-[12px] text-night-soft leading-snug">
            {rule.description}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Lock;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-3">
      <dt className="text-[12px] text-night-dim font-medium">{label}</dt>
      <dd className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-night text-right truncate">
        {Icon ? <Icon className="w-3.5 h-3.5" aria-hidden /> : null}
        {value}
      </dd>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "night" | "emerald" | "gold" | "violet";
  icon?: typeof Sparkles;
}) {
  const toneClass = {
    night: "bg-white border-line text-night",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    gold: "bg-gold/10 border-gold/30 text-gold-deep",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
  }[tone];

  return (
    <div className={`rounded-2xl border p-3.5 ${toneClass}`}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] opacity-80">
        {label}
      </p>
      <p className="mt-1 inline-flex items-center gap-1 font-display italic text-[22px] leading-none tabular-nums">
        {Icon ? <Icon className="w-3.5 h-3.5 not-italic" aria-hidden /> : null}
        {value}
      </p>
    </div>
  );
}
