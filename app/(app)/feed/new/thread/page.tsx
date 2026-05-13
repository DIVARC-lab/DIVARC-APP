import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThreadEditor } from "./_components/ThreadEditor";

export const metadata = {
  title: "Nouveau thread — DIVARC",
  description:
    "Une série de posts liés pour développer une idée en cartes successives.",
};

export default async function NewThreadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-[100dvh] bg-bg-soft">
      <header className="sticky top-0 z-30 bg-white border-b border-line">
        <div className="flex items-center gap-3 h-12 px-4 sm:px-7 max-w-3xl mx-auto">
          <Link
            href="/feed"
            aria-label="Retour au feed"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-night-dim hover:text-night hover:bg-bg-soft"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
          </Link>
          <p className="text-[13px] font-extrabold text-night">
            Nouveau thread
          </p>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-violet-700 ml-auto">
            · Thread
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-7 py-6 pb-[max(calc(64px+env(safe-area-inset-bottom)),96px)]">
        <ThreadEditor authorId={user.id} authorProfile={profile} />
      </main>
    </div>
  );
}
