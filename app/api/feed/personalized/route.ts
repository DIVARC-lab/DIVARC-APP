import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rankFeedForUser } from "@/lib/recsys/ranker";

/* Endpoint feed personnalisé V1 lite — délègue le scoring à
 * lib/recsys/ranker.ts (helper réutilisable côté SSR + route handler).
 *
 * Modes :
 *  - algorithmic (default) : 4 features (freshness, network, creator
 *    affinity, semantic match via RPC pgvector)
 *  - chronological (DSA art. 38) : bypass total, posts du graph en
 *    ORDER BY created_at DESC
 *
 * Le mode est lu depuis user_algorithm_settings.chronological_mode, mais
 * peut être override via ?mode=algorithmic|chronological pour debug ou A/B. */

const querySchema = z.object({
  surface: z.enum(["home", "circle", "topic"]).default("home"),
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(30).default(15),
  mode_override: z.enum(["algorithmic", "chronological"]).optional(),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const { cursor, limit, mode_override } = parsed.data;

  const { items, nextCursor } = await rankFeedForUser(supabase, user.id, {
    cursor,
    limit,
    chronologicalMode:
      mode_override === "chronological"
        ? true
        : mode_override === "algorithmic"
          ? false
          : undefined,
  });

  return NextResponse.json({
    items: items.map((i) => ({
      post_id: i.post_id,
      ranking_metadata: i.ranking_metadata,
    })),
    next_cursor: nextCursor,
  });
}
