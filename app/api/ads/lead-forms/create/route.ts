import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* POST /api/ads/lead-forms/create — création d'un Lead Form natif.
 *
 * Body : { ad_account_id, name, intro_*, questions, privacy_policy_url,
 *          thankyou_*, webhook_url? }
 *
 * Auth : authenticated + role editor sur l'ad_account.
 *
 * Le lead form est lié au creative via creatives.lead_form_id (set côté
 * createFullCampaign si l'objectif = lead_generation).
 */

export const runtime = "nodejs";
export const maxDuration = 15;

const fieldSchema = z.object({
  type: z.enum([
    "email",
    "first_name",
    "last_name",
    "phone",
    "company",
    "city",
    "postal_code",
    "custom_text",
    "custom_select",
  ]),
  label: z.string().min(1).max(80),
  required: z.boolean(),
  options: z.array(z.string().max(80)).max(20).optional(),
});

const bodySchema = z
  .object({
    ad_account_id: z.string().uuid(),
    name: z.string().min(2).max(100),
    form_type: z.enum(["more_volume", "higher_intent"]).optional(),
    intro_title: z.string().min(2).max(120),
    intro_description: z.string().max(500).optional(),
    intro_image_url: z.string().url().optional(),
    fields: z.array(fieldSchema).min(1).max(15),
    privacy_policy_url: z.string().url(),
    consent_text: z.string().max(500).optional(),
    thankyou_title: z.string().min(2).max(120),
    thankyou_description: z.string().max(500).optional(),
    thankyou_cta_label: z.string().max(40).optional(),
    thankyou_cta_url: z.string().url().optional(),
    webhook_url: z.string().url().optional(),
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

  const { data: form, error } = await supabase
    .from("ads_lead_forms")
    .insert({
      ad_account_id: data.ad_account_id,
      name: data.name,
      form_type: data.form_type ?? "more_volume",
      intro_title: data.intro_title,
      intro_description: data.intro_description ?? null,
      intro_image_url: data.intro_image_url ?? null,
      questions: data.fields,
      privacy_policy_url: data.privacy_policy_url,
      consent_text:
        data.consent_text ??
        "En soumettant ce formulaire, j'accepte la politique de confidentialité.",
      thankyou_title: data.thankyou_title,
      thankyou_description: data.thankyou_description ?? null,
      thankyou_cta_label: data.thankyou_cta_label ?? null,
      thankyou_cta_url: data.thankyou_cta_url ?? null,
      webhook_url: data.webhook_url ?? null,
      is_active: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !form) {
    console.error("[ads:lead-forms:create]", error);
    return NextResponse.json(
      { error: "Création formulaire échouée." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: form.id });
}
