"use client";

import { LogOut, UserPlus } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { runAction } from "@/lib/utils/clientAction";
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
            await runAction(() => leaveCircle(circleId), {
              successMessage: "Tu as quitté le cercle.",
              errorMessage: "Action impossible.",
            });
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
          await runAction(() => joinCircle(circleId), {
            successMessage: "Bienvenue dans le cercle !",
            errorMessage: "Action impossible.",
          });
        })
      }
    >
      {!pending ? <UserPlus className="w-4 h-4" aria-hidden /> : null}
      Rejoindre
    </Button>
  );
}
