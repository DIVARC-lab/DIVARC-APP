"use client";

import { Loader2, MapPin, Search, UserPlus } from "lucide-react";
import {
  startTransition as startReactTransition,
  useEffect,
  useState,
  useTransition,
} from "react";
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

  /* React 19 strict : pas de setState synchrone dans un effet. On dérive
     l'affichage de `debounced` (visibleResults) et on ne touche aux states
     que dans les callbacks async. Le marker "searching=true" passe par
     startTransition. */
  useEffect(() => {
    if (debounced.length < 2) return;
    const controller = new AbortController();
    startReactTransition(() => setSearching(true));
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

  const hasSearchTerm = debounced.length >= 2;
  const visibleResults = hasSearchTerm ? results : [];
  const isSearching = hasSearchTerm && searching;

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
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]"
          aria-hidden
        />
        <input
          type="search"
          autoFocus
          placeholder="Cherche par nom ou pseudo..."
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          className="w-full h-12 rounded-xl border border-[#e6e9f0] bg-[#ffffff] pl-11 pr-4 text-[#0a1f44] placeholder:text-[#6b7280] focus:outline-none focus:border-[#0a1f44] focus:ring-2 focus:ring-night/15"
        />
        {isSearching ? (
          <Loader2
            className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280] animate-spin"
            aria-hidden
          />
        ) : null}
      </div>

      {debounced.length < 2 ? (
        <p className="text-center text-xs text-[#6b7280] py-8">
          Tape le nom d&apos;un proche pour démarrer ton réseau.
        </p>
      ) : !isSearching && visibleResults.length === 0 ? (
        <p className="text-center text-sm text-[#6b7280] py-8">
          Aucun résultat. Tu pourras toujours en ajouter plus tard.
        </p>
      ) : (
        <ul className="space-y-2">
          {visibleResults.map((result) => {
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
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#ffffff] border border-[#e6e9f0]"
              >
                <Avatar
                  src={result.avatar_url}
                  fullName={displayName}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0a1f44] truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-[#6b7280] truncate">
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
                  <span className="px-3 py-1 rounded-full bg-[#0a1f44]/5 text-[#4b5b87] text-xs font-semibold">
                    Envoyée
                  </span>
                ) : incoming ? (
                  <span className="px-3 py-1 rounded-full bg-[#f4b942]/15 text-[#b88a2a] text-xs font-semibold">
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
