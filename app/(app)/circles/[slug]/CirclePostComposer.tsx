"use client";

import { Send } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { createCirclePost } from "../actions";

type CirclePostComposerProps = {
  circleId: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
};

export function CirclePostComposer({
  circleId,
  authorName,
  authorAvatarUrl,
}: CirclePostComposerProps) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (trimmed.length < 1) {
      toast.error("Écris quelque chose.");
      return;
    }

    const formData = new FormData();
    formData.set("circle_id", circleId);
    formData.set("body", trimmed);

    startTransition(async () => {
      const result = await createCirclePost(formData);
      if (!result.ok) {
        toast.error(result.error ?? "Publication impossible.");
        return;
      }
      setBody("");
      ref.current?.focus();
      toast.success("Posté dans le cercle.");
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white border border-line p-4 shadow-soft"
    >
      <div className="flex gap-3">
        <Avatar src={authorAvatarUrl} fullName={authorName} size="md" />
        <div className="flex-1 min-w-0">
          <textarea
            ref={ref}
            value={body}
            onChange={(event) => setBody(event.currentTarget.value)}
            placeholder="Partage avec le cercle…"
            maxLength={4000}
            rows={3}
            className="w-full resize-none border-0 focus:outline-none text-sm leading-relaxed bg-transparent placeholder:text-muted"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted">
              Visible uniquement par les membres du cercle.
            </span>
            <Button
              type="submit"
              size="sm"
              loading={pending}
              disabled={body.trim().length === 0}
            >
              {!pending ? <Send className="w-3.5 h-3.5" aria-hidden /> : null}
              Publier
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
