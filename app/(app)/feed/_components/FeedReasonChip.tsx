/* FeedReasonChip — Chantier Feed v2.3.
 *
 * Mini chip affiché en haut d'un post lorsqu'il a été surfacé par feed_v2.
 * Indique la raison textuelle (« voix émergente », « cercle proche »...)
 * + un lien discret vers la page transparence.
 */
import { Eye } from "lucide-react";
import Link from "next/link";

type Props = {
  reason: string;
};

export function FeedReasonChip({ reason }: Props) {
  return (
    <Link
      href="/about/feed-algorithm"
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-gold/10 text-gold-deep text-[10px] font-extrabold hover:bg-gold/20 transition-colors"
      title="Voir pourquoi ce post est surfacé"
    >
      <Eye className="w-2.5 h-2.5" aria-hidden />
      {reason}
    </Link>
  );
}
