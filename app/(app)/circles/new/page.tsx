import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { createClient } from "@/lib/supabase/server";
import { CircleCreateForm } from "./CircleCreateForm";

export const metadata = {
  title: "Nouveau cercle",
};

export default async function NewCirclePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="px-6 sm:px-10 py-10 max-w-2xl mx-auto w-full">
      <header className="mb-8">
        <Link
          href="/circles"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-4"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour aux cercles
        </Link>
        <KickerLabel>Nouveau cercle</KickerLabel>
        <DisplayHeading size="lg" className="mt-2">
          Crée ton <em className="italic text-gold-deep">espace</em>.
        </DisplayHeading>
        <p className="mt-2 text-muted-strong">
          Une communauté autour d&apos;un quartier, d&apos;un métier, d&apos;une passion. Tu en
          deviens automatiquement l&apos;admin.
        </p>
      </header>

      <CircleCreateForm />
    </div>
  );
}
