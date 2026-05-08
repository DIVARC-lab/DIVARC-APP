"use client";

import { LogOut, UserPlus } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { joinCircle, leaveCircle } from "../actions";

type CircleMembershipButtonProps = {
  circleId: string;
  isMember: boolean;
  isOwner: boolean;
};

export function CircleMembershipButton({
  circleId,
  isMember,
  isOwner,
}: CircleMembershipButtonProps) {
  const [pending, startTransition] = useTransition();

  if (isOwner) {
    return (
      <Button variant="secondary" disabled className="!bg-white/10 !text-current">
        Tu es admin
      </Button>
    );
  }

  if (isMember) {
    return (
      <Button
        variant="secondary"
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await leaveCircle(circleId);
            if (!result.ok) {
              toast.error(result.error ?? "Action impossible.");
            } else {
              toast.success("Tu as quitté le cercle.");
            }
          })
        }
      >
        {!pending ? <LogOut className="w-4 h-4" aria-hidden /> : null}
        Quitter
      </Button>
    );
  }

  return (
    <Button
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await joinCircle(circleId);
          if (!result.ok) {
            toast.error(result.error ?? "Action impossible.");
          } else {
            toast.success("Bienvenue dans le cercle !");
          }
        })
      }
    >
      {!pending ? <UserPlus className="w-4 h-4" aria-hidden /> : null}
      Rejoindre
    </Button>
  );
}
