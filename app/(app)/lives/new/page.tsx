import { redirect } from "next/navigation";
import { ArrowLeft, Radio } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewLiveForm } from "./NewLiveForm";

export const metadata = {
  title: "Nouveau live — DIVARC",
  description: "Lance ton live audio ou vidéo sur DIVARC.",
};

export default async function NewLivePage({
  searchParams,
}: {
  searchParams: Promise<{ circle?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/lives/new");

  const sp = await searchParams;
  const presetCircleId =
    typeof sp.circle === "string" && sp.circle.match(/^[a-f0-9-]{36}$/i)
      ? sp.circle
      : null;

  /* Si circle_id en query string, charge le cercle pour pré-remplir +
     vérifier que l'user est bien membre actif (sécurité côté UI ; le
     server action revalide). */
  let presetCircle: { id: string; name: string; slug: string } | null = null;
  if (presetCircleId) {
    const { data } = await supabase
      .from("circles")
      .select("id, name, slug")
      .eq("id", presetCircleId)
      .maybeSingle();
    presetCircle =
      (data as { id: string; name: string; slug: string } | null) ?? null;
  }

  return (
    <div className="min-h-[100dvh] bg-bg-soft pb-24">
      <div className="mx-auto w-full max-w-2xl px-5 sm:px-8 py-6">
        <Link
          href={presetCircle ? `/circles/${presetCircle.slug}/live` : "/lives"}
          className="inline-flex items-center gap-1.5 text-[12px] text-night-dim hover:text-night mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
          Retour
        </Link>

        <header className="mb-6">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-rose-600">
            · NOUVEAU LIVE
          </p>
          <h1 className="mt-2 font-display text-[32px] sm:text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-night">
            Lance ton{" "}
            <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
              live
            </em>
            .
          </h1>
          <p className="mt-3 text-[14px] text-night-dim leading-relaxed">
            Audio ou vidéo. Public, ami·e·s, cercle ou abonnés. Tu décides.
          </p>
        </header>

        <NewLiveForm presetCircle={presetCircle} />
      </div>
    </div>
  );
}
