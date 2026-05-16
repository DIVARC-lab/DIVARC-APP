/* Étape 21 — Webhook LiveKit Cloud → finalise les recordings.
 *
 * Events traités :
 *  - egress_started   : status='recording'
 *  - egress_updated   : pas d'action (intermédiaire)
 *  - egress_ended     : status='completed', file_url + duration + size
 *
 * Auth : LiveKit signe le webhook via JWT. Le SDK fournit WebhookReceiver
 * qui valide la signature. ENV var LIVEKIT_API_KEY/SECRET requis.
 */

import { type NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getReceiver(): WebhookReceiver | null {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) return null;
  return new WebhookReceiver(apiKey, apiSecret);
}

export async function POST(req: NextRequest) {
  const receiver = getReceiver();
  if (!receiver) {
    return NextResponse.json(
      { ok: false, error: "LiveKit non configuré" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const body = await req.text();

  let event;
  try {
    event = await receiver.receive(body, auth);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Signature invalide",
      },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Service role manquante" },
      { status: 500 },
    );
  }

  const eventType = event.event;
  const egressInfo = event.egressInfo;

  if (
    egressInfo &&
    (eventType === "egress_started" ||
      eventType === "egress_updated" ||
      eventType === "egress_ended")
  ) {
    const egressId = egressInfo.egressId;
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const fileResult = (egressInfo as any).fileResults?.[0];
    const finalDuration = fileResult?.duration
      ? Math.round(Number(fileResult.duration) / 1_000_000_000)
      : null;
    const finalSize = fileResult?.size ? Number(fileResult.size) : null;
    const finalLocation = (fileResult?.location as string | undefined) ?? null;

    /* Étape 23 — Thumbnail : prend la première image générée si dispo.
       Pattern : filename_prefix + INDEX 6 digits + ".jpg" → ex.
       thumbnails/{room}/{stamp}__000000.jpg.
       Build URL publique Supabase Storage. */
    let thumbnailUrl: string | null = null;
    const imageResults = (egressInfo as any).imageResults as
      | Array<{
          filenamePrefix?: string;
          imageCount?: bigint | number;
        }>
      | undefined;
    if (
      imageResults &&
      imageResults.length > 0 &&
      Number(imageResults[0]?.imageCount ?? 0) > 0
    ) {
      const prefix = imageResults[0]?.filenamePrefix ?? "";
      const bucket = process.env.SUPABASE_STORAGE_VOD_BUCKET ?? "live-vod";
      const supabasePublic = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (prefix && supabasePublic) {
        thumbnailUrl = `${supabasePublic.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${prefix}000000.jpg`;
      }
    }

    const updates: Record<string, unknown> = {
      raw_egress_info: egressInfo as unknown,
    };

    if (eventType === "egress_started") {
      updates.status = "recording";
    } else if (eventType === "egress_ended") {
      /* Status LiveKit : 0=STARTING, 1=ACTIVE, 2=ENDING, 3=COMPLETE,
         4=FAILED, 5=ABORTED, 6=LIMIT_REACHED. */
      const statusCode = (egressInfo as any).status as number | undefined;
      if (statusCode === 3) {
        updates.status = "completed";
        updates.file_url = finalLocation;
        updates.duration_seconds = finalDuration;
        updates.size_bytes = finalSize;
        updates.completed_at = new Date().toISOString();
        if (thumbnailUrl) updates.thumbnail_url = thumbnailUrl;
      } else if (statusCode === 4) {
        updates.status = "failed";
        updates.error_message =
          (egressInfo as any).error ?? "Egress échoué";
      } else if (statusCode === 5) {
        updates.status = "aborted";
      }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const { data: rec } = await (admin as any)
      .from("live_recordings")
      .update(updates)
      .eq("egress_id", egressId)
      .select("session_id, duration_seconds, file_url, thumbnail_url")
      .maybeSingle();

    /* Propage l'URL VOD + thumbnail vers la table circle_live_rooms
       pour affichage dans le viewer ended state. */
    if (rec && updates.status === "completed") {
      const r = rec as {
        session_id: string;
        duration_seconds: number | null;
        file_url: string | null;
        thumbnail_url: string | null;
      };
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      await (admin as any)
        .from("circle_live_rooms")
        .update({
          vod_url: r.file_url,
          vod_duration_seconds: r.duration_seconds,
          vod_thumbnail_url: r.thumbnail_url,
        })
        .eq("id", r.session_id);
    }
  }

  return NextResponse.json({ ok: true, event: eventType });
}
