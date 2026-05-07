"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { addComment, type CommentState } from "../actions";

const INITIAL: CommentState = { status: "idle" };

type CommentFormProps = {
  postId: string;
  authorAvatarUrl: string | null;
  authorName: string | null;
};

export function CommentForm({
  postId,
  authorAvatarUrl,
  authorName,
}: CommentFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const boundAction = addComment.bind(null, postId);
  const [state, formAction, pending] = useActionState<CommentState, FormData>(
    boundAction,
    INITIAL,
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      router.refresh();
    }
    if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  function autosize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex items-start gap-3"
    >
      <Avatar src={authorAvatarUrl} fullName={authorName} size="sm" />
      <div className="flex-1 min-w-0 space-y-2">
        <textarea
          ref={textareaRef}
          name="body"
          rows={1}
          onChange={autosize}
          onKeyDown={handleKeyDown}
          placeholder="Écris un commentaire..."
          maxLength={2000}
          className="w-full resize-none rounded-2xl border border-line bg-bg px-4 py-2.5 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted">⌘ + Entrée pour publier</p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-night text-cream text-xs font-semibold hover:bg-night-soft transition disabled:opacity-60"
          >
            {pending ? (
              <span className="w-3 h-3 border-2 border-cream border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3 h-3" aria-hidden />
            )}
            Publier
          </button>
        </div>
      </div>
    </form>
  );
}
