"use client";

import { Loader2, MapPin, Search, UserPlus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { startDirectConversation } from "../actions";

type SearchResult = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  location: string | null;
};

export function UserSearch() {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [starting, startTransition] = useTransition();
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const controller = new AbortController();

    fetch(`/api/users/search?q=${encodeURIComponent(debounced)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((data: { results: SearchResult[] }) => {
        if (controller.signal.aborted) return;
        setResults(data.results ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });

    return () => controller.abort();
  }, [debounced]);

  function handleStart(userId: string) {
    setActiveUserId(userId);
    startTransition(async () => {
      const result = await startDirectConversation(userId);
      if (result?.error) {
        toast.error(result.error);
        setActiveUserId(null);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
          aria-hidden
        />
        <input
          type="search"
          autoFocus
          placeholder="Rechercher par nom ou pseudo..."
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          className="w-full h-12 rounded-xl border border-line bg-white pl-11 pr-4 text-fg placeholder:text-muted focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
        />
        {searching ? (
          <Loader2
            className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted animate-spin"
            aria-hidden
          />
        ) : null}
      </div>

      <ul className="space-y-2">
        {results.map((result) => {
          const displayName = result.full_name ?? result.username ?? "Utilisateur";
          const isStarting = activeUserId === result.id && starting;
          return (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => handleStart(result.id)}
                disabled={starting}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-line hover:border-night/30 hover:shadow-soft transition-all text-left disabled:opacity-60"
              >
                <Avatar
                  src={result.avatar_url}
                  fullName={displayName}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-night truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {result.username ? `@${result.username}` : ""}
                    {result.location ? (
                      <>
                        {result.username ? " · " : ""}
                        <MapPin className="inline w-3 h-3 mb-0.5" />{" "}
                        {result.location}
                      </>
                    ) : null}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-night-muted flex items-center gap-1">
                  {isStarting ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  ) : (
                    <UserPlus className="w-4 h-4" aria-hidden />
                  )}
                  {isStarting ? "Ouverture..." : "Discuter"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!searching && debounced.length >= 2 && results.length === 0 ? (
        <p className="text-center text-sm text-muted py-8">
          Aucun utilisateur trouvé pour « {debounced} ».
        </p>
      ) : null}

      {debounced.length < 2 ? (
        <p className="text-center text-xs text-muted py-8">
          Tape au moins 2 caractères pour lancer la recherche.
        </p>
      ) : null}
    </div>
  );
}
