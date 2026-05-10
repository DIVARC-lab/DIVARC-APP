"use client";

import { Hash, Loader2, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

/* MentionAutocomplete — dropdown floating sous un textarea pour
 * suggérer des utilisateurs (@) ou hashtags (#) en cours de frappe.
 *
 * Usage : le parent appelle detectMentionTrigger(textareaRef, body)
 * à chaque change. Si un trigger est trouvé, ce composant s'affiche
 * et l'utilisateur peut sélectionner via clavier ou tap. Le parent
 * reçoit la valeur via onSelect(replacement) — il la substitue à la
 * portion du body entre [start, end].
 *
 * Pour rester simple (V1), le dropdown s'affiche juste sous le
 * textarea (pas de positionnement caret pixel-perfect). UX déjà OK.
 */

export type MentionTrigger = {
  /** Type de trigger détecté. */
  kind: "mention" | "hashtag";
  /** Position de @ ou # dans le body (inclus). */
  start: number;
  /** Position du caret courant. */
  end: number;
  /** Texte saisi entre le @/# et le caret (sans le préfixe). */
  query: string;
};

/** Détecte le trigger @user ou #hashtag courant à la position du caret.
 *  Retourne null si le caret n'est pas dans un trigger valide. */
export function detectMentionTrigger(
  body: string,
  caretPos: number,
): MentionTrigger | null {
  if (caretPos === 0) return null;
  /* Cherche le dernier @ ou # avant le caret, sans whitespace ni
     préfixe collé à un autre caractère. */
  const before = body.slice(0, caretPos);
  /* Match : (^|whitespace)(@|#)([\w-]*) à la fin. */
  const m = before.match(/(^|\s)([@#])([A-Za-z0-9_]{0,30})$/);
  if (!m) return null;
  const triggerChar = m[2];
  const query = m[3] ?? "";
  /* Position de @/# = caretPos - query.length - 1 */
  const start = caretPos - query.length - 1;
  return {
    kind: triggerChar === "@" ? "mention" : "hashtag",
    start,
    end: caretPos,
    query,
  };
}

type UserSuggestion = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type HashtagSuggestion = {
  id: string;
  tag: string;
  posts_count: number;
};

type Props = {
  trigger: MentionTrigger | null;
  /** Texte de remplacement choisi : "@username" ou "#tag" (sans
   *  espace de suffixe — le parent gère l'insertion finale). */
  onSelect: (replacement: string) => void;
};

export function MentionAutocomplete({ trigger, onSelect }: Props) {
  const [users, setUsers] = useState<UserSuggestion[]>([]);
  const [hashtags, setHashtags] = useState<HashtagSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /* Fetch suggestions on trigger change. */
  useEffect(() => {
    if (!trigger) {
      setUsers([]);
      setHashtags([]);
      setHighlightIdx(0);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (trigger.kind === "mention") {
          if (trigger.query.length < 1) {
            setUsers([]);
            return;
          }
          const res = await fetch(
            `/api/users/search?q=${encodeURIComponent(trigger.query)}`,
            { cache: "no-store" },
          );
          const json = (await res.json().catch(() => ({}))) as {
            results?: UserSuggestion[];
          };
          setUsers((json.results ?? []).slice(0, 6));
        } else {
          const res = await fetch(
            `/api/hashtags/search?q=${encodeURIComponent(trigger.query)}`,
            { cache: "no-store" },
          );
          const json = (await res.json().catch(() => ({}))) as {
            hashtags?: HashtagSuggestion[];
          };
          setHashtags((json.hashtags ?? []).slice(0, 6));
        }
        setHighlightIdx(0);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trigger]);

  /* Keyboard nav — listener global tant que le trigger est actif. */
  const items =
    trigger?.kind === "mention"
      ? users.map((u) => ({
          key: u.id,
          replacement: `@${u.username ?? u.id}`,
          render: () => <UserRow user={u} />,
        }))
      : hashtags.map((h) => ({
          key: h.id,
          replacement: `#${h.tag}`,
          render: () => <HashtagRow hashtag={h} />,
        }));

  const select = useCallback(
    (idx: number) => {
      const item = items[idx];
      if (!item) return;
      onSelect(item.replacement);
    },
    [items, onSelect],
  );

  useEffect(() => {
    if (!trigger || items.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        select(highlightIdx);
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [trigger, items, highlightIdx, select]);

  if (!trigger) return null;
  if (items.length === 0 && !loading) return null;

  return (
    <div className="mt-2 rounded-xl bg-white border border-line shadow-soft overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-line bg-bg-soft">
        {trigger.kind === "mention" ? (
          <User className="w-3 h-3 text-night-muted" aria-hidden />
        ) : (
          <Hash className="w-3 h-3 text-night-muted" aria-hidden />
        )}
        <span className="text-[10.5px] uppercase tracking-wider font-bold text-night-muted">
          {trigger.kind === "mention" ? "Utilisateurs" : "Hashtags"}
        </span>
        {loading ? (
          <Loader2
            className="ml-auto w-3 h-3 animate-spin text-night-muted"
            aria-hidden
          />
        ) : null}
      </div>
      <ul className="max-h-64 overflow-y-auto">
        {items.map((item, idx) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => select(idx)}
              onMouseEnter={() => setHighlightIdx(idx)}
              className={cn(
                "w-full text-left px-3 py-2 hover:bg-bg-soft",
                highlightIdx === idx && "bg-bg-soft",
              )}
            >
              {item.render()}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserRow({ user }: { user: UserSuggestion }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar
        src={user.avatar_url}
        fullName={user.full_name}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-bold text-night truncate">
          {user.full_name ?? `@${user.username ?? "user"}`}
        </p>
        {user.username && user.full_name ? (
          <p className="text-[10.5px] text-night-muted truncate">
            @{user.username}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function HashtagRow({ hashtag }: { hashtag: HashtagSuggestion }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <Hash className="w-3.5 h-3.5 text-gold-deep shrink-0" aria-hidden />
        <span className="text-[12.5px] font-bold text-night truncate">
          {hashtag.tag}
        </span>
      </span>
      <span className="text-[10.5px] text-night-muted shrink-0">
        {hashtag.posts_count} {hashtag.posts_count > 1 ? "posts" : "post"}
      </span>
    </div>
  );
}
