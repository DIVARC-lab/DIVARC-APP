import { X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { createClient } from "@/lib/supabase/server";
import { CreateOptions } from "./CreateOptions";

export const metadata = {
  title: "Créer",
};

/* /create — hub bottom sheet style. Reste comme route bookmarkable
 * (deep link), mais l'expérience interne dispatch directement vers le
 * ContentCreatorModal global au lieu de naviguer vers d'autres routes.
 *
 * Logique migrée dans CreateOptions (client component) qui consume
 * useCreator(). */
export default async function CreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-[calc(100dvh-112px-env(safe-area-inset-bottom,0px))] lg:min-h-[calc(100dvh-56px)] flex flex-col">
      <div className="flex-1" aria-hidden />
      <section className="relative bg-bg rounded-t-3xl shadow-[0_-30px_80px_-20px_rgba(10,31,68,0.18)] px-5 pb-10 pt-3 sm:max-w-lg sm:mx-auto sm:rounded-3xl sm:my-10 sm:shadow-[0_24px_60px_-24px_rgba(10,31,68,0.25)] sm:border sm:border-line">
        <div
          aria-hidden
          className="w-10 h-1 bg-line rounded-full mx-auto mb-3"
        />

        <header className="flex items-start justify-between gap-3 mb-5 px-1">
          <div className="min-w-0">
            <KickerLabel>· Que veux-tu créer ?</KickerLabel>
            <DisplayHeading
              size="lg"
              className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
            >
              Choisis un <em className="italic text-gold-deep">format</em>.
            </DisplayHeading>
          </div>
          <Link
            href="/feed"
            aria-label="Fermer"
            className="w-9 h-9 rounded-full bg-white border border-line flex items-center justify-center text-night-muted hover:text-night transition-colors shrink-0"
          >
            <X className="w-4 h-4" aria-hidden />
          </Link>
        </header>

        <CreateOptions />
      </section>
    </div>
  );
}
