import {
  ArrowLeft,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/primitives/Container";
import {
  EXPERIMENTS,
  getExperimentVariant,
  type ExperimentId,
} from "@/lib/experiments";

export const metadata = {
  title: "Comment fonctionne mon algorithme",
};

/* /settings/algorithm/transparency — DSA art. 27.
 *
 * §1 : "les principaux paramètres utilisés dans leurs systèmes de
 *       recommandation, ainsi que toute option permettant aux
 *       destinataires du service de modifier ou d'influencer ces
 *       principaux paramètres."
 *
 * §3 : "au moins une option qui n'est pas fondée sur le profilage" →
 *       mode chronologique (déjà sur la page parente).
 *
 * Cette page complète /settings/algorithm avec :
 *  - L'explication littérale des 5 critères + leurs poids réels
 *  - Les agrégats personnels (events_processed, top auteurs, top topics,
 *    distribution events) pour rendre l'algorithme tangible
 *  - Une FAQ courte sur les garde-fous (cap 2 posts/auteur, exclusion
 *    hidden_users, fallback chrono si profil vide).
 *
 * Note : les poids affichés sont les valeurs codées en dur dans
 * lib/recsys/ranker.ts. Si on les change, mettre à jour ici aussi.
 */

const CRITERIA = [
  {
    id: "freshness",
    label: "Fraîcheur",
    weight: 1.0,
    icon: Sparkles,
    detail:
      "Plus un post est récent, plus il a de chances d'apparaître. La pondération suit une décroissance exponentielle avec une demi-vie de 24 h : un post de 24 h vaut 0.5, un post de 48 h vaut 0.25.",
    userControl:
      "Choisis le mode chronologique strict pour ignorer tous les autres critères.",
  },
  {
    id: "network",
    label: "Proximité réseau",
    weight: 2.0,
    icon: Users,
    detail:
      "Si l'auteur fait partie de tes amis (relation acceptée), son post reçoit un boost fixe. C'est le critère le plus important : DIVARC privilégie tes proches sur les inconnus.",
    userControl:
      "Gère tes amitiés depuis l'onglet Amis ; masque un auteur pour l'exclure.",
  },
  {
    id: "creator_affinity",
    label: "Affinité créateur",
    weight: 1.5,
    icon: Heart,
    detail:
      "Plus tu interagis avec un auteur (likes, commentaires, partages, temps de lecture), plus son score grimpe. Mesuré sur 90 jours glissants, plafonné à 50 interactions au-delà desquelles l'effet sature.",
    userControl:
      "Désactive « Personnalisation » dans les paramètres pour neutraliser ce critère.",
  },
  {
    id: "semantic_match",
    label: "Sujets proches de tes intérêts",
    weight: 2.5,
    icon: TrendingUp,
    detail:
      "Le contenu textuel de tes posts likés / commentés est encodé en vecteur sémantique (embedding OpenAI). Les nouveaux posts dont le vecteur est proche du tien obtiennent un boost. Aucun mot-clé n'est exposé : tout reste à l'échelle vectorielle.",
    userControl:
      "Tu peux supprimer ton profil d'intérêts à tout moment (RGPD art. 17). Sans profil, ce critère est neutralisé.",
  },
  {
    id: "trending",
    label: "Traction communauté",
    weight: 1.2,
    icon: Share2,
    detail:
      "Les posts qui génèrent beaucoup d'interactions par heure depuis leur publication reçoivent un léger boost. Volontairement modéré pour éviter l'effet « viral monopolise tout le feed ».",
    userControl:
      "Aucun contrôle direct, mais l'effet reste secondaire vs proximité réseau et intérêts.",
  },
] as const;

const EVENT_TYPE_LABELS: Record<string, { label: string; icon: typeof Heart }> = {
  "post.like": { label: "Likes", icon: Heart },
  "post.unlike": { label: "Likes annulés", icon: Heart },
  "post.comment": { label: "Commentaires", icon: MessageCircle },
  "post.share": { label: "Partages", icon: Share2 },
  "post.save": { label: "Sauvegardes", icon: Share2 },
  "post.impression": { label: "Vues", icon: Eye },
  "post.click_link": { label: "Clics liens", icon: Eye },
  "post.dwell": { label: "Lectures attentives", icon: Eye },
  "post.see_less": { label: "« Voir moins »", icon: Eye },
  "post.hide": { label: "Masquages", icon: Eye },
  "post.report": { label: "Signalements", icon: Eye },
  "user.follow": { label: "Nouveaux amis", icon: UserPlus },
  "user.profile_visit": { label: "Visites de profil", icon: UserPlus },
};

export default async function TransparencyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  /* Lectures parallèles. On wrap en try/catch implicite via les destructure
     `data` ignorant les erreurs : si recsys_events ou user_interest_profiles
     n'existent pas en prod (migrations recsys pas appliquées), data = null
     et la page s'affiche avec des sections vides plutôt que de crasher. */
  const last30d = new Date(
    Date.now() - 30 * 24 * 3600 * 1000,
  ).toISOString();

  const [{ data: profile }, { data: events }] = await Promise.all([
    supabase
      .from("user_interest_profiles")
      .select(
        "user_affinity, topic_affinity, events_processed_count, last_updated",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("recsys_events")
      .select("event_type, target_post_id, target_user_id, created_at")
      .eq("user_id", user.id)
      .gte("created_at", last30d)
      .limit(1000),
  ]);

  const userAffinity = (profile?.user_affinity ?? {}) as Record<
    string,
    number
  >;
  const topicAffinity = (profile?.topic_affinity ?? {}) as Record<
    string,
    number
  >;

  /* Agrégat events par type sur 30 j. */
  const eventCounts = new Map<string, number>();
  for (const e of events ?? []) {
    eventCounts.set(e.event_type, (eventCounts.get(e.event_type) ?? 0) + 1);
  }
  const eventBreakdown = Array.from(eventCounts.entries())
    .filter(([type]) => EVENT_TYPE_LABELS[type])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);
  const totalEvents = events?.length ?? 0;

  /* Top auteurs par affinité. On résout les profils pour avoir le username
     (un seul roundtrip) et on ignore silencieusement les profils
     introuvables (compte supprimé, etc.). */
  const topAuthorIds = Object.entries(userAffinity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id]) => id);
  let topAuthorsResolved: Array<{
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    score: number;
  }> = [];
  if (topAuthorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", topAuthorIds);
    topAuthorsResolved = (profiles ?? []).map((p) => ({
      ...p,
      score: userAffinity[p.id] ?? 0,
    }));
    topAuthorsResolved.sort((a, b) => b.score - a.score);
  }

  const topTopics = Object.entries(topicAffinity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  /* Expériences actives auxquelles cet utilisateur est exposé. */
  const activeExperiments = (Object.keys(EXPERIMENTS) as ExperimentId[])
    .map((id) => {
      const config = EXPERIMENTS[id];
      if (!config.is_active) return null;
      return {
        id,
        description: config.description,
        variant: getExperimentVariant(id, user.id),
        endsAt: config.ends_at,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return (
    <div className="bg-bg-soft min-h-screen pb-24">
      <Container maxWidth="text" paddingX="none">
        <header className="px-5 sm:px-8 pt-8 pb-6">
          <Link
            href="/settings/algorithm"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
          >
            <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
            Recommandations
          </Link>
          <KickerLabel>· Transparence DSA art. 27</KickerLabel>
          <DisplayHeading
            size="lg"
            className="mt-2 !leading-[1.05] !text-[36px] sm:!text-[44px]"
          >
            Comment ton feed{" "}
            <em className="italic text-gold-deep">est trié</em>.
          </DisplayHeading>
          <p className="mt-3 text-[14px] text-night-soft leading-relaxed">
            Tous les critères que DIVARC utilise pour personnaliser ton fil,
            avec leur poids réel et ce que tu peux ajuster. Aucune boîte
            noire — le code est ouvert dans{" "}
            <code className="text-[12px] bg-bg-soft px-1.5 py-0.5 rounded border border-line">
              lib/recsys/ranker.ts
            </code>
            .
          </p>
        </header>

        {/* Critères du ranker */}
        <section className="px-5 sm:px-8 pb-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
            <span className="text-gold-deep">·</span> Les 5 critères
          </h2>
          <ol className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
            {CRITERIA.map((c) => {
              const Icon = c.icon;
              return (
                <li key={c.id} className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="w-9 h-9 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
                    >
                      <Icon className="w-[18px] h-[18px]" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3 flex-wrap">
                        <h3 className="text-[15px] font-semibold text-night">
                          {c.label}
                        </h3>
                        <span
                          className="text-[11px] font-mono text-night-muted bg-bg-soft px-2 py-0.5 rounded border border-line"
                          title="Coefficient appliqué au score brut"
                        >
                          poids ×{c.weight.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] leading-[1.5] text-night-soft">
                        {c.detail}
                      </p>
                      <p className="mt-2 text-[12px] leading-[1.5] text-night-muted italic">
                        <span className="not-italic font-semibold not-italic">
                          Ton contrôle :
                        </span>{" "}
                        {c.userControl}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Garde-fous */}
        <section className="px-5 sm:px-8 pb-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
            <span className="text-gold-deep">·</span> Garde-fous
          </h2>
          <ul className="rounded-2xl bg-white border border-line p-4 sm:p-5 space-y-3 text-[13px] text-night-soft leading-[1.55]">
            <li className="flex gap-3">
              <span className="text-gold-deep shrink-0 mt-0.5" aria-hidden>
                ◆
              </span>
              <span>
                <strong className="text-night">Cap par auteur :</strong> au
                maximum 2 posts du même auteur dans les 10 premières
                positions, pour éviter la monopolisation.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-gold-deep shrink-0 mt-0.5" aria-hidden>
                ◆
              </span>
              <span>
                <strong className="text-night">Exclusion stricte :</strong>{" "}
                les comptes que tu masques ou bloques sont retirés des
                candidats avant tout scoring.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-gold-deep shrink-0 mt-0.5" aria-hidden>
                ◆
              </span>
              <span>
                <strong className="text-night">Pas de pub :</strong> aucun
                contenu sponsorisé n&apos;est injecté dans le ranking. Les
                listings marketplace sont sur une surface séparée.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-gold-deep shrink-0 mt-0.5" aria-hidden>
                ◆
              </span>
              <span>
                <strong className="text-night">Fallback chronologique :</strong>{" "}
                tant que ton profil contient moins de 10 interactions, le
                fil reste en ordre temporel pour éviter les biais
                cold-start.
              </span>
            </li>
          </ul>
        </section>

        {/* Tes signaux personnels */}
        {profile ? (
          <section className="px-5 sm:px-8 pb-6">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
              <span className="text-gold-deep">·</span> Tes signaux (30
              derniers jours)
            </h2>
            <div className="rounded-2xl bg-white border border-line p-4 sm:p-5">
              <p className="text-[13px] text-night-soft mb-4">
                <strong className="text-night">{totalEvents}</strong>{" "}
                interaction{totalEvents > 1 ? "s" : ""} enregistrée
                {totalEvents > 1 ? "s" : ""} ces 30 derniers jours.
                {profile.events_processed_count !== undefined &&
                profile.events_processed_count !== null ? (
                  <>
                    {" "}
                    Ton profil a digéré{" "}
                    <strong className="text-night">
                      {profile.events_processed_count}
                    </strong>{" "}
                    événements au total.
                  </>
                ) : null}
              </p>

              {eventBreakdown.length > 0 ? (
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {eventBreakdown.map(([type, count]) => {
                    const meta = EVENT_TYPE_LABELS[type]!;
                    const Icon = meta.icon;
                    return (
                      <li
                        key={type}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-bg-soft border border-line"
                      >
                        <Icon
                          className="w-4 h-4 text-gold-deep shrink-0"
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] text-night-muted leading-tight">
                            {meta.label}
                          </p>
                          <p className="text-[15px] font-semibold text-night leading-tight">
                            {count}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-[12px] text-muted italic">
                  Pas encore d&apos;interactions trackées.
                </p>
              )}
            </div>
          </section>
        ) : null}

        {/* Top auteurs */}
        {topAuthorsResolved.length > 0 ? (
          <section className="px-5 sm:px-8 pb-6">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
              <span className="text-gold-deep">·</span> Auteurs les plus
              influents pour toi
            </h2>
            <ul className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
              {topAuthorsResolved.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  {a.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.avatar_url}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="w-9 h-9 rounded-full bg-gold/15 text-gold-deep flex items-center justify-center text-[12px] font-bold"
                    >
                      {(a.full_name ?? a.username ?? "?")
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-night truncate">
                      {a.full_name ?? a.username ?? "Utilisateur"}
                    </p>
                    {a.username ? (
                      <p className="text-[12px] text-night-muted truncate">
                        @{a.username}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className="text-[11px] font-mono text-night-muted bg-bg-soft px-2 py-0.5 rounded border border-line"
                    title="Score d'affinité (capé à 50)"
                  >
                    {Math.round(a.score)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted px-1">
              Pour réduire l&apos;influence d&apos;un auteur, masque-le ou
              désactive la personnalisation.
            </p>
          </section>
        ) : null}

        {/* Topics détectés */}
        {topTopics.length > 0 ? (
          <section className="px-5 sm:px-8 pb-6">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
              <span className="text-gold-deep">·</span> Sujets que DIVARC a
              détectés chez toi
            </h2>
            <div className="rounded-2xl bg-white border border-line p-4 flex flex-wrap gap-2">
              {topTopics.map(([topic, weight]) => (
                <span
                  key={topic}
                  className="text-[12px] px-3 py-1.5 rounded-full bg-gold/10 text-night border border-gold/30"
                  title={`Score : ${weight.toFixed(2)}`}
                >
                  {topic}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted px-1">
              Tu peux masquer un sujet depuis la page parente.
            </p>
          </section>
        ) : null}

        {/* A/B tests en cours auxquels l'utilisateur participe.
            Transparence active : on expose le variant assigné. */}
        {activeExperiments.length > 0 ? (
          <section className="px-5 sm:px-8 pb-6">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
              <span className="text-gold-deep">·</span> Tests A/B en cours
            </h2>
            <ul className="rounded-2xl bg-white border border-line overflow-hidden divide-y divide-line">
              {activeExperiments.map((e) => (
                <li key={e.id} className="p-4 sm:p-5">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1.5">
                    <h3 className="text-[14px] font-semibold text-night">
                      {e.id}
                    </h3>
                    <span className="text-[11px] font-mono text-night px-2 py-0.5 rounded bg-gold/15 border border-gold/30">
                      ton variant : {e.variant}
                    </span>
                  </div>
                  <p className="text-[12.5px] leading-[1.5] text-night-soft">
                    {e.description}
                  </p>
                  {e.endsAt ? (
                    <p className="mt-1.5 text-[11px] text-muted">
                      Fin prévue :{" "}
                      {new Date(e.endsAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted px-1">
              Aucune information personnelle n&apos;est exposée à un tiers
              dans le cadre de ces tests. Tu peux changer manuellement
              d&apos;onglet à tout moment pour ne pas suivre le variant
              assigné.
            </p>
          </section>
        ) : null}

        {/* CTA retour */}
        <div className="px-5 sm:px-8">
          <Link
            href="/settings/algorithm"
            className="block text-center text-[13px] font-semibold text-gold-deep hover:underline py-3"
          >
            Modifier mes préférences →
          </Link>
        </div>
      </Container>
    </div>
  );
}
