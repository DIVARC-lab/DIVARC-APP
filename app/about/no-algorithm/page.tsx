import Link from "next/link";
import {
  Eye,
  Flame,
  Info,
  MapPin,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

export const metadata = {
  title: "Pas d'algorithme opaque — DIVARC",
  description:
    "Comment DIVARC trie tes Cercles. Formules visibles, recommandations explicables, aucun ML, aucune boîte noire.",
};

export default function NoAlgorithmPage() {
  return (
    <>
      <span className="not-prose inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
        <Eye className="w-3 h-3" aria-hidden />
        · Manifeste anti-algorithme
      </span>

      <h1 className="mt-3 text-[42px] sm:text-[56px] leading-[1] tracking-[-0.025em] text-balance">
        Pas d&apos;algorithme opaque sur DIVARC.
        <br />
        <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
          Tu choisis ce que tu vois.
        </em>
      </h1>

      <p className="mt-6 text-[17px] sm:text-[18px] leading-[1.55] text-night-soft text-pretty">
        Les réseaux sociaux classiques décident pour toi ce que tu vois, sans
        te dire comment. <strong>Nous, on te montre exactement comment on trie</strong>{" "}
        : par fraîcheur, par engagement humain. C&apos;est tout. Aucun ML
        propriétaire. Aucune optimisation pour te garder accroché.
      </p>

      <h2 className="text-[28px] sm:text-[34px]">Les 5 tris transparents</h2>

      <p className="text-[14px] text-night-soft">
        Sur la page <Link href="/circles">Cercles</Link>, tu choisis comment
        trier les communautés à découvrir. Chaque option a une formule
        explicite, affichable d&apos;un clic.
      </p>

      <div className="not-prose mt-5 space-y-3">
        <SortBlock
          icon={Flame}
          tone="gold"
          title="Plus actifs cette semaine"
          formula="posts 7j × 0,40 + engagement × 0,30 + nouveaux membres × 0,15 + diversité publieurs × 0,15"
          desc="Le tri par défaut. Récompense les cercles vivants avec une diversité de publieurs (anti-monopole)."
        />
        <SortBlock
          icon={Sparkles}
          tone="navy"
          title="Récemment créés"
          formula="created_at desc"
          desc="Tri simple par date de création. Aucune pondération."
        />
        <SortBlock
          icon={Users}
          tone="emerald"
          title="Plus grands"
          formula="members_count desc"
          desc="Tri simple par nombre total de membres. Aucun bonus, aucun malus."
        />
        <SortBlock
          icon={MapPin}
          tone="violet"
          title="Près de chez moi"
          formula="is_local=true AND location_country=ton pays"
          desc="Cercles marqués 'local' dans ton pays. La géoloc précise (rayon km) arrive bientôt."
        />
        <SortBlock
          icon={TrendingUp}
          tone="rose"
          title="Selon mes intérêts"
          formula="catégorie × 0,40 + amis × 0,40 + local × 0,20 + fresh × 0,10"
          desc={
            <>
              Chaque recommandation affiche les <strong>raisons exactes</strong>{" "}
              (ex : « 3 amis déjà membres », « Tu as rejoint 2 cercles dans
              cette catégorie »). Numérotées, exhaustives. Tu peux le désactiver
              à tout moment.
            </>
          }
        />
      </div>

      <h2 className="text-[28px] sm:text-[34px]">Ce qu&apos;on ne fait pas</h2>

      <ul className="text-[15px] leading-relaxed">
        <li>
          <strong>Pas de ML propriétaire</strong> qui décide pour toi sans
          explication. Tout est en SQL, lisible et auditable.
        </li>
        <li>
          <strong>Pas de pub déguisée</strong> dans le feed des cercles. Les
          sponsorisations marketplace sont marquées <em>« Publicité »</em>.
        </li>
        <li>
          <strong>Pas d&apos;optimisation rétention manipulatrice</strong> (push
          aggressifs, FOMO artificiel, streaks anxiogènes).
        </li>
        <li>
          <strong>Pas de boîte noire</strong>. Tu peux voir le score
          d&apos;activité de chaque cercle en cliquant sur le badge{" "}
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gold/15 text-gold-deep text-[11px] font-bold">
            <Flame className="w-3 h-3" aria-hidden />
            X.X <Eye className="w-2.5 h-2.5" aria-hidden />
          </span>
          .
        </li>
      </ul>

      <h2 className="text-[28px] sm:text-[34px]">
        Pourquoi cette approche radicale
      </h2>

      <p className="text-[15px] leading-relaxed text-pretty">
        Parce que <strong>l&apos;attention humaine n&apos;est pas une matière première</strong>{" "}
        qu&apos;on extrait sans consentement. Parce que tu mérites de comprendre
        pourquoi un contenu te touche, pas seulement d&apos;être <em>touché</em>.
        Parce que la confiance se construit par la transparence, pas par
        l&apos;opacité.
      </p>

      <p className="text-[15px] leading-relaxed text-pretty">
        On préfère perdre quelques minutes d&apos;engagement quotidien et gagner
        ta confiance pour 10 ans, plutôt que l&apos;inverse.
      </p>

      <div className="not-prose mt-10 p-5 sm:p-6 rounded-2xl bg-night text-cream">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold mb-2">
          · Tu trouves un biais ?
        </p>
        <p className="text-[14px] leading-relaxed text-cream/90">
          Toutes les formules sont open documentées dans les migrations SQL
          du projet. Si tu repères une pondération qui t&apos;a l&apos;air
          biaisée ou injuste, dis-le-nous. On corrige.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-extrabold text-gold hover:text-gold-soft transition-colors"
        >
          Revenir à l&apos;accueil →
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
