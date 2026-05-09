"use client";

import { CheckCircle2, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { MFAEnrollDialog } from "./MFAEnrollDialog";

type Factor = {
  id: string;
  friendly_name: string | null;
  factor_type: string;
  status: string;
  created_at: string;
};

export function MFASection() {
  const confirm = useConfirm();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function reload() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const all = (data?.totp ?? []) as Factor[];
    setFactors(all.filter((f) => f.status === "verified"));
    setLoading(false);
  }

  /* React 19 strict : on défère le reload via queueMicrotask pour que les
     setState à l'intérieur ne tombent pas dans la passe synchrone de
     l'effect (set-state-in-effect). */
  useEffect(() => {
    queueMicrotask(() => {
      void reload();
    });

  }, []);

  async function handleUnenroll(factorId: string) {
    const ok = await confirm({
      title: "Désactiver la 2FA ?",
      description:
        "Ton compte sera moins protégé tant que tu ne réactives pas la double authentification. Tu peux réactiver à tout moment.",
      confirmLabel: "Désactiver",
      variant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        toast.error("Désactivation impossible.");
        return;
      }
      toast.success("2FA désactivée.");
      await reload();
    });
  }

  const isEnabled = factors.length > 0;

  return (
    <>
      <article className="p-5 rounded-2xl border border-line bg-night/[0.02]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {isEnabled ? (
              <ShieldCheck
                className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0"
                aria-hidden
              />
            ) : (
              <ShieldAlert
                className="w-5 h-5 text-gold-deep mt-0.5 shrink-0"
                aria-hidden
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-night">
                Double authentification (TOTP)
              </p>
              <p className="text-xs text-muted mt-0.5">
                {isEnabled
                  ? "Activée. Un code à 6 chiffres est demandé à chaque connexion."
                  : "Pas encore configurée. Recommandée pour protéger ton wallet et tes discussions."}
              </p>
            </div>
          </div>
        </div>

        {isEnabled ? (
          <ul className="mt-4 space-y-2">
            {factors.map((factor) => (
              <li
                key={factor.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white border border-line"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-600 shrink-0"
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-night truncate">
                    {factor.friendly_name ?? "Authentificateur"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnenroll(factor.id)}
                  disabled={pending}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                  Retirer
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4">
          {isEnabled ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOpen(true)}
              disabled={loading}
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
              Ajouter un autre appareil
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setOpen(true)}
              disabled={loading}
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
              Activer la 2FA
            </Button>
          )}
        </div>
      </article>

      <MFAEnrollDialog
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          void reload();
        }}
      />
    </>
  );
}
