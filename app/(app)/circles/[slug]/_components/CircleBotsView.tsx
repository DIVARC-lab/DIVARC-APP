"use client";

/* CircleBotsView — page admin gestion des bots du cercle.
 *
 * V1 (Sprint A.3) : focus WelcomeBot. Les autres 5 bot types
 * (moderation, event, reminder, digest, ai_assistant) ont leur
 * card "Activer" mais l'installation est désactivée (V2). */

import {
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  Settings2,
  Shield,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type {
  CircleBotSummary,
  CircleBotType,
} from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import {
  deleteCircleBot,
  installModeratorBot,
  installWelcomeBot,
  toggleCircleBot,
  updateCircleBotConfig,
} from "../bots-actions";

type Props = {
  circleId: string;
  circleSlug: string;
  initialBots: CircleBotSummary[];
};

type BotPreset = {
  type: CircleBotType;
  name: string;
  description: string;
  icon: typeof Bot;
  iconColor: string;
  available: boolean; // V1 ou V2
};

const PRESETS: BotPreset[] = [
  {
    type: "welcome",
    name: "BienvenueBot",
    description:
      "Accueille chaque nouveau membre avec un message personnalisé dans le chat du cercle. Variables : {{name}}, {{circle}}.",
    icon: Sparkles,
    iconColor: "text-gold-deep",
    available: true,
  },
  {
    type: "moderation",
    name: "ModérateurBot",
    description:
      "Détecte automatiquement les messages contenant des mots-clés blacklistés, trop d'URLs, ou en CAPS LOCK. Hide ou flag selon config.",
    icon: Shield,
    iconColor: "text-rose-600",
    available: true,
  },
  {
    type: "event",
    name: "ÉvénementBot",
    description:
      "Envoie des rappels automatiques avant chaque événement (J-7, J-1, H-1, live) dans le chat du cercle.",
    icon: Calendar,
    iconColor: "text-emerald-600",
    available: false,
  },
  {
    type: "reminder",
    name: "RappelBot",
    description:
      "Poste des messages récurrents personnalisés (daily/weekly/monthly) dans le chat. Cas d'usage : standup lundi, feedback vendredi.",
    icon: Clock,
    iconColor: "text-blue-600",
    available: false,
  },
  {
    type: "digest",
    name: "DigestBot",
    description:
      "Résumé hebdomadaire personnalisé pour chaque membre : top posts, nouveaux membres, événements à venir.",
    icon: MessageSquare,
    iconColor: "text-purple-600",
    available: false,
  },
  {
    type: "ai_assistant",
    name: "AssistantBot IA",
    description:
      "Répond aux questions des membres en se basant sur les règles, la bibliothèque et les posts du cercle. Déjà disponible via l'onglet Assistant IA.",
    icon: Bot,
    iconColor: "text-gold-deep",
    available: false,
  },
];

export function CircleBotsView({
  circleId,
  circleSlug,
  initialBots,
}: Props) {
  const [bots, setBots] = useState(initialBots);
  const [configuringBot, setConfiguringBot] = useState<CircleBotSummary | null>(null);
  const [installingType, setInstallingType] = useState<CircleBotType | null>(null);
  const [pending, startTransition] = useTransition();

  const installedTypes = new Set(bots.map((b) => b.bot_type));

  const totalActions = bots.reduce(
    (sum, b) => sum + b.actions_executed_count,
    0,
  );

  function handleInstall(type: CircleBotType, template?: string) {
    if (type === "welcome") {
      startTransition(async () => {
        const res = await installWelcomeBot({
          circleId,
          circleSlug,
          template:
            template ??
            "Bienvenue {{name}} dans {{circle}} 👋 N'hésite pas à te présenter !",
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("BienvenueBot activé ✓");
        window.location.reload();
      });
      return;
    }
    if (type === "moderation") {
      /* L'install moderation passe par un modal séparé avec config
         spécifique (blacklist, etc.). On ouvre directement. */
      return;
    }
    toast("Ce bot sera disponible bientôt (V2)");
  }

  function handleInstallModeration(args: {
    blacklist: string[];
    maxUrls?: number;
    capsThreshold?: number;
    autoAction: "hide_content" | "flag_for_review";
  }) {
    startTransition(async () => {
      const res = await installModeratorBot({
        circleId,
        circleSlug,
        blacklist: args.blacklist,
        maxUrls: args.maxUrls,
        capsThreshold: args.capsThreshold,
        autoAction: args.autoAction,
        whitelistRoles: ["owner", "admin", "moderator", "mod"],
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("ModérateurBot activé ✓");
      window.location.reload();
    });
  }

  function handleToggle(bot: CircleBotSummary) {
    setBots((prev) =>
      prev.map((b) => (b.id === bot.id ? { ...b, is_active: !b.is_active } : b)),
    );
    startTransition(async () => {
      const res = await toggleCircleBot({
        botId: bot.id,
        circleSlug,
        isActive: !bot.is_active,
      });
      if (!res.ok) {
        toast.error(res.error);
        setBots((prev) =>
          prev.map((b) => (b.id === bot.id ? { ...b, is_active: bot.is_active } : b)),
        );
      }
    });
  }

  function handleDelete(bot: CircleBotSummary) {
    if (!confirm(`Supprimer ${bot.name} ?`)) return;
    setBots((prev) => prev.filter((b) => b.id !== bot.id));
    startTransition(async () => {
      const res = await deleteCircleBot({ botId: bot.id, circleSlug });
      if (!res.ok) {
        toast.error(res.error);
        setBots((prev) => [...prev, bot]);
      } else {
        toast.success("Bot supprimé");
      }
    });
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="font-display italic text-2xl sm:text-3xl text-night flex items-center gap-2">
          <Bot className="w-6 h-6 text-gold-deep" aria-hidden />
          Bots du cercle
        </h1>
        <p className="text-[12.5px] text-night-muted mt-1 max-w-lg">
          Automatise intelligemment ton cercle. 6 bots préconfigurés pour
          accueil, modération, rappels et plus.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-line rounded-2xl p-4">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-muted mb-1">
            Bots actifs
          </div>
          <div className="text-2xl font-extrabold text-night tabular-nums">
            {bots.filter((b) => b.is_active).length}
          </div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-muted mb-1">
            Actions exécutées
          </div>
          <div className="text-2xl font-extrabold text-gold-deep tabular-nums">
            {totalActions}
          </div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-muted mb-1">
            Types disponibles
          </div>
          <div className="text-2xl font-extrabold text-night tabular-nums">
            {PRESETS.filter((p) => p.available).length}
            <span className="text-sm text-night-muted">
              {" "}
              / {PRESETS.length}
            </span>
          </div>
        </div>
      </div>

      {/* Bots installés */}
      {bots.length > 0 ? (
        <section>
          <h2 className="text-sm font-bold text-night uppercase tracking-wider mb-3">
            Installés ({bots.length})
          </h2>
          <div className="space-y-2">
            {bots.map((bot) => {
              const preset = PRESETS.find((p) => p.type === bot.bot_type);
              const Icon = preset?.icon ?? Bot;
              return (
                <div
                  key={bot.id}
                  className={cn(
                    "bg-white border rounded-2xl p-4 flex items-start gap-3",
                    bot.is_active ? "border-line" : "border-line opacity-60",
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl bg-night/5 flex items-center justify-center shrink-0",
                      preset?.iconColor,
                    )}
                  >
                    <Icon className="w-5 h-5" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[14px] font-bold text-night">
                        {bot.name}
                      </h3>
                      {bot.is_active ? (
                        <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded-full bg-emerald-500/15 text-emerald-700 text-[9px] font-extrabold uppercase tracking-[0.08em]">
                          <CheckCircle2 className="w-2.5 h-2.5" aria-hidden />
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-night/10 text-night-muted text-[9px] font-extrabold uppercase tracking-[0.08em]">
                          Inactif
                        </span>
                      )}
                    </div>
                    {bot.description ? (
                      <p className="text-[11.5px] text-night-muted line-clamp-2 leading-relaxed">
                        {bot.description}
                      </p>
                    ) : null}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-night-muted">
                      <span>{bot.actions_executed_count} actions</span>
                      <span>{bot.triggers_count} triggers</span>
                      <span>{bot.actions_count} actions configurées</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggle(bot)}
                      disabled={pending}
                      aria-label={bot.is_active ? "Désactiver" : "Activer"}
                      className={cn(
                        "h-7 px-2.5 rounded-full text-[10px] font-bold",
                        bot.is_active
                          ? "bg-night text-cream hover:bg-night-soft"
                          : "bg-emerald-500 text-white hover:bg-emerald-600",
                      )}
                    >
                      {bot.is_active ? "Désactiver" : "Activer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfiguringBot(bot)}
                      aria-label="Configurer"
                      className="h-7 px-2.5 rounded-full bg-night/5 hover:bg-night/10 text-night-muted text-[10px] font-bold inline-flex items-center gap-1"
                    >
                      <Settings2 className="w-3 h-3" aria-hidden />
                      Config
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(bot)}
                      aria-label="Supprimer"
                      className="h-7 px-2.5 rounded-full hover:bg-rose-50 text-rose-500 text-[10px] font-bold inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" aria-hidden />
                      Suppr
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Bots disponibles à installer */}
      <section>
        <h2 className="text-sm font-bold text-night uppercase tracking-wider mb-3">
          Disponibles
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRESETS.filter((p) => !installedTypes.has(p.type)).map((preset) => {
            const Icon = preset.icon;
            return (
              <div
                key={preset.type}
                className={cn(
                  "bg-white border rounded-2xl p-4 flex flex-col gap-2",
                  preset.available
                    ? "border-line hover:border-night/30"
                    : "border-line opacity-60",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl bg-night/5 flex items-center justify-center shrink-0",
                      preset.iconColor,
                    )}
                  >
                    <Icon className="w-5 h-5" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[14px] font-bold text-night">
                        {preset.name}
                      </h3>
                      {!preset.available ? (
                        <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-night/10 text-night-muted text-[9px] font-extrabold uppercase tracking-[0.08em]">
                          Bientôt
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11.5px] text-night-muted leading-relaxed line-clamp-3">
                      {preset.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (preset.available) {
                      setInstallingType(preset.type);
                    } else {
                      toast("Ce bot sera disponible bientôt (V2)");
                    }
                  }}
                  disabled={!preset.available || pending}
                  className={cn(
                    "h-9 rounded-full text-[12px] font-bold transition-colors",
                    preset.available
                      ? "bg-gold text-night hover:bg-gold-soft"
                      : "bg-night/5 text-night-muted cursor-not-allowed",
                  )}
                >
                  {preset.available ? "Installer" : "Bientôt"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Install Welcome Bot Modal */}
      {installingType === "welcome" ? (
        <InstallWelcomeModal
          onCancel={() => setInstallingType(null)}
          onConfirm={(template) => {
            handleInstall("welcome", template);
            setInstallingType(null);
          }}
          pending={pending}
        />
      ) : null}

      {/* Install Moderator Bot Modal */}
      {installingType === "moderation" ? (
        <InstallModerationModal
          onCancel={() => setInstallingType(null)}
          onConfirm={(args) => {
            handleInstallModeration(args);
            setInstallingType(null);
          }}
          pending={pending}
        />
      ) : null}

      {/* Config existing bot */}
      {configuringBot ? (
        <ConfigureBotModal
          bot={configuringBot}
          circleSlug={circleSlug}
          onClose={() => setConfiguringBot(null)}
          onUpdated={(updated) => {
            setBots((prev) =>
              prev.map((b) => (b.id === updated.id ? updated : b)),
            );
            setConfiguringBot(null);
          }}
        />
      ) : null}
    </div>
  );
}

function InstallWelcomeModal({
  onCancel,
  onConfirm,
  pending,
}: {
  onCancel: () => void;
  onConfirm: (template: string) => void;
  pending: boolean;
}) {
  const [template, setTemplate] = useState(
    "Bienvenue {{name}} dans {{circle}} 👋 N'hésite pas à te présenter !",
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Configurer BienvenueBot"
      className="fixed inset-0 z-50 bg-night/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-lg bg-bg rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-display italic text-xl text-night">
            BienvenueBot
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <p className="text-[12px] text-night-muted leading-relaxed mb-4">
          Personnalise le message qui sera posté automatiquement dans le
          chat à chaque nouvelle adhésion. Variables disponibles :
          <code className="ml-1 px-1.5 py-0.5 rounded bg-night/5 text-[11px]">
            {"{{name}}"}
          </code>
          ,{" "}
          <code className="px-1.5 py-0.5 rounded bg-night/5 text-[11px]">
            {"{{circle}}"}
          </code>
          ,{" "}
          <code className="px-1.5 py-0.5 rounded bg-night/5 text-[11px]">
            {"{{date}}"}
          </code>
          .
        </p>

        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-night-muted mb-1">
            Message d&apos;accueil
          </span>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px] resize-y focus:outline-none focus:ring-2 focus:ring-gold/30"
          />
        </label>

        <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 mt-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-muted mb-1">
            Aperçu
          </p>
          <p className="text-[13px] text-night italic">
            {template
              .replace(/\{\{name\}\}/g, "Marc")
              .replace(/\{\{circle\}\}/g, "Tech FR")
              .replace(/\{\{date\}\}/g, new Date().toLocaleDateString("fr-FR"))}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 rounded-full bg-night/5 text-night font-bold text-[13px]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onConfirm(template)}
            disabled={pending}
            className="flex-1 h-10 rounded-full bg-gold text-night font-bold text-[13px] disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="w-4 h-4 mx-auto animate-spin" aria-hidden />
            ) : (
              "Activer"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigureBotModal({
  bot,
  circleSlug,
  onClose,
  onUpdated,
}: {
  bot: CircleBotSummary;
  circleSlug: string;
  onClose: () => void;
  onUpdated: (bot: CircleBotSummary) => void;
}) {
  const [template, setTemplate] = useState(
    typeof bot.config?.template === "string"
      ? (bot.config.template as string)
      : "",
  );
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await updateCircleBotConfig({
        botId: bot.id,
        circleSlug,
        config: { ...bot.config, template },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Configuration enregistrée");
      onUpdated({ ...bot, config: { ...bot.config, template } });
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Configurer ${bot.name}`}
      className="fixed inset-0 z-50 bg-night/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-bg rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-display italic text-xl text-night">
            Configurer {bot.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        {bot.bot_type === "welcome" ? (
          <>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-night-muted mb-1">
                Message d&apos;accueil
              </span>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={4}
                maxLength={2000}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px] resize-y focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
            </label>
            <p className="text-[11px] text-night-muted mt-2">
              Variables :{" "}
              <code className="px-1 py-0.5 rounded bg-night/5">
                {"{{name}}"}
              </code>
              ,{" "}
              <code className="px-1 py-0.5 rounded bg-night/5">
                {"{{circle}}"}
              </code>
            </p>
          </>
        ) : (
          <p className="text-[13px] text-night-muted">
            Configuration avancée bientôt disponible.
          </p>
        )}

        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-full bg-night/5 text-night font-bold text-[13px]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="flex-1 h-10 rounded-full bg-gold text-night font-bold text-[13px] disabled:opacity-50"
          >
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InstallModerationModal({
  onCancel,
  onConfirm,
  pending,
}: {
  onCancel: () => void;
  onConfirm: (args: {
    blacklist: string[];
    maxUrls?: number;
    capsThreshold?: number;
    autoAction: "hide_content" | "flag_for_review";
  }) => void;
  pending: boolean;
}) {
  const [blacklistRaw, setBlacklistRaw] = useState(
    "spam, scam, arnaque, crypto-pump, viagra",
  );
  const [maxUrls, setMaxUrls] = useState("3");
  const [capsThreshold, setCapsThreshold] = useState("80");
  const [autoAction, setAutoAction] = useState<"hide_content" | "flag_for_review">(
    "hide_content",
  );

  function submit() {
    const blacklist = blacklistRaw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);
    const maxUrlsNum = maxUrls.trim() === "" ? undefined : Number(maxUrls);
    const capsNum = capsThreshold.trim() === "" ? undefined : Number(capsThreshold);

    onConfirm({
      blacklist,
      maxUrls:
        typeof maxUrlsNum === "number" && !Number.isNaN(maxUrlsNum)
          ? maxUrlsNum
          : undefined,
      capsThreshold:
        typeof capsNum === "number" && !Number.isNaN(capsNum) ? capsNum : undefined,
      autoAction,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Configurer ModérateurBot"
      className="fixed inset-0 z-50 bg-night/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-lg bg-bg rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-display italic text-xl text-night flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-600" aria-hidden />
            ModérateurBot
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <p className="text-[12px] text-night-muted leading-relaxed mb-4">
          Le bot scanne chaque message du chat et déclenche l&apos;action
          configurée si une règle matche. Les rôles owner/admin/modérateur
          sont automatiquement exemptés.
        </p>

        <div className="space-y-4">
          <ModField
            label="Mots-clés blacklistés"
            hint="Séparés par virgules. Le message contient au moins un de ces mots → trigger fire."
          >
            <textarea
              value={blacklistRaw}
              onChange={(e) => setBlacklistRaw(e.target.value)}
              rows={3}
              placeholder="spam, scam, crypto-pump"
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px] resize-y"
            />
          </ModField>

          <div className="grid grid-cols-2 gap-3">
            <ModField label="Max URLs / message" hint="Trigger si > N URLs">
              <input
                type="number"
                min={0}
                max={20}
                value={maxUrls}
                onChange={(e) => setMaxUrls(e.target.value)}
                placeholder="3"
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px]"
              />
            </ModField>
            <ModField label="Seuil caps (%)" hint="Trigger si > N% de CAPS">
              <input
                type="number"
                min={0}
                max={100}
                value={capsThreshold}
                onChange={(e) => setCapsThreshold(e.target.value)}
                placeholder="80"
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px]"
              />
            </ModField>
          </div>

          <ModField label="Action automatique">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAutoAction("hide_content")}
                className={cn(
                  "flex-1 h-10 rounded-xl text-[12px] font-bold transition-colors",
                  autoAction === "hide_content"
                    ? "bg-rose-500 text-white"
                    : "bg-white border border-line text-night-muted hover:border-night/30",
                )}
              >
                Masquer auto
              </button>
              <button
                type="button"
                onClick={() => setAutoAction("flag_for_review")}
                className={cn(
                  "flex-1 h-10 rounded-xl text-[12px] font-bold transition-colors",
                  autoAction === "flag_for_review"
                    ? "bg-night text-cream"
                    : "bg-white border border-line text-night-muted hover:border-night/30",
                )}
              >
                Signaler modos
              </button>
            </div>
          </ModField>
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 rounded-full bg-night/5 text-night font-bold text-[13px]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="flex-1 h-10 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-[13px] disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="w-4 h-4 mx-auto animate-spin" aria-hidden />
            ) : (
              "Activer"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-night-muted mb-1">
        {label}
      </span>
      {children}
      {hint ? (
        <p className="mt-1 text-[10px] text-night-muted/80 leading-relaxed">{hint}</p>
      ) : null}
    </label>
  );
}
