import type { Field, CategoryAttributeSchema } from "@/lib/marketplace/attributes-schemas";
import { getAttributeSchema } from "@/lib/marketplace/attributes-schemas";
import type { UiMode } from "@/lib/marketplace/taxonomy";

type Props = {
  uiMode: UiMode;
  categoryId: string | null;
  attributes: Record<string, unknown> | null | undefined;
};

/* Chantier 3 — Page produit adaptative.
 *
 * Affiche les attributs dynamiques du listing dans un layout adapté au
 * ui_mode de la catégorie :
 *   - vehicle_specialized   → grid technique (marque/modèle/année/km en hero)
 *   - real_estate_specialized → grid surface/pièces/DPE/GES en hero
 *   - vinted (mode/fashion)  → focus marque + taille + couleur
 *   - leboncoin / autres     → grid 2 colonnes générique
 *
 * Si la catégorie n'a pas de schéma défini (ex: catégorie "leboncoin"
 * sans attributs requis), on n'affiche rien (return null) plutôt que des
 * sections vides. */
export function ListingAttributesPanel({
  uiMode,
  categoryId,
  attributes,
}: Props) {
  const schema = categoryId ? getAttributeSchema(categoryId) : null;
  if (!schema || !attributes || Object.keys(attributes).length === 0) {
    return null;
  }

  switch (uiMode) {
    case "vehicle_specialized":
      return <VehiclePanel schema={schema} attrs={attributes} />;
    case "real_estate_specialized":
      return <RealEstatePanel schema={schema} attrs={attributes} />;
    case "vinted":
      return <VintedPanel schema={schema} attrs={attributes} />;
    default:
      return <GenericPanel schema={schema} attrs={attributes} />;
  }
}

/* ============================================================================
 * Variants
 * ============================================================================ */

function VehiclePanel({
  schema,
  attrs,
}: {
  schema: CategoryAttributeSchema;
  attrs: Record<string, unknown>;
}) {
  const hero = [
    pickAttr(schema, attrs, "year"),
    pickAttr(schema, attrs, "mileage_km"),
    pickAttr(schema, attrs, "fuel_type"),
    pickAttr(schema, attrs, "transmission"),
  ].filter((x): x is RenderedAttr => x !== null);

  const brand = pickAttr(schema, attrs, "brand");
  const model = pickAttr(schema, attrs, "model");

  const rest = collectRest(schema, attrs, [
    "brand",
    "model",
    "year",
    "mileage_km",
    "fuel_type",
    "transmission",
  ]);

  return (
    <section className="mt-5" aria-labelledby="vehicle-attrs-heading">
      <span
        id="vehicle-attrs-heading"
        className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep"
      >
        · Fiche technique
      </span>

      {brand || model ? (
        <p className="mt-1.5 font-display italic text-[22px] text-night leading-tight">
          {brand?.display ?? ""} {model?.display ?? ""}
        </p>
      ) : null}

      {hero.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {hero.map((h) => (
            <AttrTile key={h.key} attr={h} accent />
          ))}
        </div>
      ) : null}

      {rest.length > 0 ? (
        <dl className="mt-3 rounded-[14px] bg-white border border-line divide-y divide-line overflow-hidden">
          {rest.map((r) => (
            <Row key={r.key} attr={r} />
          ))}
        </dl>
      ) : null}
    </section>
  );
}

function RealEstatePanel({
  schema,
  attrs,
}: {
  schema: CategoryAttributeSchema;
  attrs: Record<string, unknown>;
}) {
  const hero = [
    pickAttr(schema, attrs, "surface_m2"),
    pickAttr(schema, attrs, "rooms"),
    pickAttr(schema, attrs, "bedrooms"),
    pickAttr(schema, attrs, "floor"),
  ].filter((x): x is RenderedAttr => x !== null);

  const dpe = pickAttr(schema, attrs, "dpe_class");
  const ges = pickAttr(schema, attrs, "ges_class");

  const rest = collectRest(schema, attrs, [
    "surface_m2",
    "rooms",
    "bedrooms",
    "floor",
    "dpe_class",
    "ges_class",
  ]);

  return (
    <section className="mt-5" aria-labelledby="real-estate-heading">
      <span
        id="real-estate-heading"
        className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep"
      >
        · Caractéristiques
      </span>

      {hero.length > 0 ? (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {hero.map((h) => (
            <AttrTile key={h.key} attr={h} accent />
          ))}
        </div>
      ) : null}

      {dpe || ges ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {dpe ? <EnergyBadge label="DPE" value={dpe.display} /> : null}
          {ges ? <EnergyBadge label="GES" value={ges.display} /> : null}
        </div>
      ) : null}

      {rest.length > 0 ? (
        <dl className="mt-3 rounded-[14px] bg-white border border-line divide-y divide-line overflow-hidden">
          {rest.map((r) => (
            <Row key={r.key} attr={r} />
          ))}
        </dl>
      ) : null}
    </section>
  );
}

function VintedPanel({
  schema,
  attrs,
}: {
  schema: CategoryAttributeSchema;
  attrs: Record<string, unknown>;
}) {
  const brand = pickAttr(schema, attrs, "brand");
  const size = pickAttr(schema, attrs, "size");
  const color = pickAttr(schema, attrs, "color");

  const rest = collectRest(schema, attrs, ["brand", "size", "color"]);

  return (
    <section className="mt-5" aria-labelledby="fashion-attrs-heading">
      <span
        id="fashion-attrs-heading"
        className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep"
      >
        · À propos de l&apos;article
      </span>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {brand ? <BoldChip label="Marque" value={brand.display} /> : null}
        {size ? <BoldChip label="Taille" value={size.display} /> : null}
        {color ? <BoldChip label="Couleur" value={color.display} /> : null}
      </div>

      {rest.length > 0 ? (
        <dl className="mt-3 rounded-[14px] bg-white border border-line divide-y divide-line overflow-hidden">
          {rest.map((r) => (
            <Row key={r.key} attr={r} />
          ))}
        </dl>
      ) : null}
    </section>
  );
}

function GenericPanel({
  schema,
  attrs,
}: {
  schema: CategoryAttributeSchema;
  attrs: Record<string, unknown>;
}) {
  const all = collectRest(schema, attrs, []);
  if (all.length === 0) return null;

  return (
    <section className="mt-5" aria-labelledby="generic-attrs-heading">
      <span
        id="generic-attrs-heading"
        className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep"
      >
        · Détails
      </span>
      <dl className="mt-2 rounded-[14px] bg-white border border-line divide-y divide-line overflow-hidden">
        {all.map((r) => (
          <Row key={r.key} attr={r} />
        ))}
      </dl>
    </section>
  );
}

/* ============================================================================
 * Primitives d'affichage
 * ============================================================================ */

function AttrTile({ attr, accent }: { attr: RenderedAttr; accent?: boolean }) {
  return (
    <div
      className={
        accent
          ? "rounded-[12px] bg-night text-cream p-2.5"
          : "rounded-[12px] bg-white border border-line p-2.5"
      }
    >
      <p
        className={
          accent
            ? "text-[10px] font-extrabold uppercase tracking-[0.08em] text-cream/70"
            : "text-[10px] font-extrabold uppercase tracking-[0.08em] text-night-dim"
        }
      >
        {attr.label}
      </p>
      <p
        className={
          accent
            ? "mt-1 text-[14px] font-bold truncate"
            : "mt-1 text-[13px] font-semibold text-night truncate"
        }
      >
        {attr.display}
      </p>
    </div>
  );
}

function Row({ attr }: { attr: RenderedAttr }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3.5 py-2.5">
      <dt className="text-[12px] text-night-dim font-medium shrink-0">
        {attr.label}
      </dt>
      <dd className="text-[13px] text-night font-semibold text-right truncate">
        {attr.display}
      </dd>
    </div>
  );
}

function BoldChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-night text-cream text-[12px] font-bold">
      <span className="text-cream/60 text-[10px] uppercase tracking-wider">
        {label}
      </span>
      {value}
    </span>
  );
}

function EnergyBadge({ label, value }: { label: string; value: string }) {
  /* DPE classes : A (vert) → G (rouge). Affichage simple, sans la barre
   * graphique réglementaire (à faire en V2). */
  const cls = value.toUpperCase();
  const colorMap: Record<string, string> = {
    A: "bg-emerald-500 text-white",
    B: "bg-lime-500 text-white",
    C: "bg-yellow-400 text-night",
    D: "bg-amber-400 text-night",
    E: "bg-orange-500 text-white",
    F: "bg-red-500 text-white",
    G: "bg-red-700 text-white",
  };
  const bg = colorMap[cls] ?? "bg-night text-cream";
  return (
    <div className="rounded-[12px] bg-white border border-line p-2.5 flex items-center gap-2.5">
      <span
        aria-hidden
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md font-extrabold text-[14px] ${bg}`}
      >
        {cls}
      </span>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-night-dim">
          {label}
        </p>
        <p className="text-[12px] font-semibold text-night">
          Classe {cls}
        </p>
      </div>
    </div>
  );
}

/* ============================================================================
 * Helpers de rendu
 * ============================================================================ */

type RenderedAttr = {
  key: string;
  label: string;
  display: string;
};

function pickAttr(
  schema: CategoryAttributeSchema,
  attrs: Record<string, unknown>,
  key: string,
): RenderedAttr | null {
  const field = findField(schema, key);
  if (!field) return null;
  const raw = attrs[key];
  const display = formatValue(field, raw);
  if (!display) return null;
  return { key, label: field.label, display };
}

function findField(
  schema: CategoryAttributeSchema,
  key: string,
): Field | null {
  for (const f of schema.required) if (f.key === key) return f;
  for (const f of schema.optional) if (f.key === key) return f;
  return null;
}

function collectRest(
  schema: CategoryAttributeSchema,
  attrs: Record<string, unknown>,
  exclude: string[],
): RenderedAttr[] {
  const excludeSet = new Set(exclude);
  const out: RenderedAttr[] = [];

  for (const field of [...schema.required, ...schema.optional]) {
    if (excludeSet.has(field.key)) continue;
    const display = formatValue(field, attrs[field.key]);
    if (!display) continue;
    out.push({ key: field.key, label: field.label, display });
  }
  return out;
}

function formatValue(field: Field, raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;

  switch (field.type) {
    case "select": {
      const opt = field.options.find((o) => o.value === raw);
      return opt?.label ?? String(raw);
    }
    case "multi_select": {
      if (!Array.isArray(raw) || raw.length === 0) return null;
      const labels = raw.map((v) => {
        const opt = field.options.find((o) => o.value === v);
        return opt?.label ?? String(v);
      });
      return labels.join(", ");
    }
    case "autocomplete": {
      /* Les suggestions sont une simple liste de strings — on affiche la
       * valeur brute (qui correspond à la suggestion choisie ou au custom). */
      return String(raw);
    }
    case "number": {
      const n = Number(raw);
      if (!Number.isFinite(n)) return null;
      const formatted = field.integer
        ? n.toLocaleString("fr-FR")
        : n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
      return field.unit ? `${formatted} ${field.unit}` : formatted;
    }
    case "boolean": {
      return raw ? "Oui" : "Non";
    }
    case "date": {
      const d = new Date(String(raw));
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    case "text":
    case "rich_text": {
      const s = String(raw).trim();
      if (!s) return null;
      /* Pour les textes longs (rich_text > 200 char) on laisse la section
       * description / panneau dédié s'en occuper. Ici on tronque. */
      return s.length > 160 ? `${s.slice(0, 157)}…` : s;
    }
    default: {
      const _exhaustive: never = field;
      void _exhaustive;
      return null;
    }
  }
}

