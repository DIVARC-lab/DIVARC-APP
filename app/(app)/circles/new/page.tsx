import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateCircleWizard } from "./CreateCircleWizard";

export const metadata = {
  title: "Créer un cercle",
};

export default async function NewCirclePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="bg-bg-soft min-h-[calc(100dvh-56px)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <header className="mb-6">
          <Link
            href="/circles"
            className="inline-flex items-center gap-2 text-[12px] text-night-dim hover:text-night mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
            Retour aux cercles
          </Link>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
            · Nouveau cercle
          </span>
          <h1 className="mt-1 font-display text-[28px] sm:text-[42px] text-night text-balance leading-[1.05]">
            Crée{" "}
            <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
              ta tribu
            </em>{" "}
            en quelques étapes.
          </h1>
        </header>

        <CreateCircleWizard />
      </div>
    </div>
  );
}
