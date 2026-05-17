"use client";

import { Link2, Link2Off, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";

type Provider = "google" | "apple" | "facebook" | "github";

type Identity = {
  id: string;
  identity_id?: string;
  user_id: string;
  provider: string;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  identity_data?: { email?: string; name?: string } | null;
};

const PROVIDERS: { id: Provider; label: string; description: string; color: string }[] = [
  {
    id: "google",
    label: "Google",
    description: "Connexion via ton compte Google.",
    color: "bg-[#fef3c7] text-[#92400e]",
  },
  {
    id: "apple",
    label: "Apple",
    description: "Sign in with Apple — pas de pub, pas de tracking.",
    color: "bg-night/[0.06] text-night",
  },
  {
    id: "facebook",
    label: "Facebook",
    description: "Connexion via ton compte Facebook.",
    color: "bg-blue-50 text-blue-700",
  },
];

export function LinkedIdentitiesSection() {
  const confirm = useConfirm();
  const [identities, setIdentities] = useState<Identity[] | null>(null);
  const [pending, startTransition] = useTransition();

  async function reload() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUserIdentities();
    if (error) {
      toast.error("Impossible de charger les identités liées.");
      setIdentities([]);
      return;
    }
    setIdentities((data?.identities ?? []) as Identity[]);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void reload();
    });
  }, []);

  async function handleLink(provider: Provider) {
    startTransition(async () => {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { data, error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback?next=/profile?tab=securite`,
        },
      });
      if (error || !data?.url) {
        toast.error(`Impossible de lier ${provider}.`);
        return;
      }
      window.location.href = data.url;
    });
  }

  async function handleUnlink(identity: Identity) {
    const ok = await confirm({
      title: `Délier ${prettyProvider(identity.provider)} ?`,
      description:
        "Tu ne pourras plus te connecter avec ce fournisseur. Tu pourras le re-lier à tout moment.",
      confirmLabel: "Délier",
      variant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.unlinkIdentity(
        identity as Parameters<typeof supabase.auth.unlinkIdentity>[0],
      );
      if (error) {
        if (/single identity/i.test(error.message)) {
          toast.error(
            "Tu ne peux pas délier ta dernière méthode de connexion. Ajoute un mot de passe ou une autre identité avant.",
          );
        } else {
          toast.error("Impossible de délier cette identité.");
        }
        return;
      }
      toast.success("Identité déliée.");
      await reload();
    });
  }

  if (identities === null) {
    return (
      <section className="p-6 sm:p-8 rounded-3xl bg-white border border-line shadow-soft">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-night/5 flex items-center justify-center">
            <Link2 className="w-4 h-4 text-night" aria-hidden />
          </div>
          <div>
            <h3 className="font-display text-xl text-night">Identités liées</h3>
            <p className="text-sm text-muted">Chargement…</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-muted animate-spin" aria-hidden />
        </div>
      </section>
    );
  }

  const linkedProviders = new Set(
    identities.filter((i) => i.provider !== "email" && i.provider !== "phone").map(
      (i) => i.provider,
    ),
  );
  const hasPassword = identities.some((i) => i.provider === "email");

  return (
    <section className="p-6 sm:p-8 rounded-3xl bg-white border border-line shadow-soft">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-night/5 flex items-center justify-center">
          <Link2 className="w-4 h-4 text-night" aria-hidden />
        </div>
        <div>
          <h3 className="font-display text-xl text-night">Identités liées</h3>
          <p className="text-sm text-muted">
            Connecte-toi avec plusieurs méthodes pour ne jamais être bloqué.
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {PROVIDERS.map((p) => {
          const identity = identities.find((i) => i.provider === p.id);
          const isLinked = Boolean(identity);
          return (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-line bg-night/[0.02]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.color}`}
                >
                  <ProviderInitial provider={p.id} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-night">
                    {p.label}
                    {isLinked ? (
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                        <ShieldCheck className="w-3 h-3" />
                        Liée
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted">
                    {isLinked && identity?.identity_data?.email
                      ? identity.identity_data.email
                      : p.description}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {isLinked && identity ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlink(identity)}
                    disabled={pending || (linkedProviders.size === 1 && !hasPassword)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Link2Off className="w-3.5 h-3.5" aria-hidden />
                    Délier
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleLink(p.id)}
                    disabled={pending}
                  >
                    <Link2 className="w-3.5 h-3.5" aria-hidden />
                    Lier
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {!hasPassword && linkedProviders.size === 1 ? (
        <p className="mt-4 flex items-start gap-2 text-xs text-gold-deep">
          <ShieldOff className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
          Tu n&apos;as qu&apos;une seule méthode de connexion. Ajoute un mot de
          passe ou une autre identité pour pouvoir délier celle-ci.
        </p>
      ) : null}
    </section>
  );
}

function ProviderInitial({ provider }: { provider: Provider }) {
  const letter = provider[0]?.toUpperCase() ?? "?";
  return (
    <span className="text-sm font-extrabold" aria-hidden>
      {letter}
    </span>
  );
}

function prettyProvider(p: string) {
  if (p === "google") return "Google";
  if (p === "apple") return "Apple";
  if (p === "facebook") return "Facebook";
  if (p === "github") return "GitHub";
  return p;
}
