import { Bot, Info } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { getCircleBySlug } from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import type { CircleAutomodRule } from "@/lib/database.types";
import { AutomodRulesPanel } from "./_components/AutomodRulesPanel";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "AutoMod — Cercle" };

export default async function CircleAutomodPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  /* Admin/owner only. */
  const isOwner = circle.owner_id === user.id;
  const isAdmin = circle.my_role === "admin";
  if (!isOwner && !isAdmin) {
    return (
      <div className="px-5 sm:px-8 py-10 text-center">
        <p className="text-[14px] text-night-dim">
          Seuls le fondateur et les admins peuvent gérer l&apos;AutoMod.
        </p>
        <Link
          href={`/circles/${slug}/moderation`}
          className="mt-3 inline-flex text-[12px] text-gold-deep font-bold hover:underline"
        >
          ← Retour à la modération
        </Link>
      </div>
    );
  }

  const { data: rules } = await supabase
    .from("circle_automod_rules")
    .select("*")
    .eq("circle_id", circle.id)
    .order("created_at", { ascending: false });

  return (
    <div className="px-5 sm:px-8 pb-10">
      <header className="mb-4">
        <Link
          href={`/circles/${slug}/moderation`}
          className="inline-flex items-center gap-1.5 text-[12px] text-night-dim hover:text-night mb-2"
        >
          ← Modération
        </Link>
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-gold-deep" aria-hidden />
          <KickerLabel>AutoMod — règles automatiques</KickerLabel>
        </div>
        <p className="mt-1 text-[12px] text-night-dim max-w-prose">
          Définis des règles automatiques qui s&apos;appliquent quand un
          post est créé ou signalé. Tu gardes le contrôle final.
        </p>
      </header>

      <AutomodRulesPanel
        circleId={circle.id}
        initialRules={(rules ?? []) as CircleAutomodRule[]}
      />

      <div className="mt-5 p-3 rounded-xl bg-bg-soft border border-line flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-night-dim mt-0.5 shrink-0" aria-hidden />
        <p className="text-[11px] text-night-dim leading-relaxed">
          <strong>Note V1</strong> — La configuration des règles est en
          place. L&apos;enforcement runtime (hook au moment de la création
          du post) sera branché dans le composer / les server actions au
          Chantier 5. Les règles ne sont pas encore actives.
        </p>
      </div>
    </div>
  );
}
