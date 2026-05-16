/* Page messages favoris (starred). */

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Messages favoris — DIVARC" };

type Starred = {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  type: string;
  created_at: string;
  starred_at: string;
  conv_name: string | null;
  sender_username: string | null;
  sender_avatar_url: string | null;
};

export default async function StarredMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/messages/starred");

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data } = await (supabase as any).rpc("list_starred_messages", {
    p_limit: 100,
  });
  const starred = ((data ?? []) as Starred[]);

  return (
    <div className="min-h-[100dvh] bg-bg-soft pb-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6">
        <header className="flex items-center gap-3 mb-5">
          <Link
            href="/messages"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-line hover:bg-bg-soft transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
          </Link>
          <div className="flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              · MESSAGES
            </p>
            <h1 className="font-display italic text-[24px] sm:text-[28px] text-night leading-tight">
              <em className="text-gold-deep">Favoris</em>
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-gold/15 border border-gold/30 text-gold-deep text-[11px] font-extrabold tabular-nums">
            <Star
              className="w-3 h-3 fill-current"
              aria-hidden
              strokeWidth={2.4}
            />
            {starred.length}
          </span>
        </header>

        {starred.length === 0 ? (
          <div className="text-center py-16">
            <Star
              className="w-12 h-12 text-night-dim/40 mx-auto mb-3"
              aria-hidden
              strokeWidth={1.5}
            />
            <p className="text-[14px] font-bold text-night mb-1">
              Aucun message favori
            </p>
            <p className="text-[12px] text-night-dim leading-relaxed max-w-sm mx-auto">
              Marque un message comme favori en faisant un appui long et en
              choisissant « Étoiler ». Tu pourras les retrouver ici.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {starred.map((s) => {
              const dateStr = new Date(s.created_at).toLocaleDateString(
                "fr-FR",
                {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              );
              return (
                <li key={s.message_id}>
                  <Link
                    href={`/messages/${s.conversation_id}?focus=${s.message_id}`}
                    className="block p-3 rounded-2xl bg-white border border-line hover:border-gold/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Avatar
                        src={s.sender_avatar_url}
                        fullName={s.sender_username ?? "Auteur"}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-extrabold text-night truncate">
                          {s.sender_username ?? "Auteur"}
                          {s.conv_name ? (
                            <span className="text-night-dim font-normal">
                              {" "}
                              · {s.conv_name}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[10px] text-night-dim tabular-nums">
                          {dateStr}
                        </p>
                      </div>
                      <Star
                        className="w-3.5 h-3.5 text-gold fill-current shrink-0"
                        aria-hidden
                      />
                    </div>
                    {s.body ? (
                      <p className="text-[13px] text-night-soft line-clamp-3 leading-snug">
                        {s.body}
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
