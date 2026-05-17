import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

type Milestone = {
  sprint: number;
  title: string;
  description: string;
  status: "done" | "in-progress" | "planned";
};

const MILESTONES: Milestone[] = [
  {
    sprint: 1,
    title: "Compte & authentification",
    description:
      "Inscription, confirmation email, sessions sécurisées avec Supabase.",
    status: "done",
  },
  {
    sprint: 2,
    title: "Profil & préférences",
    description:
      "Identité, avatar, langue, devise, confidentialité, sécurité.",
    status: "done",
  },
  {
    sprint: 3,
    title: "Discussions temps réel",
    description:
      "Messagerie 1-1 et groupes, indicateurs de lecture, médias.",
    status: "in-progress",
  },
  {
    sprint: 4,
    title: "Marketplace locale",
    description:
      "Annonces géolocalisées, photos, recherche, favoris.",
    status: "planned",
  },
  {
    sprint: 5,
    title: "Paiements multi-devise",
    description:
      "Stripe + Wave + Orange Money. Transferts entre francophones.",
    status: "planned",
  },
  {
    sprint: 6,
    title: "Emploi & freelance",
    description:
      "Profil pro, missions courtes, recrutement local.",
    status: "planned",
  },
];

export function RoadmapTimeline() {
  return (
    <ol className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {MILESTONES.map((m) => (
        <li
          key={m.sprint}
          className={`p-6 rounded-3xl border transition-all ${
            m.status === "done"
              ? "bg-emerald-50/40 border-emerald-100"
              : m.status === "in-progress"
                ? "bg-gradient-to-br from-[#fff8e8] to-bg border-gold/40 shadow-soft"
                : "bg-white border-[#e6e9f0] border-dashed"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#2a3d6b]">
              Sprint {m.sprint}
            </span>
            <Pill status={m.status} />
          </div>
          <h3 className="mt-3 font-display text-2xl text-[#0a1f44]">{m.title}</h3>
          <p className="mt-2 text-sm text-[#2a3d6b] leading-relaxed">
            {m.description}
          </p>
        </li>
      ))}
    </ol>
  );
}

function Pill({ status }: { status: Milestone["status"] }) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest">
        <CheckCircle2 className="w-3 h-3" aria-hidden />
        Livré
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#f4b942]/20 text-[#b88a2a] text-[10px] font-bold uppercase tracking-widest">
        <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
        En cours
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0a1f44]/10 text-[#2a3d6b] text-[10px] font-bold uppercase tracking-widest">
      <Sparkles className="w-3 h-3" aria-hidden />
      À venir
    </span>
  );
}
