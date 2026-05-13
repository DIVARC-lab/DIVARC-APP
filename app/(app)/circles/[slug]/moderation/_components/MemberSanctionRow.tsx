"use client";

import { Gavel } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { SanctionDialog } from "./SanctionDialog";

type Props = {
  circleId: string;
  member: {
    user_id: string;
    profile: {
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
    } | null;
    role: string;
    warnings_count: number;
    is_muted: boolean;
    is_banned: boolean;
  };
};

export function MemberSanctionRow({ circleId, member }: Props) {
  const [open, setOpen] = useState(false);
  const profile = member.profile;
  const name = profile?.full_name ?? profile?.username ?? "Utilisateur";

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Avatar src={profile?.avatar_url ?? null} fullName={name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-night truncate">{name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {profile?.username ? (
              <span className="text-[10px] text-night-dim">
                @{profile.username}
              </span>
            ) : null}
            {member.warnings_count > 0 ? (
              <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase tracking-wider">
                {member.warnings_count} avert.
              </span>
            ) : null}
            {member.is_muted ? (
              <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-night/10 text-night text-[9px] font-extrabold uppercase tracking-wider">
                Mute
              </span>
            ) : null}
            {member.is_banned ? (
              <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-red-100 text-red-700 text-[9px] font-extrabold uppercase tracking-wider">
                Banni
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-red-600 border border-red-200 text-[11px] font-bold hover:bg-red-50 transition-colors shrink-0"
        >
          <Gavel className="w-3 h-3" aria-hidden />
          Sanctionner
        </button>
      </div>
      {open ? (
        <SanctionDialog
          circleId={circleId}
          targetUserId={member.user_id}
          targetName={name}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
