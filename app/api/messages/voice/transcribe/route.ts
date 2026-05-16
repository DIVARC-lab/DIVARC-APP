/* POST /api/messages/voice/transcribe
 *
 * Body : { audio_url: string }
 * → fetch l'audio depuis Supabase Storage (signed URL ou public),
 *   l'envoie à l'API OpenAI Whisper OU Anthropic via base64,
 *   retourne la transcription FR.
 *
 * Anthropic Claude n'a pas (encore) d'API audio native. On utilise
 * OpenAI Whisper si OPENAI_API_KEY est configuré, sinon retourne
 * une erreur claire avec fallback explicite.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    audio_url?: string;
  };
  if (!body.audio_url || typeof body.audio_url !== "string") {
    return NextResponse.json(
      { error: "audio_url required" },
      { status: 400 },
    );
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json(
      {
        error: "transcription_not_configured",
        message:
          "OPENAI_API_KEY non configuré côté serveur. Demande à un admin d'activer la transcription.",
      },
      { status: 503 },
    );
  }

  /* Fetch audio. */
  let audioBlob: Blob;
  try {
    const r = await fetch(body.audio_url);
    if (!r.ok) {
      return NextResponse.json(
        { error: "audio_fetch_failed", status: r.status },
        { status: 502 },
      );
    }
    audioBlob = await r.blob();
  } catch (err) {
    return NextResponse.json(
      {
        error: "audio_fetch_error",
        message: err instanceof Error ? err.message : "fetch failed",
      },
      { status: 502 },
    );
  }

  /* Whisper API multipart/form-data. */
  const form = new FormData();
  form.append("file", audioBlob, "voice.webm");
  form.append("model", "whisper-1");
  form.append("language", "fr");
  form.append("response_format", "json");

  try {
    const res = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}` },
        body: form,
      },
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "whisper_failed", status: res.status, detail: errText },
        { status: 502 },
      );
    }
    const data = (await res.json()) as { text?: string };
    return NextResponse.json({
      text: data.text ?? "",
      language: "fr",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "whisper_error",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 502 },
    );
  }
}
