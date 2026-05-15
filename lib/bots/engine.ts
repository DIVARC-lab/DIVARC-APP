/* lib/bots/engine.ts — Bot execution engine.
 *
 * Responsabilités :
 *  - Orchestrer l'exécution d'un bot : récupérer triggers + actions,
 *    évaluer conditions, dispatcher aux handlers.
 *  - Rate limiting : max N exec/h par bot pour éviter le spam.
 *  - Logger chaque exec dans circle_bot_executions (audit + stats).
 *
 * Appelé depuis :
 *  - Server Actions DIVARC (chat-actions, actions cercle) après chaque
 *    INSERT critique → executeBotsForEvent(circle_id, event, context).
 *  - API route /api/cron/bots (Vercel Cron) → executeBotsForSchedule().
 *
 * Note : pour l'instant on appelle l'engine SYNCHRONIQUEMENT après
 * les INSERTs principaux. Si la perf devient un problème, basculer
 * sur une queue (Supabase Edge Function ou Trigger.dev). */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CircleBotEvent,
  CircleBotExecution,
} from "@/lib/database.types";
import { runActionHandler } from "./handlers";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = SupabaseClient<any, any, any>;

/* Rate limiting : par défaut max 60 exec/h par bot. Tunable par bot
 * via config.rate_limit_per_hour. */
const DEFAULT_RATE_LIMIT_PER_HOUR = 60;

export type ExecutionContext = {
  /* Pour event-based : informations sur l'événement déclencheur. */
  user_id?: string;
  post_id?: string;
  chat_message_id?: string;
  event_id?: string;
  /* Pour schedule-based : ID du trigger qui a fire. */
  trigger_id?: string;
  /* Données arbitraires (utilisées par les templates de message). */
  [key: string]: unknown;
};

export type BotEngineResult = {
  bot_id: string;
  triggered: boolean;
  actions_executed: number;
  errors: string[];
};

/* Évalue les conditions d'un trigger. Pour V1, conditions supportées :
 *  - keyword: string — le body/message contient ce keyword
 *  - keywords_any: string[] — au moins un de ces keywords
 *  - keywords_all: string[] — tous ces keywords
 *  - min_urls: number — message contient au moins N URLs
 *  - author_role: string — author a ce rôle dans le cercle
 *  - exclude_roles: string[] — author n'a PAS un de ces rôles
 *
 * V2 : conditions plus avancées (regex, length, language, etc.). */
function evaluateConditions(
  conditions: Record<string, unknown>,
  context: ExecutionContext,
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true;

  const body = (context.body as string | undefined) ?? "";

  if (typeof conditions.keyword === "string") {
    if (!body.toLowerCase().includes(conditions.keyword.toLowerCase())) {
      return false;
    }
  }

  if (Array.isArray(conditions.keywords_any)) {
    const found = conditions.keywords_any.some((kw) =>
      typeof kw === "string"
        ? body.toLowerCase().includes(kw.toLowerCase())
        : false,
    );
    if (!found) return false;
  }

  if (Array.isArray(conditions.keywords_all)) {
    const all = conditions.keywords_all.every((kw) =>
      typeof kw === "string"
        ? body.toLowerCase().includes(kw.toLowerCase())
        : false,
    );
    if (!all) return false;
  }

  if (typeof conditions.min_urls === "number") {
    const urlCount = (body.match(/https?:\/\/[^\s]+/g) ?? []).length;
    if (urlCount < conditions.min_urls) return false;
  }

  if (typeof conditions.author_role === "string") {
    const role = context.author_role as string | undefined;
    if (role !== conditions.author_role) return false;
  }

  if (Array.isArray(conditions.exclude_roles)) {
    const role = context.author_role as string | undefined;
    if (role && conditions.exclude_roles.includes(role)) return false;
  }

  return true;
}

/* Check rate limit : compte le nombre d'exec success+failed dans la
 * dernière heure et compare au cap du bot. Retourne true si OK. */
async function checkRateLimit(
  supabase: SupabaseAny,
  botId: string,
  capPerHour: number,
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("circle_bot_executions")
    .select("*", { count: "exact", head: true })
    .eq("bot_id", botId)
    .gte("triggered_at", oneHourAgo);
  return (count ?? 0) < capPerHour;
}

/* Log une exécution dans circle_bot_executions. */
async function logExecution(
  supabase: SupabaseAny,
  args: {
    bot_id: string;
    trigger_id?: string;
    context: ExecutionContext;
    status: CircleBotExecution["status"];
    output?: string;
    duration_ms?: number;
  },
) {
  await supabase.from("circle_bot_executions").insert({
    bot_id: args.bot_id,
    trigger_id: args.trigger_id ?? null,
    context: args.context,
    status: args.status,
    output: args.output ?? null,
    duration_ms: args.duration_ms ?? null,
  });
}

/* === API publique de l'engine === */

/* Exécute TOUS les bots actifs d'un cercle qui ont un trigger
 * matchant l'événement donné. Appelé depuis les Server Actions
 * après les INSERTs critiques (member join, post created, etc.). */
export async function executeBotsForEvent(
  supabase: SupabaseAny,
  circleId: string,
  event: CircleBotEvent,
  context: ExecutionContext = {},
): Promise<BotEngineResult[]> {
  /* Récupère tous les bots actifs du cercle + leurs triggers actifs
     matchant l'événement. */
  const { data: bots } = await supabase
    .from("circle_bots")
    .select(
      `id, bot_type, name, circle_id, is_active, config,
       triggers:circle_bot_triggers(id, trigger_event, conditions, is_active),
       actions:circle_bot_actions(id, action_kind, position, params, is_active)`,
    )
    .eq("circle_id", circleId)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (!bots || bots.length === 0) return [];

  const results: BotEngineResult[] = [];

  for (const bot of bots as unknown as Array<{
    id: string;
    bot_type: string;
    name: string;
    circle_id: string;
    config: Record<string, unknown>;
    triggers: Array<{
      id: string;
      trigger_event: string | null;
      conditions: Record<string, unknown>;
      is_active: boolean;
    }>;
    actions: Array<{
      id: string;
      action_kind: string;
      position: number;
      params: Record<string, unknown>;
      is_active: boolean;
    }>;
  }>) {
    const matchingTrigger = bot.triggers.find(
      (t) => t.is_active && t.trigger_event === event,
    );
    if (!matchingTrigger) {
      results.push({ bot_id: bot.id, triggered: false, actions_executed: 0, errors: [] });
      continue;
    }

    if (!evaluateConditions(matchingTrigger.conditions, context)) {
      results.push({ bot_id: bot.id, triggered: false, actions_executed: 0, errors: [] });
      continue;
    }

    const capPerHour =
      (bot.config?.rate_limit_per_hour as number | undefined) ??
      DEFAULT_RATE_LIMIT_PER_HOUR;
    const rateOk = await checkRateLimit(supabase, bot.id, capPerHour);
    if (!rateOk) {
      await logExecution(supabase, {
        bot_id: bot.id,
        trigger_id: matchingTrigger.id,
        context,
        status: "skipped",
        output: `rate_limit_exceeded (${capPerHour}/h)`,
      });
      results.push({
        bot_id: bot.id,
        triggered: false,
        actions_executed: 0,
        errors: ["rate_limit_exceeded"],
      });
      continue;
    }

    /* Exécute les actions dans l'ordre. */
    const start = Date.now();
    const activeActions = bot.actions
      .filter((a) => a.is_active)
      .sort((a, b) => a.position - b.position);

    const errors: string[] = [];
    let executed = 0;

    for (const action of activeActions) {
      try {
        await runActionHandler(supabase, {
          bot_id: bot.id,
          bot_name: bot.name,
          circle_id: bot.circle_id,
          action_kind: action.action_kind,
          params: action.params,
          context,
        });
        executed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${action.action_kind}: ${message}`);
      }
    }

    const status: CircleBotExecution["status"] =
      errors.length === 0 ? "success" : "failed";

    await logExecution(supabase, {
      bot_id: bot.id,
      trigger_id: matchingTrigger.id,
      context,
      status,
      output: errors.length > 0 ? errors.join("; ") : `${executed} actions`,
      duration_ms: Date.now() - start,
    });

    results.push({
      bot_id: bot.id,
      triggered: true,
      actions_executed: executed,
      errors,
    });
  }

  return results;
}

/* Pour les schedules : appelé par /api/cron/bots toutes les minutes.
 * Compare chaque trigger_schedule avec now() (UTC) et exécute si
 * match. V1 : on supporte juste l'évaluation "now est-il dans la
 * minute du schedule ?" via une lib cron simple. */
export async function executeBotsForSchedule(
  supabase: SupabaseAny,
  now: Date = new Date(),
): Promise<BotEngineResult[]> {
  const { data: triggers } = await supabase
    .from("circle_bot_triggers")
    .select(
      `id, bot_id, trigger_schedule, conditions, is_active,
       bot:circle_bots!circle_bot_triggers_bot_id_fkey(
         id, bot_type, name, circle_id, is_active, config,
         actions:circle_bot_actions(id, action_kind, position, params, is_active)
       )`,
    )
    .eq("trigger_kind", "schedule")
    .eq("is_active", true);

  if (!triggers || triggers.length === 0) return [];

  const results: BotEngineResult[] = [];
  for (const trigger of triggers as unknown as Array<{
    id: string;
    bot_id: string;
    trigger_schedule: string | null;
    conditions: Record<string, unknown>;
    bot: {
      id: string;
      bot_type: string;
      name: string;
      circle_id: string;
      is_active: boolean;
      config: Record<string, unknown>;
      actions: Array<{
        id: string;
        action_kind: string;
        position: number;
        params: Record<string, unknown>;
        is_active: boolean;
      }>;
    } | null;
  }>) {
    if (!trigger.bot || !trigger.bot.is_active) continue;
    if (!trigger.trigger_schedule) continue;
    if (!cronMatchesMinute(trigger.trigger_schedule, now)) continue;

    const bot = trigger.bot;
    const capPerHour =
      (bot.config?.rate_limit_per_hour as number | undefined) ??
      DEFAULT_RATE_LIMIT_PER_HOUR;
    const rateOk = await checkRateLimit(supabase, bot.id, capPerHour);
    if (!rateOk) continue;

    const start = Date.now();
    const errors: string[] = [];
    let executed = 0;

    for (const action of bot.actions
      .filter((a) => a.is_active)
      .sort((a, b) => a.position - b.position)) {
      try {
        await runActionHandler(supabase, {
          bot_id: bot.id,
          bot_name: bot.name,
          circle_id: bot.circle_id,
          action_kind: action.action_kind,
          params: action.params,
          context: { trigger_id: trigger.id, schedule_fired_at: now.toISOString() },
        });
        executed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${action.action_kind}: ${message}`);
      }
    }

    await logExecution(supabase, {
      bot_id: bot.id,
      trigger_id: trigger.id,
      context: { trigger_id: trigger.id, schedule_fired_at: now.toISOString() },
      status: errors.length === 0 ? "success" : "failed",
      output: errors.length > 0 ? errors.join("; ") : `${executed} actions`,
      duration_ms: Date.now() - start,
    });

    results.push({
      bot_id: bot.id,
      triggered: true,
      actions_executed: executed,
      errors,
    });
  }

  return results;
}

/* === Cron expression minimaliste ===
 *
 * V1 supporte 5-field cron : minute hour day_of_month month day_of_week.
 * Match exact ou '*'. Pas de plages (X-Y), pas d'intervalles (*\/N), pas
 * de listes (X,Y).
 *
 * Exemples valides :
 *   '0 18 * * 0'      → dimanche 18h
 *   '*\/15 * * * *'   → toutes les 15 min (NOT SUPPORTED V1, faux)
 *   '0 9 * * 1-5'     → semaine 9h (NOT SUPPORTED V1, plage)
 *
 * V2 : intégrer une lib (cron-parser) pour la full spec. */
export function cronMatchesMinute(expr: string, now: Date): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [m, h, dom, mon, dow] = parts;

  const nowMinute = now.getUTCMinutes();
  const nowHour = now.getUTCHours();
  const nowDom = now.getUTCDate();
  const nowMon = now.getUTCMonth() + 1; // JS: 0-11, cron: 1-12
  const nowDow = now.getUTCDay(); // 0=Sunday

  function matches(field: string, value: number): boolean {
    if (field === "*") return true;
    const num = Number(field);
    return Number.isFinite(num) && num === value;
  }

  return (
    matches(m, nowMinute) &&
    matches(h, nowHour) &&
    matches(dom, nowDom) &&
    matches(mon, nowMon) &&
    matches(dow, nowDow)
  );
}
