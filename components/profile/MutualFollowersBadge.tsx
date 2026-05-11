import { Avatar } from "@/components/ui/Avatar";

/* MutualFollowersBadge — affiche "X relations en commun" + avatars stack.
 * Visible uniquement sur profil tiers (pas own profile). */

type Mutual = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Props = {
  mutuals: Mutual[];
  total?: number;
};

export function MutualFollowersBadge({ mutuals, total }: Props) {
  if (mutuals.length === 0) return null;
  const visible = mutuals.slice(0, 3);
  const totalCount = total ?? mutuals.length;
  const remaining = totalCount - visible.length;

  return (
    <div className="inline-flex items-center gap-2 text-[12px] text-night-muted">
      {/* Avatars stack */}
      <div className="flex -space-x-2">
        {visible.map((m) => (
          <Avatar
            key={m.user_id}
            src={m.avatar_url}
            fullName={m.full_name ?? m.username ?? "?"}
            size="sm"
            className="ring-2 ring-white"
          />
        ))}
      </div>
      <span>
        {totalCount === 1 ? (
          <>
            <strong className="text-night">
              {visible[0]?.full_name ?? visible[0]?.username ?? "?"}
            </strong>{" "}
            te suit aussi
          </>
        ) : (
          <>
            <strong className="text-night">{totalCount}</strong>{" "}
            {totalCount > 1 ? "abonnés" : "abonné"} en commun
            {remaining > 0 ? "" : ""}
          </>
        )}
      </span>
    </div>
  );
}
