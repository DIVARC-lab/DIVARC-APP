import Link from "next/link";
import {
  Brain,
  Eye,
  Layers,
  Repeat,
  Sparkles,
  Sprout,
  ToggleRight,
  TrendingUp,
  UsersRound,
  Zap,
} from "lucide-react";

export const metadata = {
  title: "Comment fonctionne l'algorithme Reels — DIVARC",
  description:
    "L'algorithme Reels DIVARC est inspiré de TikTok mais entièrement documenté. 7 sources de candidats, ~30 features, recompute toutes les 5 minutes. Tu peux le désactiver.",
};

export default function ReelsAlgorithmPage() {
  return (
    <>
      <span className="not-prose inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
        <Brain className="w-3 h-3" aria-hidden />
        · Algorithme Reels DIVARC
      </span>

      <h1 className="mt-3 text-[42px] sm:text-[56px] leading-[1] tracking-[-0.025em] text-balance">
        Reels :<br />
        <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
          un algorithme, mais ouvert.
        </em>
      </h1>

      <p className="mt-6 text-[17px] sm:text-[18px] leading-[1.55] text-night-soft text-pretty">
        Sur DIVARC,{" "}
        <Link href="/about/no-algorithm">le tri des Cercles</Link> et{" "}
        <Link href="/about/feed-algorithm">le feed</Link> sont 100% SQL et
        transparents. Mais les <strong>Reels</strong>, eux, méritent un
        algorithme entraîné sur ton comportement pour fonctionner — sinon tu
        regarderais des vidéos prises au hasard.
      </p>

      <p className="text-[15px] text-night-soft leading-relaxed">
        On a fait un choix radical :{" "}
        <strong>oui, on personnalise les Reels.</strong> Mais sans boîte
        noire : voici tout ce que l&apos;algo fait, pourquoi, et comment le
        désactiver.
      </p>

      <h2 className="text-[28px] sm:text-[34px]">
        Les 7 <em className="italic text-gold-deep">sources</em> de candidats
      </h2>

      <p className="text-[14px] text-night-soft">
        Pour chaque actualisation de ton feed Reels, on construit ~800
        candidats depuis 7 sources distinctes, avec des quotas précis :
      </p>

      <div className="not-prose mt-5 space-y-3">
        <SourceBlock
          icon={UsersRound}
          tone="navy"
          name="Network"
          quota="30%"
          desc="Reels des comptes que tu suis (friendships acceptées). Recency exp decay 6h."
        />
        <SourceBlock
          icon={Sparkles}
          tone="gold"
          name="Similar Content"
          quota="25%"
          desc="Vecteurs proches du tien (cosine similarity via pgvector). Embeddings text-embedding-3-small 1536d."
        />
        <SourceBlock
          icon={Repeat}
          tone="rose"
          name="Creator Revisit"
          quota="10%"
          desc="Créateurs déjà vus mais NON SUIVIS. C'est le secret TikTok : reproposer ceux dont tu as déjà aimé une vidéo, 3-5 reels plus tard. Si tu accroches, on augmente la fréquence. Sinon, on baisse."
        />
        <SourceBlock
          icon={Sprout}
          tone="emerald"
          name="Exploration"
          quota="10%"
          desc="Hashtags JAMAIS engagés par toi. C'est ce qui empêche les bulles. Score statique 0.4 — le ranker décide."
        />
        <SourceBlock
          icon={UsersRound}
          tone="violet"
          name="Collaborative"
          quota="15%"
          desc="Les 50 users avec un vecteur d'intérêt similaire au tien, et leurs likes/saves/completions récents. « Les gens comme toi ont aussi aimé ». Filtre : ≥ 2 co-likers."
        />
        <SourceBlock
          icon={TrendingUp}
          tone="rose"
          name="Trending"
          quota="10%"
          desc="Engagement par heure ((réactions + commentaires) / heures depuis post). < 48h, ≥ 5 engagements. Pas de viral artificiel."
        />
        <SourceBlock
          icon={Zap}
          tone="emerald"
          name="Fresh Creators"
          quota="5%"
          desc="Auteurs inscrits < 30j avec ≥ 1 post engagé. Égalité des chances pour les nouveaux."
        />
      </div>

      <h2 className="text-[28px] sm:text-[34px]">
        Le <em className="italic text-gold-deep">ranker</em> (heuristique pondérée)
      </h2>

      <p className="text-[15px] leading-relaxed text-pretty">
        Chaque candidat est scoré via{" "}
        <strong>~30 features observables</strong> :
      </p>

      <ul className="text-[14px] leading-relaxed">
        <li><strong>Cosine similarity</strong> entre ton vecteur d&apos;intérêts et l&apos;embedding du reel</li>
        <li><strong>Affinité créateur</strong> (cumul des events positifs sur 14j)</li>
        <li><strong>Engagement velocity</strong> (likes + comments par heure depuis publication)</li>
        <li><strong>Freshness</strong> (exp decay, demi-vie 12h)</li>
        <li><strong>Format match</strong> (durée vidéo vs ton style — lurker ou engager)</li>
        <li><strong>Hashtag affinity</strong> (overlap avec hashtags récemment engagés)</li>
        <li><strong>Source bonus</strong> (creator_revisit ×1.5, network ×1.4, exploration ×0.9...)</li>
      </ul>

      <p className="text-[15px] leading-relaxed text-night-soft">
        Pas de ML opaque en V1. On utilise des poids fixes et lisibles —{" "}
        <a
          href="https://github.com/DIVARC-lab/DIVARC-APP/blob/main/lib/recsys/foryouRanker.ts"
          target="_blank"
          rel="noopener"
        >
          le code du ranker est public
        </a>
        . Phase 2 : un modèle entraîné quand on aura du volume.
      </p>

      <h2 className="text-[28px] sm:text-[34px]">
        Le <em className="italic text-gold-deep">re-ranker</em> (diversité)
      </h2>

      <p className="text-[15px] leading-relaxed text-pretty">
        Le ranker peut produire des feeds répétitifs. Le re-ranker applique
        ensuite :
      </p>

      <ul className="text-[14px] leading-relaxed">
        <li><strong>Max 1 auteur identique dans les 5 derniers reels</strong>, max 2 dans les 10</li>
        <li><strong>Quota exploration ~1 sur 5</strong> — on te force à sortir de ta bulle</li>
        <li><strong>Démotion clickbait</strong>, démotion forte si tu as cliqué « see less »</li>
        <li><strong>Boost « close friends »</strong> (top 8 affinity) → toujours dans les premiers</li>
      </ul>

      <h2 className="text-[28px] sm:text-[34px]">
        Recompute toutes les <em className="italic text-gold-deep">5 minutes</em>
      </h2>

      <p className="text-[15px] leading-relaxed text-pretty">
        Ton vecteur d&apos;intérêts est recalculé{" "}
        <strong>toutes les 5 minutes</strong> sur tous les users actifs.
        Adaptation quasi-temps réel : si tu changes de centre d&apos;intérêt,
        ton feed s&apos;adapte en 10-15 reels engagés.
      </p>

      <h2 className="text-[28px] sm:text-[34px]">
        Ce qu&apos;on <em className="italic text-gold-deep">ne fait PAS</em>
      </h2>

      <ul className="text-[15px] leading-relaxed">
        <li><strong>Pas de profilage publicitaire.</strong> Tes signaux nourrissent UNIQUEMENT le ranker Reels. Jamais de vente, jamais de tiers.</li>
        <li><strong>Pas de boost payant pour particuliers.</strong> Personne ne peut payer pour remonter dans le ranker organique.</li>
        <li><strong>Pas de viral artificiel.</strong> Pas de spike scripté, pas de mises en avant manuelles non documentées.</li>
        <li><strong>Pas d&apos;optimisation manipulatrice.</strong> Pas de notifications agressives, pas de streaks, pas de FOMO.</li>
      </ul>

      <h2 className="text-[28px] sm:text-[34px]">
        Comment <em className="italic text-gold-deep">t&apos;auto-protéger</em>
      </h2>

      <ul className="text-[15px] leading-relaxed">
        <li>
          <Link href="/reels">Tap-long sur n&apos;importe quel reel</Link> →{" "}
          <strong>« Pourquoi ce reel ? »</strong> affiche les 3 signaux qui
          l&apos;ont fait remonter pour toi.
        </li>
        <li>
          <Link href="/settings/algorithm">Réglages → Personnalisation</Link> : tu peux refuser entièrement la personnalisation (mode chronologique strict).
        </li>
        <li>
          <Link href="/settings/privacy">Réglages → Vie privée</Link> : désactive
          la collecte d&apos;events.
        </li>
        <li>
          <strong>Tap « pas intéressé »</strong> sur un reel → -10 sur ton affinité
          créateur + démotion pendant 90 jours.
        </li>
      </ul>

      <div className="not-prose mt-10 grid gap-3 sm:grid-cols-2">
        <Link
          href="/about/feed-algorithm"
          className="rounded-2xl bg-white border border-line p-5 hover:border-gold transition-colors"
        >
          <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center bg-gold/15 text-gold-deep">
            <Layers className="w-4 h-4" aria-hidden />
          </span>
          <p className="mt-3 text-[14px] font-extrabold text-night">
            Et pour le feed ?
          </p>
          <p className="mt-1 text-[12.5px] text-night-soft leading-relaxed">
            Le feed est 100% SQL transparent — pas d&apos;algo ML.
          </p>
        </Link>
        <Link
          href="/settings/algorithm"
          className="rounded-2xl bg-white border border-line p-5 hover:border-gold transition-colors"
        >
          <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center bg-emerald-50 text-emerald-700">
            <ToggleRight className="w-4 h-4" aria-hidden />
          </span>
          <p className="mt-3 text-[14px] font-extrabold text-night">
            Mes réglages personnalisation
          </p>
          <p className="mt-1 text-[12.5px] text-night-soft leading-relaxed">
            Désactiver l&apos;algo Reels en 1 clic. Aucune dégradation cachée.
          </p>
        </Link>
      </div>

      <div className="not-prose mt-6 p-5 sm:p-6 rounded-2xl bg-night text-cream">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold mb-2">
          <Eye className="inline-block w-3 h-3 mr-1" aria-hidden />
          Tu repères un biais ?
        </p>
        <p className="text-[14px] leading-relaxed text-cream/90">
          Tout le code du pipeline Reels (candidate generation, ranker,
          re-ranker) est public dans <code>lib/recsys/</code> et{" "}
          <code>supabase/migrations/0118+</code>. Si tu identifies une feature
          qui produit un biais, écris-nous — on corrige et on documente la
          correction.
        </p>
        <Link
          href="/reels"
          className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-extrabold text-gold hover:text-gold-soft transition-colors"
        >
          Retour aux Reels →
        </Link>
      </div>
    </>
  );
}

function SourceBlock({
  icon: Icon,
  tone,
  name,
  quota,
  desc,
}: {
  icon: typeof Sparkles;
  tone: "gold" | "navy" | "emerald" | "violet" | "rose";
  name: string;
  quota: string;
  desc: string;
}) {
  const toneClass = {
    gold: "bg-gold/15 text-gold-deep border-gold/30",
    navy: "bg-night/5 text-night border-night/20",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
  }[tone];

  return (
    <div className="rounded-xl bg-white border border-line p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={`inline-flex w-7 h-7 rounded-lg items-center justify-center border ${toneClass}`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden />
          </span>
          <h3 className="text-[15px] font-extrabold text-night">{name}</h3>
        </div>
        <code className="text-[11px] font-mono bg-bg-soft px-2 py-0.5 rounded-md text-night-dim">
          {quota}
        </code>
      </div>
      <p className="mt-2 text-[12.5px] text-night-soft leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
