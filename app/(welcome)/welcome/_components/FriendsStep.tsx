"use client";

import { Loader2, MapPin, Search, UserPlus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { sendFriendRequest } from "@/app/(app)/friends/actions";

type SearchResult = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  location: string | null;
  friendship: {
    state: "none" | "self" | "friends" | "outgoing" | "incoming";
    friendshipId: string | null;
  };
};

export function FriendsStep() {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

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
        if (!controller.signal.aborted) setResults(data.results ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });
    return () => controller.abort();
  }, [debounced]);

  function handleSend(userId: string) {
    setActiveUserId(userId);
    startTransition(async () => {
      const result = await sendFriendRequest(userId);
      if (result.ok) {
        setSentTo((prev) => new Set([...prev, userId]));
        toast.success("Demande envoyée.");
      } else {
        toast.error(result.error ?? "Demande impossible.");
      }
      setActiveUserId(null);
    });
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
          aria-hidden
        />
        <input
          type="search"
          autoFocus
          placeholder="Cherche par nom ou pseudo..."
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

      {debounced.length < 2 ? (
        <p className="text-center text-xs text-muted py-8">
          Tape le nom d&apos;un proche pour démarrer ton réseau.
        </p>
      ) : !searching && results.length === 0 ? (
        <p className="text-center text-sm text-muted py-8">
          Aucun résultat. Tu pourras toujours en ajouter plus tard.
        </p>
      ) : (
        <ul className="space-y-2">
          {results.map((result) => {
            const sent =
              sentTo.has(result.id) ||
              result.friendship.state === "outgoing";
            const friend = result.friendship.state === "friends";
            const incoming = result.friendship.state === "incoming";
            const isBusy = pending && activeUserId === result.id;
            const displayName =
              result.full_name ?? result.username ?? "Utilisateur";
            return (
              <li
                key={result.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-line"
              >
                <Avatar
                  src={result.avatar_url}
                  fullName={displayName}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-night truncate">
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
                {friend ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    Ami
                  </span>
                ) : sent ? (
                  <span className="px-3 py-1 rounded-full bg-night/5 text-night-muted text-xs font-semibold">
                    Envoyée
                  </span>
                ) : incoming ? (
                  <span className="px-3 py-1 rounded-full bg-gold/15 text-gold-deep text-xs font-semibold">
                    À accepter
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSend(result.id)}
                    loading={isBusy}
                  >
                    {!isBusy ? (
                      <UserPlus className="w-3.5 h-3.5" aria-hidden />
                    ) : null}
                    Demander
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
