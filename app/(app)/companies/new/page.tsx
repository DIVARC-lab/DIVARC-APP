import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "../_components/CompanyForm";

export const metadata = {
  title: "Créer une page entreprise",
};

export default async function NewCompanyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="px-6 sm:px-10 py-10 max-w-3xl mx-auto w-full space-y-8">
      <header>
        <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
          Page entreprise
        </span>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
          Donne une <em className="italic">vitrine</em> à ta marque.
        </h1>
        <p className="mt-2 text-muted-strong">
          Une page publique avec ton logo, ta mission, tes offres. Les talents
          peuvent te suivre et recevoir tes nouvelles annonces.
        </p>
      </header>

      <article className="rounded-3xl bg-white border border-line shadow-soft p-6 sm:p-8">
        <CompanyForm />
      </article>
    </div>
  );
}
