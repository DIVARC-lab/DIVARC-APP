/* DiscoverReasonChip — Chantier Feed 5.4.
 *
 * Affiche une raison "humaine" pour chaque post découvert, avec les chiffres
 * exacts (ex : "3 amis ont réagi"). Lien vers /about/feed-algorithm pour
 * la transparence complète.
 */
import { Eye, Flame, Sprout, UsersRound } from "lucide-react";
import Link from "next/link";
import type {
  DiscoverReasonType,
} from "@/lib/database.types";

type Props = {
  reasonType: DiscoverReasonType;
  reasonData: Record<string, number>;
};

const TONE: Record<DiscoverReasonType, string> = {
  trending_diverse: "bg-rose-50 text-rose-700",
  friend_echo: "bg-night/8 text-night",
  rising_voice: "bg-emerald-50 text-emerald-700",
};

const ICON = {
  trending_diverse: Flame,
  friend_echo: UsersRound,
  rising_voice: Sprout,
} as const;

function humanize(
  reasonType: DiscoverReasonType,
  data: Record<string, number>,
): string {
  switch (reasonType) {
    case "trending_diverse": {
      const c = data.commenters ?? 0;
      const r = data.reactors ?? 0;
      return `${c} commentent · ${r} réagissent`;
    }
    case "friend_echo": {
      const n = data.friend_reactors ?? 0;
      return n > 1 ? `${n} amis ont réagi` : `Un ami a réagi`;
    }
    case "rising_voice": {
      const r = data.external_reactions ?? 0;
      const f = data.author_friends ?? 0;
      return `Voix émergente · ${r} réactions · ${f} amis`;
    }
  }
}

export function DiscoverReasonChip({ reasonType, reasonData }: Props) {
  const Icon = ICON[reasonType];
  const label = humanize(reasonType, reasonData);

  return (
    <Link
      href="/about/feed-algorithm"
      target="_blank"
      rel="noopener"
      title="Voir pourquoi ce post est surfacé"
      className={`inline-flex items-center gap-1.5 h-5 px-2 rounded-full text-[10px] font-extrabold hover:opacity-80 transition-opacity ${TONE[reasonType]}`}
    >
      <Icon className="w-2.5 h-2.5" aria-hidden />
      {label}
      <Eye className="w-2.5 h-2.5 opacity-60" aria-hidden />
    </Link>
  );
}
