import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCircleBySlug } from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import { DangerZoneForm } from "./_components/DangerZoneForm";
import { EditAccessForm } from "./_components/EditAccessForm";
import { EditIdentityForm } from "./_components/EditIdentityForm";
import { EditModulesForm } from "./_components/EditModulesForm";
import { SettingsSection } from "./_components/SettingsSection";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "Paramètres du cercle" };

/* Dashboard admin V1 — 4 sections principales :
 *   1. Identité (nom, tagline, emoji, color)
 *   2. Modules (10 toggles)
 *   3. Accès (type → derive join_policy + visibility)
 *   4. Zone dangereuse (archive uniquement pour owner)
 *
 * Règles, flairs, équipe et modération sont dans des sous-pages dédiées
 * (Chantier 4.3+). */
export default async function CircleSettingsPage({
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

  /* Permission stricte : owner ou admin uniquement. */
  const isOwner = circle.owner_id === user.id;
  const isAdmin = circle.my_role === "admin";
  if (!isOwner && !isAdmin) {
    return (
      <div className="px-5 sm:px-8 py-10 text-center">
        <p className="text-[14px] text-night-dim">
          Seuls le fondateur et les admins peuvent accéder aux paramètres.
        </p>
        <Link
          href={`/circles/${slug}`}
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-gold-deep font-bold hover:underline"
        >
          ← Retour au cercle
        </Link>
      </div>
    );
  }

  return (
    <div className="px-5 sm:px-8 pb-10">
      <header className="mb-5 flex items-center gap-2">
        <SettingsIcon className="w-4 h-4 text-gold-deep" aria-hidden />
        <h1 className="text-[15px] sm:text-[17px] font-bold text-night">
          Paramètres du cercle
        </h1>
      </header>

      <div className="space-y-4">
        <SettingsSection
          title="Identité"
          description="Nom, tagline et apparence du cercle."
        >
          <EditIdentityForm
            circleId={circle.id}
            initial={{
              name: circle.name,
              tagline: circle.tagline,
              emoji: circle.emoji,
              color_accent: circle.color_accent,
            }}
          />
        </SettingsSection>

        <SettingsSection
          title="Modules"
          description="Active ou désactive les fonctionnalités disponibles aux membres."
        >
          <EditModulesForm
            circleId={circle.id}
            initial={circle.modules}
          />
        </SettingsSection>

        <SettingsSection
          title="Accès & visibilité"
          description="Qui peut voir et rejoindre ce cercle."
        >
          <EditAccessForm
            circleId={circle.id}
            initial={{
              type: circle.type,
              join_policy: circle.join_policy,
              visibility: circle.visibility,
            }}
          />
        </SettingsSection>

        {/* Sous-pages dédiées (placeholder + lien) */}
        <SettingsSection
          title="Règles, flairs & équipe"
          description="Gestion détaillée arrive bientôt (Chantier 4.3)."
        >
          <ul className="space-y-1.5 text-[13px] text-night-dim">
            <li>
              · Règles du cercle :{" "}
              <Link
                href={`/circles/${slug}/about`}
                className="text-gold-deep font-bold hover:underline"
              >
                Voir l&apos;onglet À propos
              </Link>
            </li>
            <li>
              · Membres et rôles :{" "}
              <Link
                href={`/circles/${slug}/members`}
                className="text-gold-deep font-bold hover:underline"
              >
                Voir l&apos;onglet Membres
              </Link>
            </li>
            <li>
              · File de modération : Chantier 4.3
            </li>
          </ul>
        </SettingsSection>

        {isOwner ? (
          <SettingsSection
            title="Zone dangereuse"
            description="Actions irréversibles réservées au fondateur."
            tone="danger"
          >
            <DangerZoneForm circleId={circle.id} circleName={circle.name} />
          </SettingsSection>
        ) : null}
      </div>
    </div>
  );
}
