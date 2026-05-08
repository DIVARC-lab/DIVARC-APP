import { ArrowLeft, Eye, MapPin } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { listMyProfileViewers } from "@/lib/queries/profileViews";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils/relativeTime";

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
    <div className="px-6 sm:px-10 py-10 max-w-3xl mx-auto w-full space-y-8">
      <header>
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Profil
        </Link>
        <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
          Visites
        </span>
        <h1 className="mt-2 font-display text-4xl text-night">
          Qui a vu ton <em className="italic">profil</em>.
        </h1>
        <p className="mt-1 text-muted-strong">
          {viewers.length} visiteur{viewers.length > 1 ? "s" : ""} récents.
          Les utilisateurs en mode discret n&apos;apparaissent pas ici.
        </p>
      </header>

      {viewers.length === 0 ? (
        <div className="text-center py-20 px-6 rounded-3xl bg-white border border-line">
          <div
            aria-hidden
            className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5"
          >
            <Eye className="w-7 h-7 text-gold-deep" aria-hidden />
          </div>
          <h2 className="font-display text-2xl text-night">
            Pas encore de visiteur
          </h2>
          <p className="mt-2 text-muted max-w-sm mx-auto">
            Quand quelqu&apos;un visite ton profil public, tu le verras ici.
          </p>
        </div>
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
    </div>
  );
}
