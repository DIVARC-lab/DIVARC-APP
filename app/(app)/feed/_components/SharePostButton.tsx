"use client";

import { ExternalLink, Search, Send, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { trackEvent } from "@/lib/tracking/eventTracker";
import {
  listShareTargets,
  sharePostToConversation,
  type ShareTarget,
} from "../actions";

type Props = {
  postId: string;
};

/* SharePostButton — priorité au partage INTERNE DIVARC.
 *
 * Comportement attendu (validé par le founder) :
 *  1) L'utilisateur clique → on ouvre une modale qui liste ses amis,
 *     ses discussions et groupes pour partager direct dans DIVARC.
 *  2) Une action secondaire « Partager hors de DIVARC » bascule sur
 *     le menu natif (navigator.share) ou copie le lien (desktop).
 *
 * Pourquoi : on garde le user dans l'app au lieu de l'envoyer vers
 * WhatsApp/SMS. C'est la priorité stratégique du produit. */
export function SharePostButton({ postId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Partager"
        className="inline-flex items-center justify-center h-11 w-11 shrink-0 rounded-full text-night-soft hover:bg-night/5 hover:text-night transition-colors"
      >
        <Send className="w-[15px] h-[15px]" aria-hidden />
      </button>
      {open ? (
        <ShareSheet postId={postId} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

type SheetProps = {
  postId: string;
  onClose: () => void;
};

function ShareSheet({ postId, onClose }: SheetProps) {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ShareTarget[]>([]);
  const [friends, setFriends] = useState<ShareTarget[]>([]);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await listShareTargets();
      if (cancelled) return;
      if (res.ok) {
        setConversations(res.conversations);
        setFriends(res.friends);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function targetKey(t: ShareTarget) {
    return `${t.kind}:${t.id}`;
  }

  function handlePick(target: ShareTarget) {
    const key = targetKey(target);
    if (pendingId || sentIds.has(key)) return;
    setPendingId(key);
    startTransition(async () => {
      const res = await sharePostToConversation({
        postId,
        target:
          target.kind === "conversation"
            ? { kind: "conversation", conversationId: target.id }
            : { kind: "user", userId: target.id },
      });
      setPendingId(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSentIds((prev) => new Set(prev).add(key));
      trackEvent("post.share_internal", {
        target_post_id: postId,
      });
      toast.success(`Envoyé à ${target.label}.`);
    });
  }

  async function handleExternal() {
    const url = `${window.location.origin}/feed/${postId}`;
    const shareData: ShareData = {
      title: "Post sur DIVARC",
      text: "Regarde ce post sur DIVARC",
      url,
    };
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        trackEvent("post.share_external", { target_post_id: postId });
        onClose();
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié dans le presse-papiers.");
      trackEvent("post.share_external", { target_post_id: postId });
      onClose();
    } catch {
      toast.error("Copie impossible.");
    }
  }

  const q = query.trim().toLowerCase();
  const matches = (t: ShareTarget) => {
    if (q.length === 0) return true;
    const hay = [t.label, t.subtitle].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  };
  const filteredConvs = conversations.filter(matches);
  const filteredFriends = friends.filter(matches);
  const empty =
    !loading && filteredConvs.length === 0 && filteredFriends.length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Partager ce post"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/40 backdrop-blur-sm sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-bg rounded-t-3xl sm:rounded-3xl border border-line shadow-[0_20px_60px_-20px_rgba(10,31,68,0.4)] overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]"
      >
        <header className="px-5 pt-5 pb-3 border-b border-line flex items-center gap-2">
          <Send className="w-4 h-4 text-night-muted" aria-hidden />
          <h2 className="text-sm font-bold text-night flex-1">
            Partager vers…
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <div className="px-5 py-3 relative border-b border-line">
          <Search
            className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Rechercher un ami, une discussion…"
            className="w-full h-10 rounded-full border border-line bg-white pl-10 pr-4 text-sm text-night placeholder:text-muted/70 focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/20"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="text-center py-8 text-xs text-muted">Chargement…</p>
          ) : empty ? (
            <p className="text-center py-8 text-xs text-muted">
              Aucun contact trouvé.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredConvs.length > 0 ? (
                <section>
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-night-muted">
                    Discussions récentes
                  </p>
                  <ul className="space-y-1">
                    {filteredConvs.map((target) => (
                      <TargetRow
                        key={targetKey(target)}
                        target={target}
                        pending={pendingId === targetKey(target) || pending}
                        sent={sentIds.has(targetKey(target))}
                        onPick={() => handlePick(target)}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}

              {filteredFriends.length > 0 ? (
                <section>
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-night-muted">
                    Tes amis
                  </p>
                  <ul className="space-y-1">
                    {filteredFriends.map((target) => (
                      <TargetRow
                        key={targetKey(target)}
                        target={target}
                        pending={pendingId === targetKey(target) || pending}
                        sent={sentIds.has(targetKey(target))}
                        onPick={() => handlePick(target)}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>

        <footer className="border-t border-line p-3">
          <button
            type="button"
            onClick={handleExternal}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl border border-line bg-white text-sm font-semibold text-night-muted hover:bg-night/5 hover:text-night transition-colors"
          >
            <ExternalLink className="w-4 h-4" aria-hidden />
            Partager hors de DIVARC
          </button>
        </footer>
      </div>
    </div>
  );
}

type RowProps = {
  target: ShareTarget;
  pending: boolean;
  sent: boolean;
  onPick: () => void;
};

function TargetRow({ target, pending, sent, onPick }: RowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        disabled={pending || sent}
        className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-night/5 text-left transition-colors disabled:opacity-50"
      >
        <Avatar src={target.avatar_url} fullName={target.label} size="sm" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-night truncate">
            {target.label}
          </span>
          {target.subtitle ? (
            <span className="block text-xs text-muted truncate">
              {target.subtitle}
            </span>
          ) : null}
        </span>
        <span
          className={
            sent
              ? "text-[11px] font-semibold text-success"
              : "text-[11px] font-semibold text-gold-deep"
          }
        >
          {sent ? "Envoyé" : pending ? "…" : "Envoyer"}
        </span>
      </button>
    </li>
  );
}
