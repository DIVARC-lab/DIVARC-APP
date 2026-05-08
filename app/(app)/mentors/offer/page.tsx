import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyMentorOffer } from "@/lib/queries/mentors";
import { createClient } from "@/lib/supabase/server";
import { MentorOfferForm } from "../_components/MentorOfferForm";

export const metadata = {
  title: "Offre de mentorat",
};

export default async function MentorOfferPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const offer = await getMyMentorOffer(user.id);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-3xl mx-auto w-full space-y-8">
      <header>
        <Link
          href="/mentors"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Mentors
        </Link>
        <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
          {offer ? "Modifier" : "Nouvelle offre"}
        </span>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
          Devenir <em className="italic">mentor</em>.
        </h1>
        <p className="mt-2 text-muted-strong">
          Partage ton expérience. Décide ton tarif (ou gratuit) et active la
          disponibilité quand tu veux.
        </p>
      </header>

      <article className="rounded-3xl bg-white border border-line shadow-soft p-6 sm:p-8">
        <MentorOfferForm offer={offer} />
      </article>
    </div>
  );
}
