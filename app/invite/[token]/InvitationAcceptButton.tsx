"use client";

import { ArrowRight, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { acceptCircleInvitation } from "@/app/(app)/circles/actions";

type InvitationAcceptButtonProps = {
  token: string;
};

export function InvitationAcceptButton({ token }: InvitationAcceptButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleAccept = () => {
    startTransition(async () => {
      const result = await acceptCircleInvitation(token);
      if (!result.ok) {
        toast.error(result.error ?? "Action impossible.");
        return;
      }
      toast.success("Bienvenue !");
      if (result.slug) {
        router.push(`/circles/${result.slug}`);
      } else {
        router.push("/circles");
      }
    });
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <Button onClick={handleAccept} loading={pending} size="lg">
        {!pending ? <UserPlus className="w-4 h-4" aria-hidden /> : null}
        Rejoindre le cercle
        <ArrowRight className="w-4 h-4" aria-hidden />
      </Button>
    </div>
  );
}
