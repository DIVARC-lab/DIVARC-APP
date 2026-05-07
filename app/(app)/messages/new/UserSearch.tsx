"use client";

import {
  ArrowRight,
  Check,
  Clock,
  Loader2,
  MapPin,
  MessageSquareText,
  Search,
  UserPlus,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { createClient } from "@/lib/supabase/client";
import {
  acceptFriendRequest,
  sendFriendRequest,
} from "@/app/(app)/friends/actions";

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

export function UserSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [intros, setIntros] = useState<Record<string, string>>({});
  const [introOpen, setIntroOpen] = useState<string | null>(null);

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

  function handleSendRequest(userId: string) {
    setActiveUserId(userId);
    const intro = intros[userId];
    startTransition(async () => {
      const result = await sendFriendRequest(userId, intro);
      if (result.ok) {
        toast.success("Demande envoyée. Tu recevras un message dès qu'elle sera acceptée.");
        setIntroOpen(null);
        setIntros((prev) => ({ ...prev, [userId]: "" }));
        // Update local result state optimistically
        setResults((prev) =>
          prev.map((r) =>
            r.id === userId
              ? { ...r, friendship: { state: "outgoing", friendshipId: null } }
              : r,
          ),
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Demande impossible.");
      }
      setActiveUserId(null);
    });
  }

  function handleAccept(userId: string, friendshipId: string | null) {
    if (!friendshipId) return;
    setActiveUserId(userId);
    startTransition(async () => {
      const result = await acceptFriendRequest(friendshipId);
      if (result.ok) {
        toast.success("Demande acceptée. La conversation est ouverte.");
        // Open the conversation
        const supabase = createClient();
        const { data } = await supabase.rpc(
          "get_or_create_direct_conversation",
          { other_user_id: userId },
        );
        if (data) router.push(`/messages/${data}`);
      } else {
        toast.error(result.error ?? "Acceptation impossible.");
      }
      setActiveUserId(null);
    });
  }

  function handleOpenChat(userId: string) {
    setActiveUserId(userId);
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "get_or_create_direct_conversation",
        { other_user_id: userId },
      );
      if (error || !data) {
        toast.error("Impossible d'ouvrir la conversation.");
        setActiveUserId(null);
        return;
      }
      router.push(`/messages/${data}`);
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

      <ul className="space-y-3">
        {results.map((result) => {
          const displayName =
            result.full_name ?? result.username ?? "Utilisateur";
          const isBusy = activeUserId === result.id && pending;
          const introOpenForThis = introOpen === result.id;

          return (
            <li
              key={result.id}
              className="rounded-3xl bg-white border border-line p-4 sm:p-5"
            >
              <div className="flex items-start gap-4">
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
                <div className="shrink-0">
                  <ActionForState
                    state={result.friendship.state}
                    busy={isBusy}
                    onSend={() => {
                      if (introOpenForThis) {
                        handleSendRequest(result.id);
                      } else {
                        setIntroOpen(result.id);
                      }
                    }}
                    onAccept={() =>
                      handleAccept(result.id, result.friendship.friendshipId)
                    }
                    onOpenChat={() => handleOpenChat(result.id)}
                  />
                </div>
              </div>

              {introOpenForThis && result.friendship.state === "none" ? (
                <div className="mt-4 pt-4 border-t border-line space-y-3">
                  <label
                    htmlFor={`intro-${result.id}`}
                    className="block text-xs font-semibold text-night-muted uppercase tracking-widest"
                  >
                    Message d&apos;introduction (facultatif)
                  </label>
                  <textarea
                    id={`intro-${result.id}`}
                    rows={2}
                    maxLength={280}
                    value={intros[result.id] ?? ""}
                    onChange={(event) =>
                      setIntros((prev) => ({
                        ...prev,
                        [result.id]: event.currentTarget.value,
                      }))
                    }
                    placeholder={`Présente-toi à ${displayName.split(" ")[0]}...`}
                    className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15 resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIntroOpen(null)}
                      disabled={isBusy}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSendRequest(result.id)}
                      loading={isBusy}
                    >
                      {!isBusy ? <ArrowRight className="w-4 h-4" aria-hidden /> : null}
                      Envoyer la demande
                    </Button>
                  </div>
                </div>
              ) : null}
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

function ActionForState({
  state,
  busy,
  onSend,
  onAccept,
  onOpenChat,
}: {
  state: SearchResult["friendship"]["state"];
  busy: boolean;
  onSend: () => void;
  onAccept: () => void;
  onOpenChat: () => void;
}) {
  if (state === "friends") {
    return (
      <Button size="sm" onClick={onOpenChat} loading={busy}>
        {!busy ? <MessageSquareText className="w-4 h-4" aria-hidden /> : null}
        Discuter
      </Button>
    );
  }
  if (state === "outgoing") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-night/5 text-xs font-semibold text-night-muted">
        <Clock className="w-3.5 h-3.5" aria-hidden />
        En attente
      </span>
    );
  }
  if (state === "incoming") {
    return (
      <Button size="sm" onClick={onAccept} loading={busy}>
        {!busy ? <Check className="w-4 h-4" aria-hidden /> : null}
        Accepter
      </Button>
    );
  }
  return (
    <Button size="sm" variant="secondary" onClick={onSend} disabled={busy}>
      <UserPlus className="w-4 h-4" aria-hidden />
      Demander
    </Button>
  );
}
