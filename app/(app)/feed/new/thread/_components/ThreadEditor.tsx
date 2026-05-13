"use client";

/* ThreadEditor — Chantier Feed v2.4.
 *
 * Éditeur dédié aux posts kind='thread' :
 *  - Liste ordonnée de cartes (min 2, max 25), chacune étant un post du thread
 *  - Chaque carte : 1 à 500 chars
 *  - Réordonnement haut/bas + suppression
 *  - Audience commune au thread entier
 *  - Submit -> createThreadPosts server action (crée tous les posts liés)
 *
 * Le thread_root_id est mis sur tous les posts (le premier). Le
 * thread_reply_to_id chaîne séquentiellement. thread_position = index dans
 * la liste (0-based).
 */
import {
  ArrowDown,
  ArrowUp,
  Globe,
  Layers,
  Loader2,
  Lock,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import type { PostVisibility } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { createThreadPost, type PostV2FormState } from "../../actions";

const INITIAL: PostV2FormState = { status: "idle" };
const CARD_MIN = 1;
const CARD_MAX = 500;
const MIN_CARDS = 2;
const MAX_CARDS = 25;

type Props = {
  authorId: string;
  authorProfile: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

const VISIBILITY_OPTIONS: Array<{
  value: PostVisibility;
  label: string;
  icon: typeof Globe;
}> = [
  { value: "public", label: "Public", icon: Globe },
  { value: "friends", label: "Amis", icon: Users },
  { value: "private", label: "Privé", icon: Lock },
];

export function ThreadEditor({ authorId, authorProfile }: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState(createThreadPost, INITIAL);
  const [pending, startTransition] = useTransition();
  const [cards, setCards] = useState<string[]>(["", ""]);
  const [visibility, setVisibility] = useState<PostVisibility>("public");

  const allCardsOk = cards.every(
    (c) => c.trim().length >= CARD_MIN && c.length <= CARD_MAX,
  );
  const enoughCards = cards.length >= MIN_CARDS;
  const submitOk = allCardsOk && enoughCards && !pending;

  useEffect(() => {
    if (state.status === "success" && state.postId) {
      toast.success(`Thread publié (${cards.length} cartes)`);
      router.push(`/feed/${state.postId}`);
    } else if (state.status === "error") {
      toast.error(state.error ?? "Erreur lors de la publication");
    }
  }, [state, router, cards.length]);

  function addCard() {
    if (cards.length >= MAX_CARDS) return;
    setCards([...cards, ""]);
  }

  function removeCard(idx: number) {
    if (cards.length <= MIN_CARDS) return;
    setCards(cards.filter((_, i) => i !== idx));
  }

  function moveCard(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= cards.length) return;
    const next = [...cards];
    [next[idx], next[target]] = [next[target], next[idx]];
    setCards(next);
  }

  function updateCard(idx: number, value: string) {
    const next = [...cards];
    next[idx] = value;
    setCards(next);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!submitOk) return;
    const fd = new FormData();
    fd.set("cards", JSON.stringify(cards.map((c) => c.trim())));
    fd.set("visibility", visibility);
    fd.set("author_id", authorId);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar
          src={authorProfile?.avatar_url ?? null}
          fullName={
            authorProfile?.full_name ?? authorProfile?.username ?? "Auteur"
          }
          size="md"
        />
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-night">
            {authorProfile?.full_name ?? authorProfile?.username ?? "Toi"}
          </p>
          <p className="text-[11px] text-night-dim flex items-center gap-1">
            <Layers className="w-3 h-3" aria-hidden />
            Thread · {cards.length} carte{cards.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <ol className="space-y-3">
        {cards.map((card, idx) => {
          const len = card.length;
          const ok = card.trim().length >= CARD_MIN && len <= CARD_MAX;
          return (
            <li
              key={idx}
              className="relative rounded-2xl bg-white border border-line p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-700">
                  <span
                    className="inline-flex w-5 h-5 rounded-full bg-violet-100 items-center justify-center text-[10px] font-extrabold"
                    aria-hidden
                  >
                    {idx + 1}
                  </span>
                  Carte {idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveCard(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Monter cette carte"
                    className="inline-flex w-7 h-7 items-center justify-center rounded-full text-night-dim hover:bg-bg-soft disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowUp className="w-3.5 h-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCard(idx, 1)}
                    disabled={idx === cards.length - 1}
                    aria-label="Descendre cette carte"
                    className="inline-flex w-7 h-7 items-center justify-center rounded-full text-night-dim hover:bg-bg-soft disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowDown className="w-3.5 h-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCard(idx)}
                    disabled={cards.length <= MIN_CARDS}
                    aria-label="Supprimer cette carte"
                    className="inline-flex w-7 h-7 items-center justify-center rounded-full text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </div>
              </div>
              <textarea
                value={card}
                onChange={(e) => updateCard(idx, e.target.value)}
                maxLength={CARD_MAX}
                placeholder={
                  idx === 0
                    ? "Le hook — capture l'attention en une phrase."
                    : `Carte ${idx + 1} — développe ton idée…`
                }
                rows={3}
                className="w-full min-h-[80px] bg-transparent text-[14px] leading-relaxed text-night placeholder:text-night-dim/50 outline-none resize-none"
              />
              <p
                className={cn(
                  "mt-1 text-[10px] font-extrabold uppercase tracking-wider",
                  len === 0
                    ? "text-night-dim/40"
                    : ok
                      ? "text-emerald-700"
                      : "text-rose-700",
                )}
                aria-live="polite"
              >
                {len}/{CARD_MAX}
              </p>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={addCard}
        disabled={cards.length >= MAX_CARDS}
        className={cn(
          "inline-flex items-center gap-2 w-full h-12 rounded-2xl border-2 border-dashed text-[13px] font-extrabold transition-colors justify-center",
          cards.length >= MAX_CARDS
            ? "border-line text-night-dim cursor-not-allowed"
            : "border-violet-300 text-violet-700 hover:bg-violet-50",
        )}
      >
        <Plus className="w-3.5 h-3.5" aria-hidden />
        Ajouter une carte
        <span className="text-[10px] text-night-dim">
          ({cards.length}/{MAX_CARDS})
        </span>
      </button>

      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-night-dim mb-2">
          Audience
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {VISIBILITY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = visibility === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisibility(opt.value)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-2 px-3 h-11 rounded-2xl border text-[12.5px] font-extrabold transition-colors",
                  active
                    ? "border-violet-500 bg-violet-50 text-violet-700"
                    : "border-line bg-white text-night hover:border-night-dim/30",
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    active ? "text-violet-700" : "text-night-dim",
                  )}
                  aria-hidden
                />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-0 inset-x-0 -mx-4 sm:-mx-7 px-4 sm:px-7 py-3 bg-white/95 backdrop-blur-md border-t border-line flex items-center justify-between gap-3">
        <p className="text-[11px] text-night-dim">
          <Layers className="inline-block w-3 h-3 mr-1 text-violet-700" aria-hidden />
          {cards.length} carte{cards.length > 1 ? "s" : ""} ·
          {" "}
          {cards.reduce((s, c) => s + c.length, 0)} chars total
        </p>
        <button
          type="submit"
          disabled={!submitOk}
          className={cn(
            "inline-flex items-center gap-2 h-10 px-5 rounded-full text-[13px] font-extrabold transition-colors",
            submitOk
              ? "bg-night text-cream hover:bg-night-soft"
              : "bg-bg-soft text-night-dim cursor-not-allowed",
          )}
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Send className="w-3.5 h-3.5" aria-hidden />
          )}
          Publier le thread
        </button>
      </div>
    </form>
  );
}
