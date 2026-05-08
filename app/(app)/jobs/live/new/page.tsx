import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LiveSessionForm } from "./LiveSessionForm";

export const metadata = {
  title: "Nouveau live",
};

export default async function NewLivePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="px-6 sm:px-10 py-10 max-w-2xl mx-auto w-full space-y-8">
      <Link
        href="/jobs/live"
        className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Lives
      </Link>

      <header>
        <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
          Nouveau live
        </span>
        <h1 className="mt-2 font-display text-4xl text-night text-balance">
          Programme un <em className="italic">live recrutement</em>.
        </h1>
        <p className="mt-2 text-muted-strong">
          Q&amp;A ouvert à tous, chat temps réel sans caméra.
        </p>
      </header>

      <article className="rounded-3xl bg-white border border-line shadow-soft p-6 sm:p-8">
        <LiveSessionForm />
      </article>
    </div>
  );
}
