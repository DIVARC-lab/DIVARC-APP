"use client";

import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { markAllNotificationsRead } from "../actions";

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.ok) {
        toast.success("Toutes tes notifications sont marquées comme lues.");
        router.refresh();
      }
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handle}
      loading={pending}
      disabled={disabled}
    >
      {!pending ? <CheckCheck className="w-4 h-4" aria-hidden /> : null}
      Tout marquer lu
    </Button>
  );
}
