import Link from "next/link";

type Props = {
  emoji: string;
  title: string;
  body: string;
  circleSlug: string;
};

/* Stub réutilisable pour les onglets non encore implémentés (Market/Jobs/
 * Library/Events V2). Chaque stub mentionne le chantier prévu pour
 * indiquer la roadmap. */
export function CircleTabStub({ emoji, title, body, circleSlug }: Props) {
  return (
    <div className="px-5 sm:px-8 py-10">
      <div className="mx-auto max-w-md text-center">
        <span
          aria-hidden
          className="inline-flex w-16 h-16 rounded-2xl bg-bg items-center justify-center text-[36px] border border-line"
        >
          {emoji}
        </span>
        <h2 className="mt-4 font-display italic text-[22px] text-night leading-tight">
          {title}
        </h2>
        <p className="mt-2 text-[13px] text-night-dim leading-relaxed">
          {body}
        </p>
        <Link
          href={`/circles/${circleSlug}`}
          className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-line text-night text-[12px] font-bold hover:border-gold/40 transition-colors"
        >
          ← Retour aux discussions
        </Link>
      </div>
    </div>
  );
}
