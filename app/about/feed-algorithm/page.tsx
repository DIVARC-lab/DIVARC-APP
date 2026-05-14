import Link from "next/link";
import {
  BookmarkPlus,
  Clock,
  Eye,
  Flame,
  Layers,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Sprout,
  ToggleRight,
  TrendingUp,
  UsersRound,
} from "lucide-react";

export const metadata = {
  title: "Comment trie ton feed — DIVARC",
  description:
    "Les formules complètes du feed personnel DIVARC : fraîcheur, signaux humains, diversité, anti-bulle. Aucune boîte noire, aucun ML opaque.",
};

export default function FeedAlgorithmPage() {
  return (
    <>
      <span className="not-prose inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
        <Eye className="w-3 h-3" aria-hidden />
        · Transparence du feed personnel
      </span>

      <h1 className="mt-3 text-[42px] sm:text-[56px] leading-[1] tracking-[-0.025em] text-balance">
        Ton feed,
        <br />
        <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
          sans boîte noire.
        </em>
      </h1>

      <p className="mt-6 text-[17px] sm:text-[18px] leading-[1.55] text-night-soft text-pretty">
        Sur DIVARC, le feed ne te garde pas accroché contre ta volonté. Nous
        n&apos;optimisons pas le <em>temps passé</em>. Nous optimisons{" "}
        <strong>la qualité de ce que tu vois</strong> et{" "}
        <strong>ta capacité à comprendre pourquoi tu le vois</strong>. Voici
        toutes les formules — aucune ne te sera cachée.
      </p>

      <h2 className="text-[28px] sm:text-[34px]">
        Les 4 <em className="italic text-gold-deep">modes de tri</em> du feed
      </h2>

      <p className="text-[14px] text-night-soft">
        Tu choisis le mode de tri en haut du <Link href="/">feed</Link>. Chaque
        mode a une formule explicite, lisible, modifiable côté code.
      </p>

      <div className="not-prose mt-5 space-y-3">
        <SortBlock
          icon={Sparkles}
          tone="gold"
          title="Frais (default)"
          formula="created_at desc · pondéré par reactions_decay (demi-vie 36h)"
          desc="Le tri par défaut. Les posts récents remontent, mais une réaction humaine peut prolonger leur durée de vie de quelques heures (pas des jours). Une fois la demi-vie passée, le post redescend. Aucune relance artificielle."
        />
        <SortBlock
          icon={Flame}
          tone="rose"
          title="Conversations vives"
          formula="(unique_repliers × 0,55) + (reactions_distinct × 0,30) + (recency_boost × 0,15)"
          desc="Les fils où plusieurs personnes différentes discutent — pas juste un post viral avec 1000 like-and-go. unique_repliers compte les comptes uniques qui ont répondu (anti-bot, anti-troll-spammer)."
        />
        <SortBlock
          icon={Sprout}
          tone="emerald"
          title="Voix peu entendues"
          formula="posts d'auteurs avec moins de 50 followers, créés < 72h, ayant déjà reçu ≥ 1 réaction d'un compte différent"
          desc="Une curation anti-monopole : tu vois des posts de gens qui n'ont pas (encore) une grosse audience, mais que d'autres trouvent intéressants. Aide à sortir de la bulle des « gros comptes »."
        />
        <SortBlock
          icon={UsersRound}
          tone="navy"
          title="Mon cercle proche"
          formula="auteurs que je suis OU avec qui j'ai échangé ≥ 1 message les 30 derniers jours"
          desc="Le feed des comptes avec qui tu as une vraie relation, pas seulement un follow passif. Si tu n'as jamais parlé à quelqu'un, on ne le compte pas dans ce mode même si tu le suis."
        />
      </div>

      <h2 className="text-[28px] sm:text-[34px]">
        Les 4 <em className="italic text-gold-deep">garde-fous</em> anti-toxicité
      </h2>

      <p className="text-[14px] text-night-soft">
        Quel que soit le mode, ces règles s&apos;appliquent toujours. Tu peux
        les désactiver dans <Link href="/settings/feed">tes réglages</Link> si
        tu le souhaites.
      </p>

      <div className="not-prose mt-5 space-y-3">
        <GuardBlock
          icon={ShieldCheck}
          title="Filtre signaux faibles"
          desc="Un post avec uniquement des réactions négatives (sad+surprised majoritaires sans applause/insightful) est rétrogradé. Pas censuré : juste pas amplifié."
        />
        <GuardBlock
          icon={Layers}
          title="Diversité des auteurs"
          desc="Maximum 3 posts consécutifs du même auteur dans ton feed. Si tu en veux plus, va sur son profil."
        />
        <GuardBlock
          icon={Clock}
          title="Anti-doomscroll"
          desc={
            <>
              Après 20 posts vus en une session, une pause cosy s&apos;affiche.
              Tu peux continuer, mais elle revient toutes les 20 posts. Étude{" "}
              <em>« Quality &gt; Quantity »</em> côté santé mentale.
            </>
          }
        />
        <GuardBlock
          icon={ToggleRight}
          title="Désactivation 1-clic"
          desc="Tu peux passer en mode « Brut » qui désactive tous les filtres et te montre uniquement created_at desc. Un seul tap. Pas enterré dans 5 sous-menus."
        />
      </div>

      <h2 className="text-[28px] sm:text-[34px]">
        Ce qu&apos;on <em className="italic text-gold-deep">ne fait pas</em>
      </h2>

      <ul className="text-[15px] leading-relaxed">
        <li>
          <strong>Pas de ML opaque.</strong> Le tri du feed est 100% SQL +
          formules pondérées documentées. Tu peux lire les requêtes dans le
          dossier <code>supabase/migrations/</code> du repo.
        </li>
        <li>
          <strong>Pas de boost payant pour particuliers.</strong> Personne ne
          peut payer pour être plus visible dans le feed organique. Les contenus
          sponsorisés (marketplace uniquement) sont marqués{" "}
          <em>« Publicité »</em>.
        </li>
        <li>
          <strong>Pas de FOMO artificiel.</strong> Pas de « X amis viennent de
          publier », pas de notifications « machin vient de réagir », pas de
          streaks anxiogènes.
        </li>
        <li>
          <strong>Pas d&apos;optimisation rétention manipulatrice.</strong> Pas
          de bandeaux culpabilisants, pas de notifications push agressives, pas
          de re-engagement par e-mail.
        </li>
        <li>
          <strong>Pas de profilage publicitaire.</strong> Tes données ne sont
          jamais vendues, jamais partagées avec un tiers pour cibler.
        </li>
      </ul>

      <h2 className="text-[28px] sm:text-[34px]">
        Les <em className="italic text-gold-deep">signaux</em> qu&apos;on utilise
      </h2>

      <p className="text-[15px] leading-relaxed text-pretty">
        Pour calculer un score d&apos;intérêt, on n&apos;utilise{" "}
        <strong>jamais</strong> : ta géolocalisation précise, l&apos;heure
        d&apos;ouverture de l&apos;app, le temps de scroll par post, les
        adresses IP, les empreintes navigateur, les SDK tiers.
      </p>

      <p className="text-[15px] leading-relaxed text-pretty">
        On utilise <strong>uniquement</strong> :
      </p>

      <ul className="text-[15px] leading-relaxed">
        <li>
          <strong>Réactions explicites</strong> (heart, applause, insightful,
          surprised, sad, laugh) — ta volonté affirmée.
        </li>
        <li>
          <strong>Réponses</strong> aux posts — la conversation est le vrai
          signal d&apos;intérêt.
        </li>
        <li>
          <strong>Bookmarks</strong> — ce que tu choisis de garder pour plus
          tard.
        </li>
        <li>
          <strong>Suivis et messages</strong> — tes relations sociales
          déclarées, jamais inférées.
        </li>
        <li>
          <strong>Date de création des posts</strong> — la fraîcheur, comme
          n&apos;importe quel feed.
        </li>
      </ul>

      <h2 className="text-[28px] sm:text-[34px]">
        Pourquoi cette <em className="italic text-gold-deep">approche</em>
      </h2>

      <p className="text-[15px] leading-relaxed text-pretty">
        Parce qu&apos;un feed devrait te <strong>servir</strong>, pas
        t&apos;exploiter. Parce que la transparence est un droit, pas un
        bonus. Parce qu&apos;on préfère que tu passes 12 minutes vraies sur
        DIVARC par jour, plutôt que 90 minutes hypnotiques sur la concurrence.
      </p>

      <p className="text-[15px] leading-relaxed text-pretty">
        Le feed parfait n&apos;existe pas. Mais un feed{" "}
        <strong>honnête</strong>, oui. C&apos;est ce qu&apos;on construit ici.
      </p>

      <div className="not-prose mt-10 grid gap-3 sm:grid-cols-2">
        <Link
          href="/about/no-algorithm"
          className="rounded-2xl bg-white border border-line p-5 hover:border-gold transition-colors"
        >
          <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center bg-gold/15 text-gold-deep">
            <TrendingUp className="w-4 h-4" aria-hidden />
          </span>
          <p className="mt-3 text-[14px] font-extrabold text-night">
            Et pour les Cercles ?
          </p>
          <p className="mt-1 text-[12.5px] text-night-soft leading-relaxed">
            Voir comment on trie les Cercles à découvrir, formules complètes.
          </p>
        </Link>
        <Link
          href="/settings/feed"
          className="rounded-2xl bg-white border border-line p-5 hover:border-gold transition-colors"
        >
          <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center bg-emerald-50 text-emerald-700">
            <BookmarkPlus className="w-4 h-4" aria-hidden />
          </span>
          <p className="mt-3 text-[14px] font-extrabold text-night">
            Mes réglages feed
          </p>
          <p className="mt-1 text-[12.5px] text-night-soft leading-relaxed">
            Désactiver les garde-fous, choisir un mode par défaut, mode brut.
          </p>
        </Link>
      </div>

      <div className="not-prose mt-6 p-5 sm:p-6 rounded-2xl bg-night text-cream">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold mb-2">
          <MessageCircle className="inline-block w-3 h-3 mr-1" aria-hidden />
          Une question, un biais détecté ?
        </p>
        <p className="text-[14px] leading-relaxed text-cream/90">
          Toutes les formules ci-dessus correspondent à du SQL dans nos
          migrations. Si tu repères qu&apos;une pondération privilégie injustement
          un type de compte ou de contenu, écris-nous. On corrige, et on
          documente la correction publiquement.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-extrabold text-gold hover:text-gold-soft transition-colors"
        >
          Retour au feed →
        </Link>
      </div>
    </>
  );
}

function SortBlock({
  icon: Icon,
  tone,
  title,
  formula,
  desc,
}: {
  icon: typeof Flame;
  tone: "gold" | "navy" | "emerald" | "violet" | "rose";
  title: string;
  formula: string;
  desc: React.ReactNode;
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
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={`inline-flex w-7 h-7 rounded-lg items-center justify-center border ${toneClass}`}
        >
          <Icon className="w-3.5 h-3.5" aria-hidden />
        </span>
        <h3 className="text-[15px] font-extrabold text-night">{title}</h3>
      </div>
      <code className="mt-2 block text-[11px] sm:text-[12px] bg-bg-soft px-2.5 py-1.5 rounded-md font-mono text-night-dim break-words">
        {formula}
      </code>
      <p className="mt-2 text-[12.5px] text-night-soft leading-relaxed">
        {desc}
      </p>
    </div>
  );
}

function GuardBlock({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Flame;
  title: string;
  desc: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white border border-line p-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-flex w-7 h-7 rounded-lg items-center justify-center border bg-night/5 text-night border-night/20"
        >
          <Icon className="w-3.5 h-3.5" aria-hidden />
        </span>
        <h3 className="text-[15px] font-extrabold text-night">{title}</h3>
      </div>
      <p className="mt-2 text-[12.5px] text-night-soft leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
