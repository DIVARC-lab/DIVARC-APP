import { Mail, Shield } from "lucide-react";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries/profile";
import { AvatarUpload } from "./AvatarUpload";
import { ProfileForm } from "./ProfileForm";

export const metadata = {
  title: "Profil",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-3xl text-night">
          Profil en cours de création
        </h1>
        <p className="mt-3 text-muted max-w-md">
          Ton profil n&apos;a pas encore été créé. Si tu viens de t&apos;inscrire,
          recharge la page dans quelques secondes.
        </p>
      </div>
    );
  }

  const fullName = profile.full_name ?? user.email?.split("@")[0] ?? "";

  return (
    <div className="px-6 sm:px-10 py-10 max-w-5xl mx-auto w-full space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-white">
        <div className="h-32 bg-gradient-to-br from-night via-night-soft to-night-muted relative grain">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent" />
        </div>
        <div className="px-6 sm:px-10 pb-7 -mt-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div className="flex items-end gap-5">
            <div className="rounded-full ring-4 ring-white">
              <Avatar
                src={profile.avatar_url}
                fullName={fullName}
                size="xl"
              />
            </div>
            <div className="pb-1.5">
              <h1 className="font-display text-3xl sm:text-4xl text-night text-balance">
                {fullName}
              </h1>
              {profile.username ? (
                <p className="text-sm text-muted">@{profile.username}</p>
              ) : (
                <p className="text-sm italic text-muted">Pseudo à choisir</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Photo de profil" hint="JPG, PNG ou WebP — 4 Mo max">
            <AvatarUpload
              userId={user.id}
              currentAvatarUrl={profile.avatar_url}
              fullName={fullName}
            />
          </Card>

          <Card
            title="Informations"
            hint="Tes infos publiques. Visibles par les autres utilisateurs."
          >
            <ProfileForm profile={profile} />
          </Card>
        </div>

        <aside className="space-y-6">
          <Card title="Compte" hint="Informations privées de ton compte.">
            <dl className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Mail
                  className="w-4 h-4 mt-0.5 text-muted shrink-0"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <dt className="text-xs uppercase tracking-widest text-muted">
                    Email
                  </dt>
                  <dd
                    className="font-medium text-night truncate"
                    title={user.email ?? ""}
                  >
                    {user.email}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield
                  className="w-4 h-4 mt-0.5 text-muted shrink-0"
                  aria-hidden
                />
                <div>
                  <dt className="text-xs uppercase tracking-widest text-muted">
                    Sécurité
                  </dt>
                  <dd className="font-medium text-night">
                    Mot de passe défini
                  </dd>
                  <p className="mt-1 text-xs text-muted">
                    Le 2FA arrive bientôt.
                  </p>
                </div>
              </div>
            </dl>
          </Card>

          <div className="p-6 rounded-3xl bg-gradient-to-br from-cream via-bg to-bg border border-gold/30 text-sm">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-gold-deep">
              Astuce
            </span>
            <p className="mt-2 text-night-muted leading-relaxed">
              Un profil complet est <strong className="text-night">3×</strong>{" "}
              plus susceptible d&apos;être trouvé par tes amis lors du lancement
              de la messagerie.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="p-6 sm:p-8 rounded-3xl bg-white border border-line shadow-soft">
      <header className="mb-6">
        <h2 className="font-display text-2xl text-night">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      </header>
      {children}
    </article>
  );
}
