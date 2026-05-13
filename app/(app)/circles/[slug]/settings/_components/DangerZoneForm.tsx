"use client";

import { AlertTriangle, Archive, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { archiveCircle } from "../../../actions";

type Props = {
  circleId: string;
  circleName: string;
};

export function DangerZoneForm({ circleId, circleName }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const canArchive = confirm.trim() === circleName;

  function submitArchive() {
    if (!canArchive) return;
    startTransition(async () => {
      const result = await archiveCircle(circleId);
      if (!result.ok) {
        toast.error(result.error ?? "Archivage impossible.");
        return;
      }
      toast.success("Cercle archivé.");
      router.push("/circles");
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
        <AlertTriangle
          className="w-4 h-4 mt-0.5 text-red-700 shrink-0"
          aria-hidden
        />
        <div>
          <p className="text-[12.5px] font-bold text-red-700">
            Archiver le cercle
          </p>
          <p className="mt-1 text-[11.5px] text-red-700/80 leading-snug">
            Le cercle ne sera plus visible dans la discovery ni accessible
            aux membres. Les données sont conservées (réactivation possible
            via support).
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="confirm-archive"
          className="block text-[12px] font-bold text-night mb-1"
        >
          Pour confirmer, tape{" "}
          <code className="px-1 py-0.5 bg-bg-soft rounded text-[11px]">
            {circleName}
          </code>{" "}
          ci-dessous
        </label>
        <input
          id="confirm-archive"
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full h-10 rounded-xl border border-line bg-white px-3 text-[13px] focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submitArchive}
          disabled={!canArchive || pending}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-red-600 text-white text-[12px] font-extrabold hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Archive className="w-3.5 h-3.5" aria-hidden />
          )}
          Archiver définitivement
        </button>
      </div>
    </div>
  );
}
