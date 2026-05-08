import { Bell } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  countUnreadNotifications,
  listNotificationsForUser,
} from "@/lib/queries/notifications";
import { MarkAllReadButton } from "./_components/MarkAllReadButton";
import { NotificationItem } from "./_components/NotificationItem";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [notifications, unreadCount] = await Promise.all([
    listNotificationsForUser(user.id, 100),
    countUnreadNotifications(user.id),
  ]);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-3xl mx-auto w-full space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <KickerLabel>Notifications</KickerLabel>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
            Ton centre <em className="italic text-gold-deep">d&apos;activité</em>.
          </h1>
          <p className="mt-2 text-muted-strong">
            {unreadCount > 0
              ? `Tu as ${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}.`
              : "Tu es à jour. Bravo."}
          </p>
        </div>
        <MarkAllReadButton disabled={unreadCount === 0} />
      </header>

      {notifications.length === 0 ? (
        <EmptyNotifications />
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <NotificationItem notification={notification} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyNotifications() {
  return (
    <div className="text-center py-20 px-6 rounded-3xl bg-white border border-line">
      <div
        aria-hidden
        className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5"
      >
        <Bell className="w-8 h-8 text-night-muted" aria-hidden />
      </div>
      <h2 className="font-display text-2xl text-night">
        Aucune notification pour l&apos;instant
      </h2>
      <p className="mt-2 text-muted max-w-sm mx-auto">
        Quand tu recevras une demande d&apos;ami ou un message, ce sera ici.
      </p>
    </div>
  );
}
