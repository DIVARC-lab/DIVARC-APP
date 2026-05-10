import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createMuxAsset,
  isMuxConfigured,
  muxHlsUrl,
  muxThumbnailUrl,
} from "@/lib/video/mux";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/* POST /api/posts/video/transcode
 *
 * Lance la transcoding HLS d'une vidéo de post via Mux. Appelé par le
 * client après un upload MP4 réussi (ou en background depuis une server
 * action V2).
 *
 * Body : { post_id }
 *
 * Auth : authenticated + l'user doit être l'auteur du post.
 *
 * Pipeline :
 *   1. Vérifie l'auth + ownership
 *   2. Vérifie que le post a video_url (MP4 uploadé)
 *   3. Crée un asset Mux avec passthrough=post_id
 *   4. Met à jour posts.video_provider_asset_id + status='transcoding'
 *   5. Le webhook Mux mettra à jour video_hls_url + status='ready'
 *
 * Si MUX_TOKEN_ID absent → 503 graceful, le client garde son MP4.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({ post_id: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMuxConfigured()) {
    return NextResponse.json(
      { error: "Mux non configuré (MUX_TOKEN_ID manquant)." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  /* Vérifie ownership + récupère video_url. */
  const { data: post, error: pErr } = await supabase
    .from("posts")
    .select("id, author_id, video_url, video_status, video_provider_asset_id")
    .eq("id", parsed.data.post_id)
    .maybeSingle();
  if (pErr || !post) {
    return NextResponse.json({ error: "Post introuvable." }, { status: 404 });
  }
  if (post.author_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!post.video_url) {
    return NextResponse.json(
      { error: "Aucune vidéo MP4 attachée à ce post." },
      { status: 400 },
    );
  }
  if (post.video_status === "ready" || post.video_status === "transcoding") {
    return NextResponse.json({
      ok: true,
      already_processing: true,
      asset_id: post.video_provider_asset_id,
    });
  }

  const asset = await createMuxAsset({
    inputUrl: post.video_url,
    passthrough: post.id,
  });
  if (!asset) {
    return NextResponse.json(
      { error: "Échec création asset Mux." },
      { status: 502 },
    );
  }

  /* Maj DB : status='transcoding', stocke asset_id + URL HLS prédictible
     (Mux la rendra accessible quand status passera à 'ready'). */
  const admin = createAdminClient();
  const { error: uErr } = await admin
    .from("posts")
    .update({
      video_provider_asset_id: asset.asset_id,
      video_hls_url: muxHlsUrl(asset.playback_id),
      video_thumbnail_url: muxThumbnailUrl(asset.playback_id),
      video_status: "transcoding",
    })
    .eq("id", post.id);
  if (uErr) {
    console.error("[posts:video:transcode:update]", uErr);
    return NextResponse.json(
      { error: "Échec mise à jour DB." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    asset_id: asset.asset_id,
    playback_id: asset.playback_id,
    hls_url: muxHlsUrl(asset.playback_id),
  });
}
