"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 text-sm font-semibold rounded-full border border-night/15 text-night hover:bg-night/5 transition"
    >
      Se déconnecter
    </button>
  );
}
