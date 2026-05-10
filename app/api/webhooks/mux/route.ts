import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { muxHlsUrl, muxThumbnailUrl, type MuxWebhookEvent } from "@/lib/video/mux";

/* POST /api/webhooks/mux
 *
 * Webhook Mux : reçoit les events de transcoding et met à jour
 * posts.video_status / video_hls_url accordingly.
 *
 * Events principaux :
 *   - video.asset.ready : transcoding fini → status='ready' + URL HLS
 *   - video.asset.errored : transcoding échoué → status='failed' + error
 *
 * Auth : signature HMAC SHA-256 du body avec MUX_WEBHOOK_SECRET.
 * Si secret absent → on accepte le webhook sans vérification (dev only,
 * jamais à activer en prod).
 *
 * Doc : https://docs.mux.com/core/listen-for-webhooks
 */

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("mux-signature");

  /* Vérification HMAC. */
  const secret = process.env.MUX_WEBHOOK_SECRET;
  if (secret) {
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 },
      );
    }
    /* Format Mux : "t=<timestamp>,v1=<hmac>" */
    const parts = signature.split(",").reduce<Record<string, string>>(
      (acc, kv) => {
        const [k, v] = kv.split("=");
        if (k && v) acc[k.trim()] = v.trim();
        return acc;
      },
      {},
    );
    const ts = parts.t;
    const v1 = parts.v1;
    if (!ts || !v1) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }
    const payload = `${ts}.${rawBody}`;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const sigBuffer = Buffer.from(v1, "hex");
    const expBuffer = Buffer.from(expected, "hex");
    if (
      sigBuffer.length !== expBuffer.length ||
      !timingSafeEqual(sigBuffer, expBuffer)
    ) {
      return NextResponse.json(
        { error: "Signature mismatch" },
        { status: 401 },
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    /* Pas de secret en prod → on refuse plutôt que d'accepter un
       webhook non vérifié. */
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 503 },
    );
  }

  let event: MuxWebhookEvent;
  try {
    event = JSON.parse(rawBody) as MuxWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = event.data;
  if (!data?.id) {
    /* Event sans asset id → on acquitte mais on ne fait rien. */
    return NextResponse.json({ ok: true, ignored: true });
  }

  const admin = createAdminClient();

  /* Recherche post via passthrough (de préférence) ou asset_id. */
  let postId: string | null = null;
  if (data.passthrough) {
    /* Validation UUID basique pour éviter les passthrough malicieux. */
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        data.passthrough,
      )
    ) {
      postId = data.passthrough;
    }
  }
  if (!postId) {
    /* Fallback : lookup par asset_id. */
    const { data: post } = await admin
      .from("posts")
      .select("id")
      .eq("video_provider_asset_id", data.id)
      .maybeSingle();
    postId = post?.id ?? null;
  }

  if (!postId) {
    return NextResponse.json({ ok: true, ignored: "post_not_found" });
  }

  if (event.type === "video.asset.ready") {
    const playbackId = data.playback_ids?.[0]?.id;
    if (!playbackId) {
      return NextResponse.json({ ok: true, ignored: "no_playback_id" });
    }
    await admin
      .from("posts")
      .update({
        video_status: "ready",
        video_hls_url: muxHlsUrl(playbackId),
        video_thumbnail_url: muxThumbnailUrl(playbackId),
        video_duration_ms: data.duration
          ? Math.round(data.duration * 1000)
          : null,
      })
      .eq("id", postId);
    return NextResponse.json({ ok: true, status: "ready", post_id: postId });
  }

  if (event.type === "video.asset.errored") {
    const errMsg = data.errors?.messages?.join("; ") ?? "Unknown Mux error";
    await admin
      .from("posts")
      .update({
        video_status: "failed",
        video_error: errMsg.slice(0, 500),
      })
      .eq("id", postId);
    return NextResponse.json({ ok: true, status: "failed", post_id: postId });
  }

  /* Autres events (asset.created, asset.updated) : on n'agit pas. */
  return NextResponse.json({ ok: true, type: event.type });
}
