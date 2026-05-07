"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Échec de la déconnexion. Réessaie.");
        return;
      }
      toast.success("À bientôt sur DIVARC.");
      router.push("/");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      onClick={handleLogout}
      variant="ghost"
      size="sm"
      loading={pending}
      className="w-full justify-start text-muted hover:text-night"
    >
      <LogOut className="w-4 h-4" aria-hidden />
      Se déconnecter
    </Button>
  );
}
