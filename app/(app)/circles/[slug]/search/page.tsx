/* Sprint G.1 — Page Search sémantique scopée à un cercle.
 *
 * URL : /circles/[slug]/search?q=...
 * Pipeline serveur :
 *   1. Auth + check membre du cercle
 *   2. Si q présente : génère embedding + RPC search_posts_by_embedding
 *      avec circle_id scope
 *   3. Hydrate posts + author + 1 photo
 *
 * Si OPENAI_API_KEY non configuré : message dégradé "indisponible". */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/server";
import { getCircleBySlug } from "@/lib/queries/circles";
import { isLlmConfigured } from "@/lib/openai/chat";
import { searchPostsSemantic } from "@/lib/queries/semanticSearch";

export const metadata = { title: "Recherche dans le cercle" };

type Params = Promise<{ slug: string }>;
type SearchParamsP = Promise<{ q?: string }>;

export default async function CircleSearchPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParamsP;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 200) : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/circles/${slug}/search`);

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();
  if (!circle.is_member) {
    redirect(`/circles/${slug}`);
  }

  const llmOk = isLlmConfigured();
  const results =
    llmOk && q.length >= 3
      ? await searchPostsSemantic({
          query: q,
          circleId: circle.id,
          limit: 30,
        })
      : [];

  return (
    <div className="px-5 sm:px-8 py-6 max-w-3xl mx-auto">
      <header className="mb-4 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-gold-deep" aria-hidden />
        <h1 className="text-[15px] sm:text-[17px] font-bold text-night">
          Recherche sémantique · {circle.name}
        </h1>
      </header>
      <p className="text-[12px] text-night-dim mb-5 leading-relaxed">
        Cherche par concept, pas juste par mot-clé. Décris ce que tu veux
        retrouver — l&apos;IA trouve les posts les plus proches sémantiquement.
      </p>

      <form
        action={`/circles/${slug}/search`}
        method="get"
        className="mb-5"
      >
        <div className="relative">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-night-dim"
            aria-hidden
          />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="ex: comment lancer un side project ?"
            minLength={3}
            maxLength={200}
            autoFocus
            className="w-full h-11 pl-10 pr-3 rounded-full border border-line bg-white text-[14px] focus:outline-none focus:border-night/30"
          />
        </div>
      </form>

      {!llmOk ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-[12px] text-rose-700 leading-relaxed">
          🤖 La recherche sémantique nécessite une clé OpenAI configurée
          côté serveur (OPENAI_API_KEY).
        </div>
      ) : q.length === 0 ? (
        <p className="text-[12px] text-night-dim text-center py-6">
          Tape une requête pour démarrer.
        </p>
      ) : q.length < 3 ? (
        <p className="text-[12px] text-night-dim text-center py-6">
          Saisis au moins 3 caractères.
        </p>
      ) : results.length === 0 ? (
        <p className="text-[12px] text-night-dim text-center py-6">
          Aucun résultat. L&apos;index sémantique se construit progressivement
          au fil des nouveaux posts.
        </p>
      ) : (
        <ul className="space-y-2">
          {results.map((r) => (
            <li
              key={r.post.id}
              className="rounded-2xl bg-white border border-line p-3.5 hover:border-night/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Avatar
                  src={r.author?.avatar_url ?? null}
                  fullName={
                    r.author?.full_name ?? r.author?.username ?? "?"
                  }
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {r.author?.username ? (
                      <Link
                        href={`/u/${r.author.username}`}
                        className="text-[12px] font-bold text-night hover:underline truncate"
                      >
                        {r.author.full_name ?? r.author.username}
                      </Link>
                    ) : (
                      <span className="text-[12px] font-bold text-night truncate">
                        {r.author?.full_name ?? "Utilisateur"}
                      </span>
                    )}
                    <span className="text-[10px] font-bold tabular-nums text-gold-deep ml-auto">
                      {Math.round(r.similarity_score * 100)}%
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-night line-clamp-3 leading-relaxed">
                    {r.post.body}
                  </p>
                  <p className="mt-1.5 text-[10.5px] text-night-dim">
                    {new Date(r.post.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
