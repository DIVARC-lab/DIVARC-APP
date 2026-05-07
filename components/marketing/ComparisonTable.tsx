import { Check, Minus, X } from "lucide-react";

type Capability = {
  label: string;
  divarc: boolean | "partial";
  facebook: boolean | "partial";
  whatsapp: boolean | "partial";
  linkedin: boolean | "partial";
};

const CAPS: Capability[] = [
  { label: "Messagerie chiffrée", divarc: true, facebook: false, whatsapp: true, linkedin: false },
  { label: "Marketplace locale", divarc: true, facebook: "partial", whatsapp: false, linkedin: false },
  { label: "Réseau pro & emploi", divarc: true, facebook: false, whatsapp: false, linkedin: true },
  { label: "Mobile Money intégré", divarc: true, facebook: false, whatsapp: false, linkedin: false },
  { label: "Multi-devise (EUR · CFA · MAD…)", divarc: true, facebook: false, whatsapp: false, linkedin: false },
  { label: "Pensé pour la francophonie", divarc: true, facebook: false, whatsapp: false, linkedin: false },
  { label: "Sans algorithme toxique", divarc: true, facebook: false, whatsapp: true, linkedin: false },
  { label: "Données possédées en Europe", divarc: true, facebook: false, whatsapp: false, linkedin: false },
];

export function ComparisonTable() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white border border-line shadow-soft">
      <table className="w-full">
        <thead className="bg-night/[0.03] border-b border-line">
          <tr>
            <th className="text-left px-5 sm:px-7 py-4 text-xs font-semibold uppercase tracking-widest text-muted">
              Capacité
            </th>
            <Th label="DIVARC" highlight />
            <Th label="Facebook" />
            <Th label="WhatsApp" />
            <Th label="LinkedIn" />
          </tr>
        </thead>
        <tbody>
          {CAPS.map((cap, idx) => (
            <tr
              key={cap.label}
              className={
                idx % 2 === 1 ? "bg-night/[0.015]" : ""
              }
            >
              <td className="px-5 sm:px-7 py-4 text-sm font-medium text-night">
                {cap.label}
              </td>
              <Cell value={cap.divarc} highlight />
              <Cell value={cap.facebook} />
              <Cell value={cap.whatsapp} />
              <Cell value={cap.linkedin} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <th
      className={`text-center px-3 py-4 text-xs font-semibold uppercase tracking-widest ${
        highlight ? "text-gold-deep" : "text-muted"
      }`}
    >
      {label}
    </th>
  );
}

function Cell({
  value,
  highlight,
}: {
  value: boolean | "partial";
  highlight?: boolean;
}) {
  return (
    <td className="px-3 py-4 text-center">
      <span
        className={`inline-flex w-7 h-7 rounded-full items-center justify-center ${
          value === true
            ? highlight
              ? "bg-night text-cream"
              : "bg-emerald-50 text-emerald-600"
            : value === "partial"
              ? "bg-gold/15 text-gold-deep"
              : "bg-red-50 text-red-500"
        }`}
        aria-label={
          value === true
            ? "Disponible"
            : value === "partial"
              ? "Partiellement"
              : "Non disponible"
        }
      >
        {value === true ? (
          <Check className="w-4 h-4" />
        ) : value === "partial" ? (
          <Minus className="w-4 h-4" />
        ) : (
          <X className="w-4 h-4" />
        )}
      </span>
    </td>
  );
}
