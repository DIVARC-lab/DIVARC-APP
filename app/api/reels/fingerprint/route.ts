import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* POST /api/reels/fingerprint — enqueue un reel pour audio fingerprinting
 * V3.13 (AcoustID/Chromaprint pipeline V4).
 *
 * Body : { reel_id: uuid, hash: string (sha256 hex, 64 chars) }
 *
 * V3.13 stub : appelle RPC enqueue_reel_fingerprint qui set le row à
 * fingerprint_status='pending' avec le hash SHA-256 client-side.
 *
 * Détection duplicat parfait : si un autre reel a déjà le même hash et
 * fingerprint_status='copyrighted', on renvoie 409 et le client doit
 * supprimer le reel récemment créé.
 *
 * V4 : un worker async traitera la queue pending → Chromaprint + AcoustID. */

const bodySchema = z.object({
  reel_id: z.string().uuid(),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  /* Détection duplicat : un autre reel a-t-il déjà ce hash marqué
   * copyrighted ? */
  const { data: existing } = await supabase
    .from("reels")
    .select("id, fingerprint_status, copyright_match_id")
    .eq("fingerprint_hash", body.hash)
    .eq("fingerprint_status", "copyrighted")
    .neq("id", body.reel_id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error: "copyrighted",
        match_reel_id: existing.id,
        match_id: existing.copyright_match_id,
      },
      { status: 409 },
    );
  }

  /* Enqueue pour traitement async. */
  const { error } = await supabase.rpc("enqueue_reel_fingerprint", {
    p_reel_id: body.reel_id,
    p_hash: body.hash,
  });

  if (error) {
    console.error("[reels:fingerprint:enqueue]", error);
    return NextResponse.json(
      { error: "Enqueue failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, status: "pending" });
}
