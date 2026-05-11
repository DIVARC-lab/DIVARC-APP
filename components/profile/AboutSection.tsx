import { Info } from "lucide-react";
import type { ExtendedProfileHeader } from "@/lib/queries/extendedProfile";

/* AboutSection — bio + interests + citations.
 *
 * V2 V1 : rendu markdown simple (paragraphs split + linkify mentions/
 * hashtags via lib existante). V4 : éditeur WYSIWYG markdown complet
 * avec mentions @ autocomplete (déjà présent dans linkifyMentions).
 *
 * Interests : tags cliquables vers la taxonomie DIVARC (V4 page tag). */

type Props = {
  profile: ExtendedProfileHeader;
  interests?: string[];
};

export function AboutSection({ profile, interests = [] }: Props) {
  const hasContent = !!profile.bio || interests.length > 0;
  if (!hasContent) {
    return (
      <div className="rounded-2xl bg-white border border-line p-6 text-center">
        <Info className="w-6 h-6 text-night-dim mx-auto mb-2" aria-hidden />
        <p className="text-[13px] text-night-muted">
          Aucune présentation pour l&apos;instant.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {profile.bio ? (
        <div className="rounded-2xl bg-white border border-line p-5">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-night-muted mb-3">
            Présentation
          </h2>
          <div className="prose prose-sm max-w-none text-night leading-relaxed whitespace-pre-wrap">
            {profile.bio}
          </div>
        </div>
      ) : null}

      {interests.length > 0 ? (
        <div className="rounded-2xl bg-white border border-line p-5">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-night-muted mb-3">
            Centres d&apos;intérêt
          </h2>
          <div className="flex flex-wrap gap-2">
            {interests.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-bg-soft text-[12.5px] font-semibold text-night-soft border border-line"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
