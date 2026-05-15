import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateHubForm } from "../_components/CreateHubForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Créer un hub",
};

export default async function NewHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/circles/hubs/new");

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-2xl mx-auto">
      <Link
        href="/circles/hubs"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
        Tous les hubs
      </Link>

      <header>
        <h1 className="font-display italic text-3xl text-night">
          Créer un hub
        </h1>
        <p className="text-[13px] text-night-muted mt-1 max-w-md">
          Un hub rassemble plusieurs cercles autour d&apos;une thématique
          commune. Tu peux par exemple créer « FrenchTech » qui agrège
          les cercles Devs FR, Designers FR, Founders FR, etc.
        </p>
      </header>

      <CreateHubForm />
    </div>
  );
}
