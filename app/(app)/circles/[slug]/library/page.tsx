import {
  BookOpen,
  ExternalLink,
  Eye,
  FileText,
  Link as LinkIcon,
  ListTodo,
  PenLine,
  Plus,
  Video,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { KickerLabel } from "@/components/ui/KickerLabel";
import {
  getCircleBySlug,
  listCircleLibraryCategories,
  listCircleLibraryItems,
} from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import type {
  CircleLibraryCategory,
  CircleLibraryItem,
  CircleLibraryItemType,
} from "@/lib/database.types";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "Bibliothèque du cercle" };

const TYPE_META: Record<
  CircleLibraryItemType,
  { icon: typeof FileText; label: string; color: string }
> = {
  document: { icon: FileText, label: "Document", color: "bg-blue-50 text-blue-700" },
  video: { icon: Video, label: "Vidéo", color: "bg-rose-50 text-rose-700" },
  article: { icon: PenLine, label: "Article", color: "bg-amber-50 text-amber-700" },
  link: { icon: LinkIcon, label: "Lien", color: "bg-night/5 text-night" },
  template: { icon: ListTodo, label: "Template", color: "bg-violet-50 text-violet-700" },
  wiki: { icon: BookOpen, label: "Wiki", color: "bg-emerald-50 text-emerald-700" },
};

export default async function CircleLibraryTab({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  if (circle.modules && !circle.modules.library) {
    return (
      <div className="px-5 sm:px-8 py-10 text-center">
        <p className="text-[14px] text-night-dim">
          La Bibliothèque n&apos;est pas activée pour ce cercle.
        </p>
      </div>
    );
  }

  const [categories, items] = await Promise.all([
    listCircleLibraryCategories(circle.id),
    listCircleLibraryItems(circle.id, { limit: 200 }),
  ]);

  /* Group items par category_id (null = "Sans catégorie"). */
  const itemsByCategory = new Map<string | null, CircleLibraryItem[]>();
  for (const item of items) {
    const key = item.category_id;
    const list = itemsByCategory.get(key) ?? [];
    list.push(item);
    itemsByCategory.set(key, list);
  }

  const sections: Array<{
    category: CircleLibraryCategory | null;
    items: CircleLibraryItem[];
  }> = categories.map((cat) => ({
    category: cat,
    items: itemsByCategory.get(cat.id) ?? [],
  }));
  const uncategorized = itemsByCategory.get(null) ?? [];
  if (uncategorized.length > 0) {
    sections.push({ category: null, items: uncategorized });
  }

  return (
    <section className="px-5 sm:px-8 pb-8">
      <header className="pb-4 flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gold-deep" aria-hidden />
          <KickerLabel>
            {items.length} ressource{items.length > 1 ? "s" : ""}
          </KickerLabel>
        </div>
        {circle.is_member ? (
          <Link
            href={`/circles/${slug}/library/new`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-night text-cream text-[12px] font-extrabold hover:bg-night-soft transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden strokeWidth={2.5} />
            Ajouter une ressource
          </Link>
        ) : null}
      </header>

      {items.length === 0 ? (
        <EmptyState
          emoji="📚"
          kicker="Bibliothèque vide"
          title={
            <>
              Pas encore de ressource dans{" "}
              <em className="italic text-gold-deep">{circle.name}</em>
            </>
          }
          body={
            circle.is_member
              ? "Articles, vidéos, templates, wikis : enrichis la bibliothèque du cercle."
              : "Rejoins le cercle pour contribuer."
          }
          ctaHref={
            circle.is_member ? `/circles/${slug}/library/new` : `/circles/${slug}`
          }
          ctaLabel={
            circle.is_member ? "Ajouter la première" : "Rejoindre le cercle"
          }
          size="lg"
        />
      ) : (
        <div className="space-y-6">
          {sections.map(({ category, items: catItems }) => (
            <div key={category?.id ?? "uncategorized"}>
              <header className="pb-2.5">
                <h3 className="text-[14px] font-extrabold text-night">
                  {category?.label ?? "Sans catégorie"}
                  <span className="text-night-dim font-semibold ml-2">
                    ({catItems.length})
                  </span>
                </h3>
                {category?.description ? (
                  <p className="text-[11px] text-night-dim">
                    {category.description}
                  </p>
                ) : null}
              </header>
              <ul className="space-y-2">
                {catItems.map((item) => (
                  <li key={item.id}>
                    <LibraryItemRow item={item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LibraryItemRow({ item }: { item: CircleLibraryItem }) {
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  const href = item.content_url ?? "#";
  const externalProps = item.content_url
    ? {
        href,
        target: "_blank" as const,
        rel: "noopener noreferrer",
      }
    : { href };

  return (
    <a
      {...externalProps}
      className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-line hover:border-gold/40 transition-colors"
    >
      <span
        aria-hidden
        className={`inline-flex w-9 h-9 rounded-xl items-center justify-center shrink-0 ${meta.color}`}
      >
        <Icon className="w-4 h-4" aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <p className="text-[13.5px] font-bold text-night truncate">
            {item.title}
          </p>
          {!item.is_approved ? (
            <span
              aria-label="En attente de validation"
              className="inline-flex items-center h-4 px-1.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold"
            >
              En attente
            </span>
          ) : null}
          {item.content_url ? (
            <ExternalLink
              className="w-3 h-3 text-night-dim/60 shrink-0"
              aria-hidden
            />
          ) : null}
        </div>
        {item.description ? (
          <p className="mt-0.5 text-[12px] text-night-dim line-clamp-2 leading-snug">
            {item.description}
          </p>
        ) : null}
        <div className="mt-1 flex items-center gap-2 text-[10px] text-night-dim/80">
          <span className="font-extrabold uppercase tracking-wider">
            {meta.label}
          </span>
          {item.views_count > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <Eye className="w-2.5 h-2.5" aria-hidden />
              <span className="tabular-nums">{item.views_count}</span>
            </span>
          ) : null}
          {item.tags && item.tags.length > 0 ? (
            <span className="truncate">
              {item.tags
                .slice(0, 3)
                .map((t) => `#${t}`)
                .join(" ")}
            </span>
          ) : null}
        </div>
      </div>
    </a>
  );
}
