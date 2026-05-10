import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* POST /api/ads/creative/ai-generate
 *
 * Génère 1-4 images via Replicate SDXL à partir d'un prompt + style.
 * Auth : authenticated + role editor sur l'ad_account.
 * Coût V1 : ~ $0.005 / image SDXL → on rate-limit 30 gens / heure / user.
 *
 * Body : { ad_account_id, prompt, style?, ratio?, count? }
 * Réponse : { images: string[] }
 *
 * Si REPLICATE_API_TOKEN absent : 503 service_unavailable (graceful).
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const STYLES: Record<string, string> = {
  photo: "professional product photography, studio lighting, clean background",
  illustration:
    "modern flat illustration, vibrant colors, minimalist, vector art style",
  lifestyle: "lifestyle photography, natural light, candid, premium feel",
  bold:
    "bold vivid colors, high contrast, eye-catching ad design, modern typography",
  minimalist: "minimalist composition, lots of whitespace, premium aesthetic",
};

const RATIOS: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 832, height: 1024 },
  "9:16": { width: 768, height: 1344 },
  "16:9": { width: 1344, height: 768 },
};

const bodySchema = z
  .object({
    ad_account_id: z.string().uuid(),
    prompt: z.string().min(3).max(400),
    style: z.enum(["photo", "illustration", "lifestyle", "bold", "minimalist"]).optional(),
    ratio: z.enum(["1:1", "4:5", "9:16", "16:9"]).optional(),
    count: z.number().int().min(1).max(4).optional(),
    negative_prompt: z.string().max(200).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: data.ad_account_id,
    p_min_role: "editor",
  });
  if (!hasRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Génération IA temporairement indisponible (REPLICATE_API_TOKEN manquant).",
      },
      { status: 503 },
    );
  }

  const styleSuffix = data.style ? `, ${STYLES[data.style]}` : "";
  const fullPrompt = `${data.prompt}${styleSuffix}`;
  const negative =
    data.negative_prompt ??
    "text, watermark, logo, signature, low quality, blurry, distorted, disfigured, ugly, nudity";
  const dims = RATIOS[data.ratio ?? "1:1"];
  const count = data.count ?? 2;

  /* Replicate stable-diffusion-xl-base. V1 : sync via wait param. */
  let resp: Response;
  try {
    resp = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=55",
      },
      body: JSON.stringify({
        version:
          "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        input: {
          prompt: fullPrompt,
          negative_prompt: negative,
          width: dims.width,
          height: dims.height,
          num_outputs: count,
          scheduler: "K_EULER",
          num_inference_steps: 30,
          guidance_scale: 7.5,
        },
      }),
      signal: AbortSignal.timeout(58000),
    });
  } catch (err) {
    console.error("[ads:creative:ai-generate]", err);
    return NextResponse.json(
      { error: "Erreur réseau lors de la génération." },
      { status: 502 },
    );
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    console.error("[ads:creative:ai-generate]", resp.status, txt);
    return NextResponse.json(
      { error: "Replicate a refusé la requête." },
      { status: 502 },
    );
  }

  const json = (await resp.json().catch(() => null)) as {
    output?: string[] | null;
    status?: string;
    error?: string;
  } | null;

  if (!json) {
    return NextResponse.json({ error: "Réponse invalide." }, { status: 502 });
  }
  if (json.error) {
    return NextResponse.json({ error: json.error }, { status: 502 });
  }
  if (!Array.isArray(json.output) || json.output.length === 0) {
    return NextResponse.json(
      {
        error:
          "Génération en cours, réessaie dans 30s (image pas encore prête).",
      },
      { status: 202 },
    );
  }

  return NextResponse.json({ images: json.output });
}
