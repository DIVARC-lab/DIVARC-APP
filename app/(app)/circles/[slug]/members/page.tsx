import { Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { getCircleBySlug, listCircleMembers } from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;

export const metadata = {
  title: "Membres",
};

/* Onglet "Membres" — placeholder V1 (reprend la liste existante).
 * Chantier 3.7 : équipe + actifs + tous + recherche + actions admin. */
export default async function CircleMembersTab({
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

  const members = await listCircleMembers(circle.id, 48);

  return (
    <section className="px-5 sm:px-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gold-deep" aria-hidden />
          <KickerLabel>
            {circle.members_count.toLocaleString("fr-FR")} membre
            {circle.members_count > 1 ? "s" : ""}
          </KickerLabel>
        </div>
        {circle.members_count > members.length ? (
          <span className="text-[11px] text-night-dim">
            {members.length} affichés
          </span>
        ) : null}
      </div>

      {members.length === 0 ? (
        <p className="text-[13px] text-night-dim">
          Personne pour l&apos;instant.
        </p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-2">
          {members.map((m) => {
            const profile = m.profile;
            const name =
              profile?.full_name ?? profile?.username ?? "Utilisateur";
            return (
              <li key={m.user_id}>
                <Link
                  href={profile?.username ? `/u/${profile.username}` : "#"}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-line hover:border-gold/40 transition-colors"
                >
                  <Avatar
                    src={profile?.avatar_url ?? null}
                    fullName={name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-night truncate">
                      {name}
                    </p>
                    {profile?.username ? (
                      <p className="text-[11px] text-night-dim truncate">
                        @{profile.username}
                      </p>
                    ) : null}
                  </div>
                  {m.role !== "member" ? (
                    <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-gold-deep">
                      {m.role === "owner"
                        ? "Fondateur"
                        : m.role === "admin"
                          ? "Admin"
                          : m.role === "moderator" || m.role === "mod"
                            ? "Mod"
                            : m.role}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
