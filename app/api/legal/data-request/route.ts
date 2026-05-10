import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/* POST /api/legal/data-request — réception réquisitions judiciaires.
 *
 * Cadre :
 *   - LCEN art. 6 II (conservation 1 an minimum données identification)
 *   - Code de procédure pénale art. 60-1 (réquisitions judiciaires)
 *   - RGPD art. 6 §1.c (obligation légale)
 *   - DSA art. 9 (orders to provide information)
 *
 * Cette route :
 *   - Reçoit les requêtes officielles (réquisitions) avec authentification
 *     forte par token signé (env LEGAL_REQUEST_TOKEN, à roter régulièrement)
 *   - Loggue immédiatement dans legal_data_requests (immuable sur les
 *     champs critiques via trigger DB)
 *   - Ne traite PAS la réponse automatiquement — c'est l'équipe légale +
 *     DPO qui valide ensuite via /admin/legal/data-requests
 *
 * Pour les requêtes "urgent_life_at_risk" : SLA 24h, sinon SLA 7j.
 */

const dataRequestSchema = z
  .object({
    request_type: z.enum([
      "judicial",
      "administrative",
      "dpa",
      "court_order",
      "urgent_life_at_risk",
    ]),
    authority_name: z.string().min(2).max(200),
    authority_reference: z.string().max(200).optional(),
    contact_email: z.string().email(),
    target_user_id: z.string().uuid().optional(),
    target_scope: z.string().min(2).max(200),
    scope_details: z.record(z.string(), z.unknown()).optional(),
    legal_basis: z.string().min(5).max(500),
  })
  .strict();

export async function POST(request: Request) {
  /* MFA-equivalent : token statique signé + IP allowlist.
     Le token doit être tourné régulièrement et partagé hors-bande avec
     les autorités habilitées. Pour V1, validation token simple suffit. */
  const headerToken = request.headers.get("x-legal-token");
  const expectedToken = process.env.LEGAL_REQUEST_TOKEN;
  if (!expectedToken || !headerToken || headerToken !== expectedToken) {
    /* On retourne 404 plutôt que 401 pour ne pas révéler l'existence de
       l'endpoint aux scanners non autorisés. */
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = dataRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  /* SLA selon urgence. */
  const slaHours = input.request_type === "urgent_life_at_risk" ? 24 : 168;
  const slaDeadline = new Date(
    Date.now() + slaHours * 3600 * 1000,
  ).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("legal_data_requests")
    .insert({
      request_type: input.request_type,
      authority_name: input.authority_name,
      authority_reference: input.authority_reference ?? null,
      contact_email: input.contact_email,
      target_user_id: input.target_user_id ?? null,
      target_scope: input.target_scope,
      scope_details: input.scope_details ?? null,
      sla_deadline: slaDeadline,
      legal_basis: input.legal_basis,
    })
    .select("id, sla_deadline")
    .single();

  if (error || !data) {
    console.error("[legal:data-request] insert failed:", error);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }

  /* TODO : envoyer email à l'équipe légale (legal@divarc.app) pour
     traitement immédiat. Pour V1, l'équipe consulte /admin/legal. */

  return NextResponse.json(
    {
      id: data.id,
      sla_deadline: data.sla_deadline,
      ack: "Réquisition reçue. L'équipe légale DIVARC vous répondra dans les délais légaux applicables.",
    },
    { status: 201 },
  );
}

/* GET réservé aux modos pour debug local — production : 404. */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("current_user_is_admin");
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("legal_data_requests")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(20);
  return NextResponse.json({ requests: data ?? [] });
}
