import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries/profile";
import { CreateListingWizard } from "./CreateListingWizard";

export const metadata = {
  title: "Nouvelle annonce",
};

type SearchParamsP = Promise<{ circle?: string }>;

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: SearchParamsP;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const sp = await searchParams;

  /* Chantier 3.3 — si ?circle=<slug>, on récupère le cercle pour pré-remplir
   * le wizard (et restreindre aux membres). */
  let circleContext: { id: string; name: string; slug: string } | null = null;
  if (sp.circle) {
    const { data: c } = await supabase
      .from("circles")
      .select("id, name, slug")
      .eq("slug", sp.circle)
      .maybeSingle();
    if (c) {
      const { data: m } = await supabase
        .from("circle_members")
        .select("user_id")
        .eq("circle_id", c.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (m) circleContext = c;
    }
  }

  return (
    <div className="bg-bg-soft min-h-[calc(100dvh-56px)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <header className="mb-6">
          <Link
            href={
              circleContext
                ? `/circles/${circleContext.slug}/market`
                : "/marketplace"
            }
            className="inline-flex items-center gap-2 text-[12px] text-night-dim hover:text-night mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
            {circleContext
              ? `Retour à la marketplace de ${circleContext.name}`
              : "Retour à la marketplace"}
          </Link>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
            · Nouvelle annonce
            {circleContext ? ` · pour ${circleContext.name}` : ""}
          </span>
          <h1 className="mt-1 font-display text-[28px] sm:text-[42px] text-night text-balance leading-[1.05]">
            Vends en{" "}
            <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
              quelques étapes
            </em>
            .
          </h1>
          {circleContext ? (
            <p className="mt-2 text-[12px] text-night-dim">
              Cette annonce sera visible dans la marketplace du cercle{" "}
              <strong className="text-night">{circleContext.name}</strong>.
            </p>
          ) : null}
        </header>

        <CreateListingWizard
          userId={user.id}
          defaultLocation={profile?.location ?? null}
          defaultCurrency={profile?.currency ?? "EUR"}
          circleId={circleContext?.id ?? null}
        />
      </div>
    </div>
  );
}
