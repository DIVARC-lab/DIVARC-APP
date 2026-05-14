import { ArrowLeft, Eye, MapPin } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { listMyProfileViewers } from "@/lib/queries/profileViews";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils/relativeTime";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

export const metadata = {
  title: "Qui a vu mon profil",
};

export default async function ProfileViewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const viewers = await listMyProfileViewers(user.id, 100);

  return (
    <Container maxWidth="default" paddingX="page" paddingY="3xl">
      <Stack gap="3xl">
      <header>
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Profil
        </Link>
        <KickerLabel>Visites</KickerLabel>
        <h1 className="mt-2 font-display text-4xl text-night">
          Qui a vu ton <em className="italic text-gold-deep">profil</em>.
        </h1>
        <p className="mt-1 text-muted-strong">
          {viewers.length} visiteur{viewers.length > 1 ? "s" : ""} récents.
          Les utilisateurs en mode discret n&apos;apparaissent pas ici.
        </p>
      </header>

      {viewers.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="Pas encore de visiteur"
          body="Quand quelqu'un visite ton profil public, tu le verras ici."
          tone="default"
          size="lg"
        />
      ) : (
        <ul className="space-y-2">
          {viewers.map((view) => {
            const profile = view.viewer;
            if (!profile) {
              return (
                <li
                  key={view.viewer_id}
                  className="p-4 rounded-2xl bg-white border border-line text-sm text-muted italic"
                >
                  Visiteur inconnu · {formatRelative(view.last_viewed_at)}
                </li>
              );
            }
            const displayName = profile.full_name ?? profile.username ?? "Utilisateur";
            return (
              <li key={view.viewer_id}>
                <Link
                  href={profile.username ? `/u/${profile.username}` : "#"}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-line hover:border-night/30 transition-colors"
                >
                  <Avatar
                    src={profile.avatar_url}
                    fullName={displayName}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-night truncate">
                      {displayName}
                    </p>
                    {profile.headline ? (
                      <p className="text-sm text-night-muted truncate">
                        {profile.headline}
                      </p>
                    ) : profile.username ? (
                      <p className="text-sm text-muted truncate">
                        @{profile.username}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-muted flex items-center gap-2">
                      <span>{formatRelative(view.last_viewed_at)}</span>
                      {view.view_count > 1 ? (
                        <span className="text-gold-deep">
                          · {view.view_count} visites
                        </span>
                      ) : null}
                      {profile.location ? (
                        <span className="inline-flex items-center gap-0.5">
                          · <MapPin className="w-3 h-3" aria-hidden />
                          {profile.location}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      </Stack>
    </Container>
  );
}
