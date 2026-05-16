"use client";

/* UI recherche messages avec FTS Postgres.
 * Debounce 300ms, max 50 résultats, rank decroissant. */

import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";

type Hit = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  type: string;
  created_at: string;
  conv_name: string | null;
  conv_type: string;
  conv_avatar_url: string | null;
  sender_username: string | null;
  sender_full_name: string | null;
  sender_avatar_url: string | null;
  rank: number;
};

type Props = {
  initialQuery: string;
};

export function SearchMessagesClient({ initialQuery }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const supabase = createClient();
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const { data } = await (supabase as any).rpc(
          "search_my_messages",
          { p_query: trimmed, p_limit: 50 },
        );
        setResults((data ?? []) as Hit[]);
      } catch {
        /* silencieux */
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  function highlight(text: string, q: string): React.ReactNode {
    if (!q || !text) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-gold/30 text-night px-0.5 rounded">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <>
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-dim"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder="Recherche un mot, une phrase, un nom…"
          className="w-full h-12 pl-10 pr-4 rounded-full bg-white border border-line text-[14px] placeholder:text-night-dim focus:outline-none focus:border-gold-deep transition-colors"
        />
        {loading ? (
          <Loader2
            className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gold-deep"
            aria-hidden
          />
        ) : null}
      </div>

      {query.trim().length === 0 ? (
        <p className="text-center text-[13px] text-night-dim italic mt-12">
          Tape au moins 2 caractères pour lancer la recherche.
        </p>
      ) : results.length === 0 && !loading ? (
        <p className="text-center text-[13px] text-night-dim italic mt-12">
          Aucun message trouvé pour &laquo; {query} &raquo;.
        </p>
      ) : (
        <ul className="space-y-2">
          {results.map((h) => {
            const senderName =
              h.sender_full_name ?? h.sender_username ?? "Auteur";
            const dateStr = new Date(h.created_at).toLocaleDateString(
              "fr-FR",
              {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              },
            );
            return (
              <li key={h.id}>
                <Link
                  href={`/messages/${h.conversation_id}?focus=${h.id}`}
                  className="block p-3 rounded-2xl bg-white border border-line hover:border-gold/40 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Avatar
                      src={h.sender_avatar_url}
                      fullName={senderName}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-extrabold text-night truncate">
                        {senderName}
                        {h.conv_name ? (
                          <span className="text-night-dim font-normal">
                            {" "}
                            · {h.conv_name}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[10px] text-night-dim tabular-nums">
                        {dateStr}
                      </p>
                    </div>
                  </div>
                  {h.body ? (
                    <p className="text-[13px] text-night-soft line-clamp-3 leading-snug">
                      {highlight(h.body, query.trim())}
                    </p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
