import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
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
    <div className="px-6 sm:px-10 py-10 max-w-2xl mx-auto w-full">
      <header className="mb-8">
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-4"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour au feed
        </Link>
        <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
          Nouvelle story
        </span>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl text-night text-balance leading-[1.05]">
          Partage <em className="italic">l&apos;instant</em>.
        </h1>
        <p className="mt-2 text-muted-strong">
          Visible 24 h par tes amis. Photo ou texte sur fond coloré.
        </p>
      </header>

      <StoryComposer userId={user.id} />
    </div>
  );
}
