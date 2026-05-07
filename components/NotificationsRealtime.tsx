"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/database.types";

type NotificationsRealtimeProps = {
  userId: string;
};

export function NotificationsRealtime({ userId }: NotificationsRealtimeProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notif = payload.new as Notification;
          toast(notif.title, {
            description: notif.body ?? undefined,
            action: notif.href
              ? {
                  label: "Voir",
                  onClick: () => {
                    if (notif.href) {
                      router.push(notif.href);
                    }
                  },
                }
              : undefined,
            duration: 6000,
          });
          // Refresh server components to update badges
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
