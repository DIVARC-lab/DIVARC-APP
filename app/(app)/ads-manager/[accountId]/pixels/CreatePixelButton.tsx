"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreatePixelButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [domains, setDomains] = useState("");

  function submit() {
    if (name.trim().length < 2) {
      toast.error("Donne un nom au pixel.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/ads/pixels/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad_account_id: accountId,
          name: name.trim(),
          authorized_domains: domains
            .split(/[\s,]+/)
            .map((d) => d.trim())
            .filter(Boolean),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Création impossible.");
        return;
      }
      toast.success("Pixel créé. Copie le snippet JS pour l'installer.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-night text-cream text-[13px] font-semibold hover:bg-night/90"
      >
        <Plus className="w-4 h-4" aria-hidden />
        Nouveau pixel
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-night/40 p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-soft-lg overflow-hidden">
            <header className="px-5 sm:px-6 pt-5 pb-3 border-b border-line">
              <h2 className="text-[16px] font-semibold text-night">
                Nouveau pixel DIVARC
              </h2>
              <p className="text-[12px] text-night-muted mt-1">
                Tu pourras copier le snippet JS et le token Conversions API
                après création.
              </p>
            </header>
            <div className="px-5 sm:px-6 py-5 space-y-4">
              <label className="block">
                <span className="block text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Nom du pixel
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night"
                  placeholder='ex: "Site principal", "Boutique e-commerce"'
                />
              </label>
              <label className="block">
                <span className="block text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Domaines autorisés
                </span>
                <input
                  type="text"
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night"
                  placeholder="monsite.com, blog.monsite.com"
                />
                <p className="text-[10.5px] text-night-muted mt-1">
                  Sépare par virgule ou espace. Le pixel ne fonctionnera que
                  sur ces domaines (anti-fraude).
                </p>
              </label>
            </div>
            <footer className="px-5 sm:px-6 py-4 border-t border-line flex justify-end gap-2 bg-bg-soft/50">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="px-4 py-2 rounded-full text-[13px] font-semibold text-night-muted hover:text-night"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="px-5 py-2 rounded-full bg-night text-cream text-[13px] font-semibold disabled:opacity-50 hover:bg-night/90"
              >
                {pending ? "Création…" : "Créer"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
