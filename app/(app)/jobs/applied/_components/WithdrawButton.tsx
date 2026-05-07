"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { withdrawApplication } from "../../actions";

type WithdrawButtonProps = {
  applicationId: string;
};

export function WithdrawButton({ applicationId }: WithdrawButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handle() {
    if (!confirm("Retirer ta candidature ?")) return;
    startTransition(async () => {
      const result = await withdrawApplication(applicationId);
      if (result.ok) {
        toast.success("Candidature retirée.");
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-night-muted hover:text-red-600 transition-colors disabled:opacity-60"
    >
      <X className="w-3.5 h-3.5" aria-hidden />
      Retirer
    </button>
  );
}
