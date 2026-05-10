"use client";

import { Loader2, Search, UserPlus2, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

/* FriendTagger — modal de recherche + multi-sélection d'utilisateurs
 * à taguer dans un post. Style Facebook "Identifier des personnes".
 *
 * Source : /api/users/search?q=... (existant, déjà filtré sur
 * discoverable=true et friendship privacy).
 *
 * Output : TaggedUser[] — { id, full_name, username, avatar_url } */

export type TaggedUser = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type SearchResult = TaggedUser & { location: string | null };

type Props = {
  initialTags: TaggedUser[];
  onApply: (tags: TaggedUser[]) => void;
  onClose: () => void;
};

export function FriendTagger({ initialTags, onApply, onClose }: Props) {
  const [tags, setTags] = useState<TaggedUser[]>(initialTags);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setResults([]);
        return;
      }
      const json = (await res.json()) as { results?: SearchResult[] };
      setResults(json.results ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  const isSelected = (id: string) => tags.some((t) => t.id === id);

  const toggle = (user: TaggedUser) => {
    setTags((prev) =>
      isSelected(user.id)
        ? prev.filter((t) => t.id !== user.id)
        : prev.length >= 30
          ? prev /* limite 30 tags max par post */
          : [...prev, user],
    );
  };

  const apply = () => {
    onApply(tags);
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <p className="font-display italic text-[18px] text-night flex items-center gap-2">
          <Users className="w-4 h-4 text-gold-deep" aria-hidden />
          Identifier des personnes
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-night-muted hover:text-night"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
      </header>

      {/* Recherche. */}
      <div className="px-4 pt-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-muted"
            aria-hidden
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un ami…"
            autoFocus
            className="w-full pl-9 pr-3 py-2 rounded-full border border-line bg-bg-soft text-[13px]"
          />
          {loading ? (
            <Loader2
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-night-muted"
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      {/* Tags sélectionnés (chips). */}
      {tags.length > 0 ? (
        <div className="px-4 pt-3">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1.5">
            Sélectionnés ({tags.length}/30)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-night text-cream text-[11.5px] font-semibold"
              >
                <span className="truncate max-w-[140px]">
                  {tag.full_name ??
                    (tag.username ? `@${tag.username}` : "Utilisateur")}
                </span>
                <button
                  type="button"
                  onClick={() => toggle(tag)}
                  className="hover:text-amber-300"
                  aria-label={`Retirer ${tag.full_name ?? tag.username}`}
                >
                  <X className="w-3 h-3" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Résultats. */}
      <div className="flex-1 overflow-y-auto px-1 pt-2 pb-4 min-h-0">
        {query.length >= 2 && results.length === 0 && !loading ? (
          <div className="px-4 py-6 text-center text-[12.5px] text-night-muted">
            Aucun utilisateur pour « {query} ».
          </div>
        ) : null}

        {query.length < 2 && tags.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <UserPlus2
              className="w-7 h-7 text-night-muted mx-auto mb-2"
              aria-hidden
            />
            <p className="text-[12.5px] text-night-muted leading-snug max-w-xs mx-auto">
              Tape au moins 2 caractères pour rechercher quelqu&apos;un à
              identifier dans ton post.
            </p>
          </div>
        ) : null}

        <ul className="divide-y divide-line">
          {results.map((user) => {
            const selected = isSelected(user.id);
            return (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => toggle(user)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 hover:bg-bg-soft transition-colors text-left",
                    selected && "bg-night/[0.03]",
                  )}
                >
                  <Avatar
                    src={user.avatar_url}
                    fullName={user.full_name}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-night truncate">
                      {user.full_name ??
                        (user.username ? `@${user.username}` : "Utilisateur")}
                    </p>
                    {user.username && user.full_name ? (
                      <p className="text-[11.5px] text-night-muted truncate">
                        @{user.username}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full border-2",
                      selected
                        ? "bg-night border-night text-cream"
                        : "border-line text-transparent",
                    )}
                    aria-hidden
                  >
                    ✓
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer. */}
      <footer className="flex items-center justify-between gap-2 px-4 py-3 border-t border-line bg-bg-soft">
        <button
          type="button"
          onClick={() => {
            onApply([]);
            onClose();
          }}
          disabled={tags.length === 0}
          className="text-[12.5px] text-night-muted hover:text-red-600 font-semibold disabled:opacity-40"
        >
          Tout retirer
        </button>
        <button
          type="button"
          onClick={apply}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-night text-cream text-[13px] font-bold"
        >
          {tags.length > 0
            ? `Identifier ${tags.length} personne${tags.length > 1 ? "s" : ""}`
            : "Valider"}
        </button>
      </footer>
    </div>
  );
}
