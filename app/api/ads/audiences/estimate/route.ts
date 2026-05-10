import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { estimateAudience } from "@/lib/ads/estimator";
import { validateTargetingSpec, type TargetingSpec } from "@/lib/ads/types";

/* POST /api/ads/audiences/estimate
 *
 * Body : { ad_account_id: string, targeting: TargetingSpec }
 *
 * Auth : authenticated + role analyst+ sur l'ad_account.
 *
 * Réponse : AudienceEstimate (k-anonymity ≥ 100, ranges).
 */

const bodySchema = z
  .object({
    ad_account_id: z.string().uuid(),
    targeting: z
      .object({
        geo: z.object({
          countries: z.array(z.string().length(2)).default(["FR"]),
          regions: z.array(z.string()).optional(),
          cities: z.array(z.unknown()).optional(),
          postal_codes: z.array(z.string()).optional(),
          custom_locations: z.array(z.unknown()).optional(),
          location_types: z
            .array(z.enum(["home", "recent", "travel_in"]))
            .optional(),
          excluded_locations: z.array(z.string()).optional(),
        }),
        age_min: z.number().int().min(18).max(99),
        age_max: z.number().int().min(18).max(99),
        genders: z.array(z.enum(["all", "male", "female", "non_binary"])),
        languages: z.array(z.string()).optional(),
        interests: z
          .array(
            z.object({
              topic_id: z.string(),
              affinity_threshold: z.number().min(0).max(1).optional(),
            }),
          )
          .optional(),
        interests_logic: z.enum(["or", "and"]).optional(),
        behaviors: z.array(z.unknown()).optional(),
        connections: z.record(z.string(), z.unknown()).optional(),
        custom_audience_ids: z.array(z.string().uuid()).optional(),
        excluded_custom_audience_ids: z.array(z.string().uuid()).optional(),
        lookalike_audience_ids: z.array(z.string().uuid()).optional(),
      })
      .passthrough(),
    special_ad_category: z
      .enum(["housing", "employment", "credit", "social"])
      .optional(),
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

  const { ad_account_id, targeting, special_ad_category } = parsed.data;

  /* Role check (analyst+). */
  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: ad_account_id,
    p_min_role: "analyst",
  });
  if (!hasRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* Validation conformité — on refuse d'estimer une targeting non-conforme
     pour ne pas suggérer à l'annonceur de cibler des mineurs ou des
     catégories sensibles. */
  const validation = validateTargetingSpec(
    targeting as TargetingSpec,
    special_ad_category ?? null,
  );
  if (!validation.valid) {
    return NextResponse.json(
      {
        error: "Ciblage non conforme",
        validation_errors: validation.errors,
      },
      { status: 400 },
    );
  }

  const estimate = await estimateAudience(targeting as TargetingSpec);

  return NextResponse.json(estimate);
}
