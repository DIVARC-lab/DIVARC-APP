"use client";

/* ArticleEditor — Chantier Feed v2.4.
 *
 * Éditeur dédié aux posts kind='article' :
 *  - Titre (obligatoire, 5..120 chars)
 *  - Sous-titre (optionnel, ≤200 chars)
 *  - Corps markdown (≥150 chars, ≤20 000 chars)
 *  - Audience (public / friends / private)
 *  - Submit -> createArticlePost server action
 *
 * Pas de WYSIWYG : on garde le markdown lisible/auditable.
 * Le reading_time_minutes est calculé côté DB par le trigger 0110.
 */
import { Eye, Globe, Loader2, Lock, Send, Sparkles, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import type { PostVisibility } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { createArticlePost, type PostV2FormState } from "../../actions";

const INITIAL: PostV2FormState = { status: "idle" };
const TITLE_MIN = 5;
const TITLE_MAX = 120;
const SUBTITLE_MAX = 200;
const BODY_MIN = 150;
const BODY_MAX = 20000;

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
  desc: string;
  icon: typeof Globe;
}> = [
  {
    value: "public",
    label: "Public",
    desc: "Visible par tout DIVARC.",
    icon: Globe,
  },
  {
    value: "friends",
    label: "Amis",
    desc: "Visible uniquement par tes amis.",
    icon: Users,
  },
  {
    value: "private",
    label: "Privé",
    desc: "Visible uniquement par toi.",
    icon: Lock,
  },
];

export function ArticleEditor({ authorId, authorProfile }: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState(createArticlePost, INITIAL);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [preview, setPreview] = useState(false);

  const readingTime = useMemo(() => {
    if (body.trim().length === 0) return 0;
    const words = body.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [body]);

  const titleOk = title.length >= TITLE_MIN && title.length <= TITLE_MAX;
  const bodyOk = body.length >= BODY_MIN && body.length <= BODY_MAX;
  const submitOk = titleOk && bodyOk && !pending;

  useEffect(() => {
    if (state.status === "success" && state.postId) {
      toast.success("Article publié");
      router.push(`/feed/${state.postId}`);
    } else if (state.status === "error") {
      toast.error(state.error ?? "Erreur lors de la publication");
    }
  }, [state, router]);

  function submit(formData: FormData) {
    formData.set("title", title.trim());
    formData.set("subtitle", subtitle.trim());
    formData.set("body", body);
    formData.set("visibility", visibility);
    formData.set("author_id", authorId);
    startTransition(() => formAction(formData));
  }

  return (
    <form action={submit} className="space-y-5">
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
          <p className="text-[11px] text-night-dim">
            {readingTime > 0
              ? `~${readingTime} min de lecture`
              : "Commence à écrire…"}
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="article-title"
          className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-night-dim mb-1.5"
        >
          Titre
        </label>
        <input
          id="article-title"
          name="title-display"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder="Une idée forte, en une phrase."
          required
          className="w-full bg-transparent text-[28px] sm:text-[36px] font-display tracking-[-0.015em] text-night placeholder:text-night-dim/50 leading-tight outline-none border-b border-line focus:border-gold-deep transition-colors pb-2"
        />
        <p
          className={cn(
            "mt-1 text-[10px] font-extrabold uppercase tracking-wider",
            title.length === 0
              ? "text-night-dim/40"
              : titleOk
                ? "text-emerald-700"
                : "text-rose-700",
          )}
          aria-live="polite"
        >
          {title.length}/{TITLE_MAX} · min {TITLE_MIN}
        </p>
      </div>

      <div>
        <label
          htmlFor="article-subtitle"
          className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-night-dim mb-1.5"
        >
          Sous-titre <span className="text-night-dim/60">(optionnel)</span>
        </label>
        <input
          id="article-subtitle"
          name="subtitle-display"
          type="text"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          maxLength={SUBTITLE_MAX}
          placeholder="Un teaser, un angle, un contexte."
          className="w-full bg-transparent text-[15px] sm:text-[16px] italic text-night-soft placeholder:text-night-dim/50 outline-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="article-body"
            className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-night-dim"
          >
            Corps (markdown)
          </label>
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-extrabold text-night-dim hover:text-night hover:bg-bg-soft"
          >
            <Eye className="w-3 h-3" aria-hidden />
            {preview ? "Édition" : "Aperçu"}
          </button>
        </div>
        {preview ? (
          <div
            className="min-h-[260px] rounded-2xl bg-white border border-line p-4 text-[15px] leading-relaxed text-night whitespace-pre-wrap break-words"
            aria-live="polite"
          >
            {body || (
              <span className="text-night-dim/60 italic">
                L&apos;aperçu apparaîtra ici.
              </span>
            )}
          </div>
        ) : (
          <textarea
            id="article-body"
            name="body-display"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={BODY_MAX}
            placeholder={`# Un titre intermédiaire
Développe ton idée. Le markdown est supporté : **gras**, *italique*, listes, citations.

> Une citation pour appuyer.
- Un point
- Un autre

Bonne écriture.`}
            required
            rows={16}
            className="w-full min-h-[300px] rounded-2xl bg-white border border-line px-4 py-3 text-[15px] leading-relaxed text-night placeholder:text-night-dim/50 outline-none focus:border-gold-deep transition-colors font-sans"
          />
        )}
        <p
          className={cn(
            "mt-1 text-[10px] font-extrabold uppercase tracking-wider",
            body.length === 0
              ? "text-night-dim/40"
              : bodyOk
                ? "text-emerald-700"
                : "text-rose-700",
          )}
          aria-live="polite"
        >
          {body.length}/{BODY_MAX} · min {BODY_MIN}
        </p>
      </div>

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
                  "flex items-start gap-2 p-3 rounded-2xl border text-left transition-colors",
                  active
                    ? "border-gold-deep bg-gold/10"
                    : "border-line bg-white hover:border-night-dim/30",
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 mt-0.5 shrink-0",
                    active ? "text-gold-deep" : "text-night-dim",
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-extrabold text-night">
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-night-soft leading-snug">
                    {opt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-0 inset-x-0 -mx-4 sm:-mx-7 px-4 sm:px-7 py-3 bg-white/95 backdrop-blur-md border-t border-line flex items-center justify-between gap-3">
        <p className="text-[11px] text-night-dim">
          <Sparkles className="inline-block w-3 h-3 mr-1 text-gold-deep" aria-hidden />
          Format article — temps de lecture estimé : {readingTime} min
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
          Publier
        </button>
      </div>
    </form>
  );
}
