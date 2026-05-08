"use client";

import { Bell, BellRing } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { followCompany, unfollowCompany } from "../actions";

type Props = {
  companyId: string;
  initialFollowing: boolean;
  initialCount: number;
};

export function FollowCompanyButton({
  companyId,
  initialFollowing,
  initialCount,
}: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (following) {
        const result = await unfollowCompany(companyId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setFollowing(false);
        setCount((c) => Math.max(c - 1, 0));
      } else {
        const result = await followCompany(companyId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setFollowing(true);
        setCount((c) => c + 1);
        toast.success("Tu seras notifié des nouvelles offres ✨");
      }
    });
  }

  return (
    <Button
      variant={following ? "secondary" : "primary"}
      size="md"
      onClick={toggle}
      loading={pending}
    >
      {following ? (
        <>
          <BellRing className="w-4 h-4" aria-hidden />
          Abonné · {count}
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" aria-hidden />
          Suivre · {count}
        </>
      )}
    </Button>
  );
}
