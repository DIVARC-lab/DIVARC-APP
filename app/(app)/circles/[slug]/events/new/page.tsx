import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { getCircleBySlug } from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import { CircleEventCreateForm } from "./CircleEventCreateForm";

export const metadata = {
  title: "Nouvel événement",
};

type Params = Promise<{ slug: string }>;

export default async function NewCircleEventPage({
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
  if (!circle.is_member) {
    redirect(`/circles/${slug}`);
  }

  return (
    <div className="px-6 sm:px-10 py-10 max-w-2xl mx-auto w-full">
      <header className="mb-8">
        <Link
          href={`/circles/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-4"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {circle.name}
        </Link>
        <KickerLabel>Nouvel événement</KickerLabel>
        <DisplayHeading size="lg" className="mt-2">
          Réunis le <em className="italic text-gold-deep">cercle</em>.
        </DisplayHeading>
        <p className="mt-2 text-muted-strong">
          Apéro, atelier, marche, soirée — tout ce qui rassemble. Visible
          uniquement par les membres.
        </p>
      </header>

      <CircleEventCreateForm circleId={circle.id} circleSlug={slug} />
    </div>
  );
}
