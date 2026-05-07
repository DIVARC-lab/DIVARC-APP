import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type UserSearchResult = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  location: string | null;
  friendship: {
    state: "none" | "self" | "friends" | "outgoing" | "incoming";
    friendshipId: string | null;
  };
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim();

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const sanitized = query.replace(/[%,]/g, "").slice(0, 40);

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, location")
    .eq("discoverable", true)
    .neq("id", user.id)
    .or(`full_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%`)
    .limit(10);

  if (error || !profiles) {
    return NextResponse.json(
      { results: [] },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const ids = profiles.map((profile) => profile.id);

  const { data: friendships } = ids.length
    ? await supabase
        .from("friendships")
        .select("id, requester_id, recipient_id, status")
        .in("status", ["pending", "accepted"])
        .or(
          `and(requester_id.eq.${user.id},recipient_id.in.(${ids.join(",")})),and(recipient_id.eq.${user.id},requester_id.in.(${ids.join(",")}))`,
        )
    : { data: [] };

  const friendshipByOther = new Map<
    string,
    {
      state: UserSearchResult["friendship"]["state"];
      id: string;
    }
  >();

  for (const friendship of friendships ?? []) {
    const otherId =
      friendship.requester_id === user.id
        ? friendship.recipient_id
        : friendship.requester_id;
    if (friendship.status === "accepted") {
      friendshipByOther.set(otherId, { state: "friends", id: friendship.id });
    } else if (friendship.requester_id === user.id) {
      friendshipByOther.set(otherId, { state: "outgoing", id: friendship.id });
    } else {
      friendshipByOther.set(otherId, { state: "incoming", id: friendship.id });
    }
  }

  const results: UserSearchResult[] = profiles.map((profile) => {
    const found = friendshipByOther.get(profile.id);
    return {
      id: profile.id,
      full_name: profile.full_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
      location: profile.location,
      friendship: {
        state: found?.state ?? "none",
        friendshipId: found?.id ?? null,
      },
    };
  });

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "no-store" } },
  );
}
