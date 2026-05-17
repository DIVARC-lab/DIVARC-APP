"use client";

import {
  ArrowRight,
  CornerDownLeft,
  Loader2,
  MapPin,
  Search,
  ShoppingBag,
  Sparkle,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { CATEGORY_META } from "@/lib/utils/categories";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/currency";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { Currency, ListingCategory } from "@/lib/database.types";
import type { GlobalSearchResults } from "@/app/api/search/route";

const EMPTY_RESULTS: GlobalSearchResults = {
  users: [],
  listings: [],
  posts: [],
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 220);
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY_RESULTS);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Reset query + results synchrone avec la fermeture, pas dans un effect.
     Évite les cascading renders flaggés par react-hooks/set-state-in-effect. */
  function closeSearch() {
    setOpen(false);
    setQuery("");
    setResults(EMPTY_RESULTS);
    setSearching(false);
  }

  // Cmd+K / Ctrl+K to toggle
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
      if (event.key === "Escape") {
        closeSearch();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  /* Search effect : on n'appelle setState que dans les callbacks async pour
     respecter react-hooks/set-state-in-effect (React 19 strict). Le marker
     "searching=true" passe par startTransition pour éviter le cascading
     render synchrone. */
  useEffect(() => {
    if (debounced.length < 2) return;
    const controller = new AbortController();
    startTransition(() => setSearching(true));
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data: { results: GlobalSearchResults }) => {
        if (!controller.signal.aborted) {
          setResults(data.results ?? EMPTY_RESULTS);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setResults(EMPTY_RESULTS);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });
    return () => controller.abort();
  }, [debounced]);

  function navigate(href: string) {
    closeSearch();
    router.push(href);
  }

  /* Quand le terme est trop court, on dérive l'affichage (pas de setState).
     Évite la dépendance au useEffect pour reset, qui violait set-state-in-effect. */
  const hasSearchTerm = debounced.length >= 2;
  const visibleResults = hasSearchTerm ? results : EMPTY_RESULTS;
  const isSearching = hasSearchTerm && searching;
  const total =
    visibleResults.users.length +
    visibleResults.listings.length +
    visibleResults.posts.length;

  return (
    <>
      <SearchTrigger onClick={() => setOpen(true)} />

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Recherche globale"
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-night/40 backdrop-blur-sm"
          onClick={closeSearch}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl bg-bg border border-line shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)] overflow-hidden"
          >
            <header className="flex items-center gap-3 px-5 py-4 border-b border-line bg-white">
              <Search className="w-5 h-5 text-muted shrink-0" aria-hidden />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Recherche personnes, annonces, posts..."
                className="flex-1 bg-transparent text-night placeholder:text-muted focus:outline-none text-base"
              />
              {isSearching ? (
                <Loader2
                  className="w-4 h-4 text-muted animate-spin"
                  aria-hidden
                />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Effacer"
                  className="text-muted hover:text-night"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              ) : null}
              <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-line bg-night/[0.03] text-[10px] font-semibold text-muted">
                Esc
              </kbd>
            </header>

            <div className="max-h-[60vh] overflow-y-auto">
              {!hasSearchTerm ? (
                <EmptyHint />
              ) : !isSearching && total === 0 ? (
                <NoResults query={debounced} />
              ) : (
                <div className="p-2 sm:p-3 space-y-2">
                  {visibleResults.users.length > 0 ? (
                    <Section title="Personnes" icon={Users}>
                      {visibleResults.users.map((u) => (
                        <ResultButton
                          key={u.id}
                          onClick={() => navigate(`/u/${u.username ?? ""}`)}
                        >
                          <Avatar
                            src={u.avatar_url}
                            fullName={u.full_name ?? u.username}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-night truncate">
                              {u.full_name ?? u.username}
                            </p>
                            <p className="text-xs text-muted truncate">
                              {u.username ? `@${u.username}` : ""}
                              {u.location ? (
                                <>
                                  {u.username ? " · " : ""}
                                  <MapPin className="inline w-3 h-3 mb-0.5" />{" "}
                                  {u.location}
                                </>
                              ) : null}
                            </p>
                          </div>
                          <ArrowRight
                            className="w-4 h-4 text-muted"
                            aria-hidden
                          />
                        </ResultButton>
                      ))}
                    </Section>
                  ) : null}

                  {visibleResults.listings.length > 0 ? (
                    <Section title="Annonces" icon={ShoppingBag}>
                      {visibleResults.listings.map((l) => {
                        const cat = CATEGORY_META[l.category as ListingCategory];
                        return (
                          <ResultButton
                            key={l.id}
                            onClick={() => navigate(`/marketplace/${l.id}`)}
                          >
                            <div className="w-9 h-9 rounded-xl bg-night/5 border border-line overflow-hidden flex items-center justify-center text-xl shrink-0">
                              {l.photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={l.photo_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span aria-hidden>{cat?.emoji ?? "📦"}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-night truncate">
                                {l.title}
                              </p>
                              <p className="text-xs text-muted truncate">
                                {formatPrice(
                                  l.price_amount,
                                  l.price_currency as Currency,
                                )}
                                {cat ? ` · ${cat.label}` : ""}
                              </p>
                            </div>
                            <ArrowRight
                              className="w-4 h-4 text-muted"
                              aria-hidden
                            />
                          </ResultButton>
                        );
                      })}
                    </Section>
                  ) : null}

                  {visibleResults.posts.length > 0 ? (
                    <Section title="Posts" icon={Sparkle}>
                      {visibleResults.posts.map((p) => (
                        <ResultButton
                          key={p.id}
                          onClick={() => navigate(`/feed/${p.id}`)}
                        >
                          <Avatar
                            src={p.author_avatar_url}
                            fullName={p.author_name ?? p.author_username}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-night truncate">
                              {p.author_name ?? p.author_username ?? "Post"}
                            </p>
                            <p className="text-xs text-muted truncate">
                              {p.body ?? ""}
                            </p>
                          </div>
                          <ArrowRight
                            className="w-4 h-4 text-muted"
                            aria-hidden
                          />
                        </ResultButton>
                      ))}
                    </Section>
                  ) : null}
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between gap-3 px-5 py-3 border-t border-line bg-white text-[11px] text-muted">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" aria-hidden />
                  Ouvrir
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded-md border border-line bg-night/[0.03] text-[10px] font-semibold text-muted">
                    Esc
                  </kbd>
                  Fermer
                </span>
              </div>
              <span>DIVARC Search</span>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ouvrir la recherche"
      className="group flex items-center gap-3 w-full h-10 px-3 rounded-xl border border-line bg-white hover:border-night/30 hover:bg-night/[0.02] transition-colors text-night-muted hover:text-night"
    >
      <Search className="w-4 h-4 shrink-0" aria-hidden />
      <span className="flex-1 text-left text-sm">Rechercher...</span>
      <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-line bg-night/[0.03] text-[10px] font-semibold text-muted">
        ⌘ K
      </kbd>
    </button>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted">
        <Icon className="w-3 h-3" aria-hidden />
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ResultButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors",
        "hover:bg-night/[0.04] focus:bg-night/[0.06] focus:outline-none",
      )}
    >
      {children}
    </button>
  );
}

function EmptyHint() {
  return (
    <div className="px-6 py-12 text-center">
      <div
        aria-hidden
        className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-4"
      >
        <Search className="w-6 h-6 text-night-muted" aria-hidden />
      </div>
      <p className="font-display text-lg text-night">
        Cherche tout, partout dans DIVARC
      </p>
      <p className="mt-1 text-sm text-muted">
        Personnes, annonces, posts. Tape au moins 2 caractères.
      </p>
      <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-muted">
        <Suggestion>Léa</Suggestion>
        <Suggestion>tissu wax</Suggestion>
        <Suggestion>Paris</Suggestion>
      </div>
    </div>
  );
}

function Suggestion({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-night/5 text-night-muted">
      « {children} »
    </span>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm text-muted">
        Aucun résultat pour <strong className="text-night">« {query} »</strong>.
      </p>
      <p className="mt-1 text-xs text-muted">
        Vérifie l&apos;orthographe ou essaie un autre mot.
      </p>
    </div>
  );
}
