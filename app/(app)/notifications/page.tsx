import { Bell } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  countUnreadNotifications,
  listNotificationsForUser,
} from "@/lib/queries/notifications";
import { MarkAllReadButton } from "./_components/MarkAllReadButton";
import { NotificationItem } from "./_components/NotificationItem";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { cn } from "@/lib/utils/cn";

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

  /* Group notifications by day-bucket : "Aujourd'hui", "Hier",
     "Cette semaine", "Plus ancien". */
  const groups = groupByBucket(notifications);

  return (
    <div className="px-4 sm:px-10 py-8 sm:py-10 max-w-3xl mx-auto w-full">
      <header className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <KickerLabel>Activité</KickerLabel>
          <DisplayHeading size="lg" italicAll className="mt-2">
            Notifications
          </DisplayHeading>
          {unreadCount > 0 ? (
            <p className="mt-2 text-muted-strong text-sm">
              {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
            </p>
          ) : null}
        </div>
        <MarkAllReadButton disabled={unreadCount === 0} />
      </header>

      {/* Tabs (visual scaffolding — V1 default to "Tout"). */}
      <nav
        aria-label="Filtres notifications"
        className="-mx-1 px-1 mb-6 flex gap-2 overflow-x-auto scrollbar-none"
      >
        {[
          { l: "Tout", active: true },
          { l: "Mentions" },
          { l: "Likes" },
          { l: "Commentaires" },
          { l: "Abonnés" },
        ].map((f) => (
          <span
            key={f.l}
            className={cn(
              "shrink-0 px-3.5 h-8 rounded-full text-xs font-semibold inline-flex items-center transition-colors",
              f.active
                ? "bg-night text-cream"
                : "bg-white border border-line text-night-muted",
            )}
          >
            {f.l}
          </span>
        ))}
      </nav>

      {notifications.length === 0 ? (
        <EmptyNotifications />
      ) : (
        <div className="space-y-7">
          {groups.map((group) => (
            <section key={group.bucket} aria-label={group.bucket}>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted mb-3">
                {group.bucket}
              </p>
              <ul className="space-y-2">
                {group.items.map((notification) => (
                  <li key={notification.id}>
                    <NotificationItem notification={notification} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
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
      <h2 className="font-display italic text-2xl text-night">
        Tu es <em className="italic text-gold-deep">à jour</em>
      </h2>
      <p className="mt-2 text-muted max-w-sm mx-auto leading-relaxed">
        Quand tes amis interagiront avec ton contenu, ce sera ici.
      </p>
    </div>
  );
}

const DAY_MS = 86_400_000;

type Notif = Awaited<ReturnType<typeof listNotificationsForUser>>[number];

function groupByBucket(items: Notif[]) {
  const now = Date.now();
  const today: Notif[] = [];
  const yesterday: Notif[] = [];
  const week: Notif[] = [];
  const older: Notif[] = [];

  for (const n of items) {
    const created = new Date(n.created_at).getTime();
    const ageDays = (now - created) / DAY_MS;
    if (ageDays < 1) today.push(n);
    else if (ageDays < 2) yesterday.push(n);
    else if (ageDays < 7) week.push(n);
    else older.push(n);
  }

  const groups: Array<{ bucket: string; items: Notif[] }> = [];
  if (today.length) groups.push({ bucket: "Aujourd'hui", items: today });
  if (yesterday.length) groups.push({ bucket: "Hier", items: yesterday });
  if (week.length) groups.push({ bucket: "Cette semaine", items: week });
  if (older.length) groups.push({ bucket: "Plus ancien", items: older });
  return groups;
}
