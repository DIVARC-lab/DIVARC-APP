/* Page recherche globale dans tous les messages. */

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SearchMessagesClient } from "./SearchMessagesClient";

export const metadata = { title: "Recherche messages — DIVARC" };

export default async function SearchMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/messages/search");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  return (
    <div className="min-h-[100dvh] bg-bg-soft pb-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6">
        <header className="flex items-center gap-3 mb-5">
          <Link
            href="/messages"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-line hover:bg-bg-soft transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
          </Link>
          <div className="flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              · MESSAGES
            </p>
            <h1 className="font-display italic text-[24px] sm:text-[28px] text-night leading-tight">
              Rechercher dans tes <em className="text-gold-deep">messages</em>
            </h1>
          </div>
        </header>

        <SearchMessagesClient initialQuery={q} />
      </div>
    </div>
  );
}
