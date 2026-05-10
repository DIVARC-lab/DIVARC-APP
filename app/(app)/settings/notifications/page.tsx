import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { createClient } from "@/lib/supabase/server";
import { NotificationPrefsForm } from "./NotificationPrefsForm";

export const metadata = {
  title: "Notifications · Paramètres",
};

/* Settings /settings/notifications — opt-out granulaire par catégorie
 * (migration 0057). Chaque trigger DB notify_* vérifie should_notify_user()
 * avant insert ; un toggle off coupe la catégorie pour ce user. */
export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  /* RPC get_notification_preferences() initialise la row si absente. */
  const { data: prefs } = await supabase
    .rpc("get_notification_preferences")
    .single<{
      user_id: string;
      friend_requests: boolean;
      messages: boolean;
      mentions: boolean;
      likes: boolean;
      comments: boolean;
      moderation: boolean;
      system: boolean;
      updated_at: string;
    }>();

  const initial = {
    friend_requests: prefs?.friend_requests ?? true,
    messages: prefs?.messages ?? true,
    mentions: prefs?.mentions ?? true,
    likes: prefs?.likes ?? true,
    comments: prefs?.comments ?? true,
    moderation: prefs?.moderation ?? true,
    system: prefs?.system ?? true,
  };

  return (
    <div className="bg-bg-soft min-h-screen pb-24">
      <div className="mx-auto w-full max-w-2xl">
        <header className="px-5 sm:px-8 pt-8 pb-6">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
          >
            <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
            Paramètres
          </Link>
          <KickerLabel>· Notifications</KickerLabel>
          <DisplayHeading
            size="lg"
            className="mt-2 !leading-[1.05] !text-[36px] sm:!text-[44px]"
          >
            Ce que tu reçois.
          </DisplayHeading>
          <p className="mt-3 text-[14px] text-night-soft leading-relaxed">
            Coupe les catégories qui ne t&apos;intéressent pas. Les
            notifications dans l&apos;app respectent ces choix instantanément
            (côté serveur). Email et push&nbsp;: gérés séparément dans ton
            profil.
          </p>
        </header>

        <section className="px-5 sm:px-8">
          <NotificationPrefsForm initialPrefs={initial} />
        </section>
      </div>
    </div>
  );
}
