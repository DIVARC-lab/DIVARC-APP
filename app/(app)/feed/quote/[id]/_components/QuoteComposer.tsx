"use client";

/* QuoteComposer — Chantier Feed 4.4.
 *
 * Mini-composer dédié à la citation d'un autre post. Crée un post standard
 * avec quoted_post_id renseigné. Audience publique par défaut.
 */
import { Globe, Loader2, Lock, Send, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import type { PostVisibility } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { createQuotePost, type PostV2FormState } from "../../../new/actions";

const INITIAL: PostV2FormState = { status: "idle" };
const MAX = 500;

type Props = {
  authorId: string;
  authorProfile: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  quotedPostId: string;
};

const VISIBILITY: Array<{
  value: PostVisibility;
  label: string;
  icon: typeof Globe;
}> = [
  { value: "public", label: "Public", icon: Globe },
  { value: "friends", label: "Amis", icon: Users },
  { value: "private", label: "Privé", icon: Lock },
];

export function QuoteComposer({
  authorId,
  authorProfile,
  quotedPostId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<PostV2FormState>(INITIAL);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("public");

  useEffect(() => {
    if (state.status === "success" && state.postId) {
      toast.success("Citation publiée");
      router.push(`/feed/${state.postId}`);
    } else if (state.status === "error") {
      toast.error(state.error ?? "Erreur lors de la publication");
    }
  }, [state, router]);

  function submit() {
    if (body.trim().length === 0) return;
    const fd = new FormData();
    fd.set("body", body.trim());
    fd.set("visibility", visibility);
    fd.set("quoted_post_id", quotedPostId);
    fd.set("author_id", authorId);
    startTransition(async () => {
      const result = await createQuotePost(state, fd);
      setState(result);
    });
  }

  const ok = body.trim().length > 0 && body.length <= MAX && !pending;
  const name =
    authorProfile?.full_name ?? authorProfile?.username ?? "Toi";

  return (
    <div className="rounded-2xl bg-white border border-line p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar
          src={authorProfile?.avatar_url ?? null}
          fullName={name}
          size="sm"
        />
        <p className="text-[13px] font-bold text-night">{name}</p>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={MAX}
        placeholder="Ajoute ton commentaire — qu'est-ce qui t'a frappé dans ce post ?"
        rows={4}
        className="w-full min-h-[100px] bg-bg-soft rounded-xl px-3 py-2 text-[14px] leading-relaxed text-night placeholder:text-night-dim/50 outline-none focus:bg-white focus:border focus:border-gold-deep transition-colors resize-none"
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {VISIBILITY.map((v) => {
            const Icon = v.icon;
            const active = visibility === v.value;
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => setVisibility(v.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1 h-7 px-2 rounded-full text-[11px] font-bold transition-colors",
                  active
                    ? "bg-night/8 text-night"
                    : "text-night-dim hover:bg-bg-soft",
                )}
              >
                <Icon className="w-3 h-3" aria-hidden />
                {v.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[10px] font-extrabold uppercase tracking-wider",
              body.length === 0
                ? "text-night-dim/40"
                : body.length > MAX
                  ? "text-rose-700"
                  : "text-emerald-700",
            )}
          >
            {body.length}/{MAX}
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={!ok}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[12px] font-extrabold transition-colors",
              ok
                ? "bg-night text-cream hover:bg-night-soft"
                : "bg-bg-soft text-night-dim cursor-not-allowed",
            )}
          >
            {pending ? (
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
            ) : (
              <Send className="w-3 h-3" aria-hidden />
            )}
            Publier la citation
          </button>
        </div>
      </div>
    </div>
  );
}
