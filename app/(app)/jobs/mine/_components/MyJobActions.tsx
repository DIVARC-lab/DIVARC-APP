"use client";

import { CheckCircle2, RotateCcw, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import type { JobStatus } from "@/lib/database.types";
import { closeJob, deleteJob, reopenJob } from "../../actions";

type MyJobActionsProps = {
  jobId: string;
  status: JobStatus;
  applicationsCount: number;
};

export function MyJobActions({
  jobId,
  status,
  applicationsCount,
}: MyJobActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClose() {
    startTransition(async () => {
      const result = await closeJob(jobId);
      if (result.ok) {
        toast.success("Offre clôturée.");
        router.refresh();
      }
    });
  }

  function handleReopen() {
    startTransition(async () => {
      const result = await reopenJob(jobId);
      if (result.ok) {
        toast.success("Offre rouverte.");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!confirm("Supprimer définitivement cette offre ?")) return;
    startTransition(async () => {
      const result = await deleteJob(jobId);
      if (result.ok) {
        toast.success("Offre supprimée.");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="secondary" size="sm">
        <Link href={`/jobs/${jobId}/applicants`}>
          <Users className="w-4 h-4" aria-hidden />
          {applicationsCount > 0
            ? `Candidats · ${applicationsCount}`
            : "Aucun candidat"}
        </Link>
      </Button>
      {status === "active" ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleClose}
          loading={pending}
        >
          {!pending ? <CheckCircle2 className="w-4 h-4" aria-hidden /> : null}
          Clôturer
        </Button>
      ) : null}
      {status === "closed" ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleReopen}
          loading={pending}
        >
          {!pending ? <RotateCcw className="w-4 h-4" aria-hidden /> : null}
          Rouvrir
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={pending}
        className="text-red-600 hover:bg-red-50"
      >
        <Trash2 className="w-4 h-4" aria-hidden />
        Supprimer
      </Button>
    </div>
  );
}
