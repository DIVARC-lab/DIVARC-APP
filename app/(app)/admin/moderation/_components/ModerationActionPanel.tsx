"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CATEGORY_BY_ID, REPORT_CATEGORIES } from "@/lib/moderation/categories";
import type {
  ModerationActionType,
  ModerationCategory,
} from "@/lib/database.types";
import type { ReportDetail } from "@/lib/queries/moderation";
import { applyModerationDecision } from "../actions";

type ActionOption = {
  id: ModerationActionType;
  label: string;
  helper: string;
  variant: "neutral" | "warn" | "danger" | "critical";
};

const ACTION_OPTIONS: readonly ActionOption[] = [
  {
    id: "no_action",
    label: "Aucune action",
    helper: "Faux positif ou hors-règles. Le report est rejeté.",
    variant: "neutral",
  },
  {
    id: "warn",
    label: "Avertissement",
    helper: "Niveau 1 du ladder. Le contenu reste visible.",
    variant: "neutral",
  },
  {
    id: "hide",
    label: "Masquage",
    helper: "Contenu retiré du public, l'auteur conserve l'accès.",
    variant: "warn",
  },
  {
    id: "delete",
    label: "Suppression",
    helper: "Contenu retiré définitivement (soft delete).",
    variant: "warn",
  },
  {
    id: "restrict_24h",
    label: "Restriction 24 h (lecture seule)",
    helper: "Niveau 2 du ladder. Pas de publication pendant 24 h.",
    variant: "warn",
  },
  {
    id: "restrict_7d",
    label: "Restriction 7 jours",
    helper: "Niveau 3.",
    variant: "warn",
  },
  {
    id: "restrict_30d",
    label: "Restriction 30 jours",
    helper: "Niveau 4. Précède le ban.",
    variant: "danger",
  },
  {
    id: "suspend",
    label: "Suspension",
    helper: "Niveau 5. Le compte est désactivé jusqu'à révision.",
    variant: "danger",
  },
  {
    id: "ban_permanent",
    label: "Bannissement définitif",
    helper: "Réservé aux violations graves (CSAM, incitation, doxxing).",
    variant: "critical",
  },
  {
    id: "escalate",
    label: "Escalade équipe T&S",
    helper: "Cas complexe — transmis à l'équipe spécialisée.",
    variant: "neutral",
  },
  {
    id: "authority_report",
    label: "Signalement aux autorités",
    helper: "Crée un incident critique (Pharos / NCMEC selon catégorie).",
    variant: "critical",
  },
] as const;

const TEMPLATES: Record<string, string> = {
  hate_speech:
    "Ce contenu enfreint nos règles communautaires interdisant les discours de haine visant un groupe protégé (origine, religion, orientation, handicap, genre).",
  harassment:
    "Ce contenu enfreint nos règles communautaires sur le harcèlement et l'intimidation.",
  violence:
    "Ce contenu enfreint nos règles communautaires interdisant les menaces et la promotion de la violence.",
  nudity_sexual:
    "Ce contenu enfreint nos règles communautaires sur la nudité et le contenu sexuel.",
  child_safety:
    "Ce contenu enfreint nos règles communautaires sur la protection des mineurs. Il a été transmis aux autorités compétentes.",
  self_harm:
    "Ce contenu a été examiné dans le cadre de notre dispositif de prévention. Si toi ou un proche êtes en détresse, le 3114 est gratuit, anonyme, 24h/24.",
  spam:
    "Ce contenu enfreint nos règles communautaires interdisant le spam et les comportements automatisés.",
  scam_fraud:
    "Ce contenu enfreint nos règles communautaires interdisant les arnaques, le phishing et les pratiques frauduleuses.",
  impersonation:
    "Ce contenu enfreint nos règles communautaires interdisant l'usurpation d'identité.",
  intellectual_property:
    "Ce contenu enfreint nos règles communautaires sur le respect de la propriété intellectuelle.",
  privacy:
    "Ce contenu enfreint nos règles communautaires sur la protection de la vie privée d'autrui.",
  illegal_activity:
    "Ce contenu enfreint nos règles communautaires interdisant la promotion d'activités illégales.",
  other:
    "Ce contenu enfreint nos règles communautaires.",
};

export function ModerationActionPanel({ report }: { report: ReportDetail }) {
  const router = useRouter();
  const [action, setAction] = useState<ModerationActionType>("no_action");
  const [category, setCategory] = useState<ModerationCategory>(report.category);
  const [reasonUser, setReasonUser] = useState(
    TEMPLATES[report.category] ?? "",
  );
  const [reasonInternal, setReasonInternal] = useState("");
  const [legalBasis, setLegalBasis] = useState("CGU §3 et §4");
  const [pending, startTransition] = useTransition();

  const cat = CATEGORY_BY_ID[category];

  function applyTemplate(c: ModerationCategory) {
    setCategory(c);
    setReasonUser(TEMPLATES[c] ?? "");
  }

  function submit() {
    if (reasonUser.length < 20) {
      toast.error(
        "Le motif communiqué à l'utilisateur doit faire au moins 20 caractères.",
      );
      return;
    }
    startTransition(async () => {
      const result = await applyModerationDecision({
        report_id: report.id,
        action,
        category_decision: category,
        reason_internal: reasonInternal || undefined,
        reason_user: reasonUser,
        legal_basis: legalBasis || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Décision enregistrée.");
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-line p-4 sm:p-5 sticky top-4">
      <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted mb-3">
        Décision
      </h3>

      <div className="space-y-1.5 mb-5">
        {ACTION_OPTIONS.map((opt) => (
          <label
            key={opt.id}
            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
              action === opt.id
                ? "border-night bg-night/5"
                : "border-transparent hover:bg-bg-soft"
            } ${
              opt.variant === "danger"
                ? "ring-1 ring-red-100"
                : opt.variant === "critical"
                  ? "ring-1 ring-red-200 bg-red-50/30"
                  : ""
            }`}
          >
            <input
              type="radio"
              name="action"
              value={opt.id}
              checked={action === opt.id}
              onChange={() => setAction(opt.id)}
              className="mt-1 accent-night shrink-0"
            />
            <span className="min-w-0 flex-1">
              <span
                className={`block text-[13px] font-semibold ${
                  opt.variant === "critical"
                    ? "text-red-700"
                    : opt.variant === "danger"
                      ? "text-red-600"
                      : "text-night"
                }`}
              >
                {opt.label}
              </span>
              <span className="block text-[11.5px] text-night-muted mt-0.5 leading-snug">
                {opt.helper}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div className="space-y-3.5">
        <div>
          <label
            htmlFor="cat-decision"
            className="block text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1.5"
          >
            Catégorie de violation (peut différer du report)
          </label>
          <select
            id="cat-decision"
            value={category}
            onChange={(e) => applyTemplate(e.target.value as ModerationCategory)}
            className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night"
          >
            {REPORT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="reason-user"
            className="block text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1.5"
          >
            Motif communiqué à l&apos;utilisateur · DSA art. 17
          </label>
          <textarea
            id="reason-user"
            rows={4}
            value={reasonUser}
            onChange={(e) => setReasonUser(e.target.value)}
            maxLength={2000}
            className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night resize-none"
          />
          <p className="text-[10.5px] text-night-muted mt-1">
            {reasonUser.length} / 2000 caractères · template{" "}
            <button
              type="button"
              onClick={() => applyTemplate(category)}
              className="text-gold-deep hover:underline font-semibold"
            >
              {cat?.label ?? "réinitialiser"}
            </button>
          </p>
        </div>

        <div>
          <label
            htmlFor="legal-basis"
            className="block text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1.5"
          >
            Base légale (optionnel)
          </label>
          <input
            id="legal-basis"
            type="text"
            value={legalBasis}
            onChange={(e) => setLegalBasis(e.target.value)}
            maxLength={500}
            placeholder='ex: "CGU §3.2" ou "Code pénal art. 222-33"'
            className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night"
          />
        </div>

        <div>
          <label
            htmlFor="reason-internal"
            className="block text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1.5"
          >
            Note interne (privée)
          </label>
          <textarea
            id="reason-internal"
            rows={3}
            value={reasonInternal}
            onChange={(e) => setReasonInternal(e.target.value)}
            maxLength={2000}
            placeholder="Visible uniquement par les modérateurs."
            className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night resize-none"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2.5">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-night text-cream text-[13px] font-semibold disabled:opacity-50 hover:bg-night/90"
        >
          {pending ? "Application…" : "Appliquer la décision"}
        </button>
      </div>
      <p className="text-[10.5px] text-night-muted text-center mt-2.5">
        L&apos;action sera loggée dans l&apos;audit log immuable et l&apos;auteur
        recevra une notification motivée.
      </p>
    </div>
  );
}
