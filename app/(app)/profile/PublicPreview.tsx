import { Globe, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Profile } from "@/lib/database.types";

type PublicPreviewProps = {
  profile: Profile;
  email: string;
};

export function PublicPreview({ profile, email }: PublicPreviewProps) {
  const fullName = profile.full_name ?? "—";
  const showEmail = profile.show_email;
  const showLocation = profile.show_location && profile.location;

  return (
    <article className="relative p-7 rounded-3xl bg-white border border-line shadow-soft">
      <div className="flex items-center justify-between mb-5">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
          Aperçu public
        </span>
        <span className="text-[10px] font-semibold tracking-widest uppercase text-emerald-700 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          en direct
        </span>
      </div>

      <div className="relative h-20 -mx-7 -mt-2 mb-12 bg-gradient-to-br from-night via-night-soft to-night-muted overflow-hidden rounded-t-2xl grain">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gold/15 via-transparent to-transparent" />
      </div>

      <div className="absolute top-[110px] left-7">
        <div className="rounded-full ring-4 ring-white">
          <Avatar src={profile.avatar_url} fullName={fullName} size="lg" />
        </div>
      </div>

      <div className="pt-2">
        <h3 className="font-display text-2xl text-night">{fullName}</h3>
        {profile.username ? (
          <p className="text-sm text-muted">@{profile.username}</p>
        ) : null}

        {profile.bio ? (
          <p className="mt-4 text-sm text-night-muted leading-relaxed">
            {profile.bio}
          </p>
        ) : (
          <p className="mt-4 text-sm italic text-muted">
            Ajoute une bio pour te présenter.
          </p>
        )}

        <ul className="mt-5 space-y-2 text-xs">
          {showLocation ? (
            <li className="flex items-center gap-2 text-night">
              <MapPin className="w-3.5 h-3.5 text-muted" aria-hidden />
              {profile.location}
            </li>
          ) : null}
          {showEmail ? (
            <li className="flex items-center gap-2 text-night">
              <Globe className="w-3.5 h-3.5 text-muted" aria-hidden />
              <span className="truncate" title={email}>
                {email}
              </span>
            </li>
          ) : null}
          <li className="flex items-center gap-2 text-night-muted">
            <span className="text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-gold/15 text-gold-deep">
              Fondateur
              {profile.founder_rank ? ` · #${profile.founder_rank}` : ""}
            </span>
          </li>
        </ul>
      </div>
    </article>
  );
}
