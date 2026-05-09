import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { createClient } from "@/lib/supabase/server";
import { StoryComposer } from "./StoryComposer";

export const metadata = {
  title: "Nouvelle story",
};

export default async function NewStoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="bg-bg min-h-screen pb-16">
      <div className="mx-auto w-full max-w-2xl">
        <header className="relative overflow-hidden bg-gradient-to-b from-cream to-bg px-5 sm:px-8 pt-8 sm:pt-10 pb-7">
          <div
            aria-hidden
            className="absolute -right-12 -top-14 opacity-45 pointer-events-none"
          >
            <ArcDeco size={220} tone="gold" opacity={1} stroke={1.25} />
          </div>
          <div className="relative">
            <Link
              href="/feed"
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
            >
              <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
              Retour au feed
            </Link>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              · Nouvelle story
            </p>
            <h1 className="mt-2 font-display text-[36px] sm:text-[48px] font-normal leading-[1.05] tracking-[-0.02em] text-night text-balance">
              Partage{" "}
              <em className="italic bg-gradient-to-br from-gold to-[#B88A2A] bg-clip-text text-transparent">
                l&apos;instant
              </em>
              .
            </h1>
            <p className="mt-3 max-w-md text-[14px] text-night-soft leading-relaxed">
              Visible 24 h par tes amis. Photo, vidéo ou texte sur fond coloré.
            </p>
          </div>
        </header>

        <div className="px-5 sm:px-8 pt-6">
          <StoryComposer userId={user.id} />
        </div>
      </div>
    </div>
  );
}
