import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LiveSessionForm } from "./LiveSessionForm";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

export const metadata = {
  title: "Nouveau live",
};

export default async function NewLivePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <Container maxWidth="text" paddingX="page" paddingY="3xl">
      <Stack gap="3xl">
        <Link
          href="/jobs/live"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Lives
        </Link>

        <header>
          <KickerLabel>Nouveau live</KickerLabel>
          <h1 className="mt-2 font-display text-4xl text-night text-balance">
            Programme un <em className="italic text-gold-deep">live recrutement</em>.
          </h1>
          <p className="mt-2 text-muted-strong">
            Q&amp;A ouvert à tous, chat temps réel sans caméra.
          </p>
        </header>

        <article className="rounded-3xl bg-white border border-line shadow-soft p-6 sm:p-8">
          <LiveSessionForm />
        </article>
      </Stack>
    </Container>
  );
}
