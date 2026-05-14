"use client";

/* ReactionsBar — Chantier Feed 4.1.
 *
 * Remplace LikeButton par les 6 réactions DIVARC :
 *   heart / applause / insightful / surprised / sad / laugh
 *
 * Comportement :
 *  - Le bouton principal montre le compteur total + l'emoji de "ma" réaction
 *    si je m'en suis donnée une (heart par défaut visuellement).
 *  - Au clic, on ouvre un picker compact des 6 réactions.
 *  - Au clic sur une réaction du picker : appel RPC toggle_post_reaction.
 *  - Optimistic update du compteur, rollback si la RPC échoue.
 *  - Si on n'a aucune réaction et qu'on tape directement le bouton principal :
 *    toggle heart (action rapide).
 *
 * Les données initiales (counts + my_reactions) sont fetchées au mount via
 * supabase client — ça évite de toucher aux server queries existantes.
 */
import { Heart, Loader2, Plus } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { PostReactionType } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

type Props = {
  postId: string;
  initialTotal?: number;
};

type ReactionDef = {
  type: PostReactionType;
  emoji: string;
  label: string;
  color: string;
};

const REACTIONS: ReactionDef[] = [
  { type: "heart", emoji: "❤️", label: "J'aime", color: "text-rose-600" },
  {
    type: "applause",
    emoji: "👏",
    label: "Bravo",
    color: "text-amber-600",
  },
  {
    type: "insightful",
    emoji: "💡",
    label: "Éclairant",
    color: "text-violet-600",
  },
  {
    type: "surprised",
    emoji: "😮",
    label: "Wow",
    color: "text-sky-600",
  },
  { type: "sad", emoji: "😢", label: "Triste", color: "text-night-soft" },
  { type: "laugh", emoji: "😂", label: "Drôle", color: "text-emerald-600" },
  /* Migration 0127 — DIVARC custom : 🔥 hype, ✨ magique. */
  { type: "fire", emoji: "🔥", label: "Feu", color: "text-orange-600" },
  {
    type: "sparkle",
    emoji: "✨",
    label: "Magique",
    color: "text-gold-deep",
  },
];

export function ReactionsBar({ postId, initialTotal }: Props) {
  const supabase = createClient();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState<number>(initialTotal ?? 0);
  const [myReactions, setMyReactions] = useState<Set<PostReactionType>>(
    new Set(),
  );
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    async function loadInitial() {
      const [{ data: post }, { data: { user } }] = await Promise.all([
        supabase
          .from("posts")
          .select("reactions_counts, total_reactions")
          .eq("id", postId)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);

      if (!mountedRef.current) return;

      if (post) {
        setCounts((post.reactions_counts ?? {}) as Record<string, number>);
        setTotal(post.total_reactions ?? 0);
      }

      if (user) {
        const { data: mine } = await supabase
          .from("post_reactions")
          .select("reaction_type")
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (mountedRef.current && mine) {
          setMyReactions(
            new Set(mine.map((r) => r.reaction_type as PostReactionType)),
          );
        }
      }
    }
    void loadInitial();
    return () => {
      mountedRef.current = false;
    };
  }, [postId, supabase]);

  function topReactions(): ReactionDef[] {
    const sorted = REACTIONS.filter((r) => (counts[r.type] ?? 0) > 0).sort(
      (a, b) => (counts[b.type] ?? 0) - (counts[a.type] ?? 0),
    );
    return sorted.slice(0, 3);
  }

  function toggle(type: PostReactionType) {
    const wasOn = myReactions.has(type);
    /* Optimistic update. */
    const nextSet = new Set(myReactions);
    if (wasOn) nextSet.delete(type);
    else nextSet.add(type);
    setMyReactions(nextSet);
    setCounts((prev) => ({
      ...prev,
      [type]: Math.max(0, (prev[type] ?? 0) + (wasOn ? -1 : 1)),
    }));
    setTotal((prev) => Math.max(0, prev + (wasOn ? -1 : 1)));

    startTransition(async () => {
      const { data, error } = await supabase.rpc("toggle_post_reaction", {
        p_post_id: postId,
        p_reaction_type: type,
      });
      if (error) {
        /* Rollback. */
        setMyReactions(myReactions);
        setCounts((prev) => ({
          ...prev,
          [type]: Math.max(0, (prev[type] ?? 0) + (wasOn ? 1 : -1)),
        }));
        setTotal((prev) => Math.max(0, prev + (wasOn ? 1 : -1)));
        toast.error("Réaction impossible.");
        return;
      }
      /* `data` est `true` si réaction ajoutée, `false` si retirée. On a
       * déjà fait l'optimistic, donc on n'a pas besoin de relire le state.
       * Mais on vérifie quand même la cohérence si jamais la RPC a fait
       * autre chose. */
      if (typeof data === "boolean" && data === wasOn) {
        /* Désynchronisé — on aligne. */
        const fixed = new Set(myReactions);
        if (data) fixed.add(type);
        else fixed.delete(type);
        setMyReactions(fixed);
      }
    });
  }

  function handleMainClick() {
    if (myReactions.size === 0) {
      /* Aucune réaction posée → tap rapide = heart. */
      toggle("heart");
    } else {
      /* J'ai déjà réagi → ouvre le picker pour voir / changer. */
      setOpen((v) => !v);
    }
  }

  /* Long-press mobile — appui >500ms ouvre le picker au lieu de faire
     un tap simple (pattern FB/Messenger). Sur desktop, le hover du
     wrapper ouvre déjà le picker (voir @media hover). */
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  function handlePressStart() {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setOpen(true);
      /* Feedback haptique léger si dispo (iOS Safari ignore, Android OK). */
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(20);
        } catch {
          /* Vibration peut être bloquée par certains contextes (iframe,
             user pas encore interagi). Ignore silencieusement. */
        }
      }
    }, 500);
  }

  function handlePressEnd() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleMainClickWithLongPressGuard() {
    /* Si long-press a déjà ouvert le picker, on swallow le click qui
       suit (pour ne pas immédiatement toggle / fermer). */
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    handleMainClick();
  }

  const myFirst = REACTIONS.find((r) => myReactions.has(r.type));
  const hasAny = myReactions.size > 0;

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleMainClickWithLongPressGuard}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressEnd}
          onTouchMove={handlePressEnd}
          /* Desktop : long-press souris pour cohérence (rare mais OK). */
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          disabled={pending}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={
            hasAny
              ? `Modifier ma réaction (${total} au total). Appui long pour ouvrir le sélecteur.`
              : "Ajouter une réaction. Appui long pour choisir un emoji."
          }
          className={cn(
            "inline-flex items-center gap-1.5 h-11 px-[14px] rounded-full transition-colors text-[13px] font-bold select-none",
            hasAny
              ? "bg-[linear-gradient(135deg,#FEF2F2,#FFE4E4)] text-[#DC2626]"
              : "bg-transparent text-night-soft hover:bg-night/5",
          )}
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : myFirst ? (
            <span className="text-[14px]" aria-hidden>
              {myFirst.emoji}
            </span>
          ) : (
            <Heart className="w-4 h-4" aria-hidden />
          )}
          {total > 0 ? total : null}
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Voir toutes les réactions"
          className="inline-flex items-center justify-center h-11 w-7 rounded-full text-night-dim hover:bg-night/5 hover:text-night transition-colors"
        >
          <Plus className="w-3 h-3" aria-hidden />
        </button>

        {/* Top 3 stickers en aperçu compact (LinkedIn-style). */}
        {topReactions().length > 0 ? (
          <div
            className="flex -space-x-1 ml-1 items-center"
            aria-hidden
          >
            {topReactions().map((r) => (
              <span
                key={r.type}
                className="inline-flex w-5 h-5 rounded-full bg-white border border-line items-center justify-center text-[10px] shadow-sm"
                title={`${r.label} : ${counts[r.type] ?? 0}`}
              >
                {r.emoji}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {open ? (
        <div
          role="menu"
          aria-label="Choisir une réaction"
          className="absolute left-0 bottom-[110%] z-20 flex items-center gap-1 p-1.5 rounded-full bg-white border border-line shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          {REACTIONS.map((r) => {
            const active = myReactions.has(r.type);
            return (
              <button
                key={r.type}
                type="button"
                onClick={() => {
                  toggle(r.type);
                  setOpen(false);
                }}
                aria-label={r.label}
                aria-pressed={active}
                title={`${r.label}${counts[r.type] ? ` · ${counts[r.type]}` : ""}`}
                className={cn(
                  "inline-flex w-9 h-9 items-center justify-center rounded-full text-[18px] transition-transform hover:scale-125",
                  active && "bg-gold/15 ring-1 ring-gold-deep",
                )}
              >
                <span aria-hidden>{r.emoji}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
