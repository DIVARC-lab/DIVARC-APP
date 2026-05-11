import { MessageSquareQuote } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { safeFormatDate } from "@/lib/utils/date";
import type { ProfileRecommendation } from "@/lib/database.types";

/* RecommendationsSection — reçues. Pour le tab "Donnés" et le formulaire
 * "Demander une recommandation", étape 6 V2. */

const RELATIONSHIP_LABELS: Record<ProfileRecommendation["relationship"], string> = {
  manager: "Manager",
  report: "Subordonné(e)",
  colleague: "Collègue",
  client: "Client",
  supplier: "Fournisseur",
  mentor: "Mentor",
  mentee: "Mentee",
  classmate: "Camarade d'études",
  professor: "Professeur",
  student: "Étudiant(e)",
  collaborator: "Collaborateur",
  business_partner: "Partenaire business",
  friend: "Ami(e)",
  custom: "Autre",
};

type AuthorInfo = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  headline: string | null;
};

type Props = {
  recommendations: ProfileRecommendation[];
  authorById: Map<string, AuthorInfo>;
};

export function RecommendationsSection({
  recommendations,
  authorById,
}: Props) {
  if (recommendations.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-line p-6 text-center">
        <MessageSquareQuote className="w-6 h-6 text-night-dim mx-auto mb-2" aria-hidden />
        <p className="text-[13px] text-night-muted">
          Aucune recommandation visible.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-white border border-line overflow-hidden">
      <header className="px-5 py-4 border-b border-line flex items-center gap-2">
        <MessageSquareQuote className="w-4 h-4 text-gold-deep" aria-hidden />
        <h2 className="text-[14px] font-bold text-night">Recommandations</h2>
        <span className="text-[12px] text-night-muted">
          · {recommendations.length}
        </span>
      </header>
      <ul className="divide-y divide-line">
        {recommendations.map((reco) => {
          const author = authorById.get(reco.from_user_id);
          const relationshipLabel =
            reco.relationship === "custom" && reco.relationship_custom
              ? reco.relationship_custom
              : RELATIONSHIP_LABELS[reco.relationship];

          return (
            <li key={reco.id} className="px-5 py-4 flex gap-4">
              <Avatar
                src={author?.avatar_url ?? null}
                fullName={author?.full_name ?? author?.username ?? "?"}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-semibold text-night">
                  {author?.full_name ?? author?.username ?? "Utilisateur"}
                </p>
                {author?.headline ? (
                  <p className="text-[11.5px] text-night-muted truncate">
                    {author.headline}
                  </p>
                ) : null}
                <p className="mt-0.5 text-[11.5px] text-night-dim">
                  {relationshipLabel} ·{" "}
                  {safeFormatDate(reco.given_at, {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <blockquote className="mt-2 text-[13.5px] text-night-soft leading-relaxed border-l-2 border-gold pl-3 italic">
                  {reco.body}
                </blockquote>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
