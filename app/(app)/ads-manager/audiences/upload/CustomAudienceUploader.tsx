"use client";

import { Upload } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/* CustomAudienceUploader — upload CSV avec hashing SHA-256 client-side.
 *
 * Flow :
 *   1. User sélectionne CSV (1 colonne emails OU phones)
 *   2. Parse côté client → array de strings
 *   3. Normalize (lowercase email, E.164 phone) + hash SHA-256
 *      via Web Crypto API
 *   4. POST /api/ads/audiences/upload avec hashes uniquement
 *   5. Confirmation + redirect vers /audiences (match rate calculé
 *      par cron en arrière-plan)
 */

type Account = {
  id: string;
  name: string;
};

export function CustomAudienceUploader({
  accounts,
}: {
  accounts: Account[];
  userId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [audienceName, setAudienceName] = useState("");
  const [identifierType, setIdentifierType] = useState<"email" | "phone">(
    "email",
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    raw_count: number;
    sample: string[];
  } | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    /* Quick preview — read first chunk pour count + sample. */
    f.text().then((text) => {
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      setPreview({
        raw_count: lines.length,
        sample: lines.slice(0, 3),
      });
    });
  }

  async function submit() {
    if (!accountId) {
      toast.error("Sélectionne un compte publicitaire.");
      return;
    }
    if (audienceName.trim().length < 2) {
      toast.error("Donne un nom à l'audience.");
      return;
    }
    if (!file) {
      toast.error("Sélectionne un fichier CSV.");
      return;
    }

    startTransition(async () => {
      try {
        /* 1. Lire + parser le CSV. */
        const text = await file.text();
        const rawIdentifiers = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (rawIdentifiers.length === 0) {
          toast.error("Le fichier est vide.");
          return;
        }
        if (rawIdentifiers.length > 100_000) {
          toast.error(
            "Maximum 100 000 identifiants par upload. Découpe ton fichier.",
          );
          return;
        }

        /* 2. Normaliser. */
        const normalized = rawIdentifiers
          .map((raw) => {
            if (identifierType === "email") {
              return raw.toLowerCase().trim();
            }
            /* Phone : strip whitespace + parens. Pas de validation E.164
               stricte côté client — on laisse l'annonceur faire le tri. */
            return raw.replace(/[\s\-()]/g, "");
          })
          .filter((s) => {
            if (identifierType === "email") {
              return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
            }
            return /^\+?\d{6,15}$/.test(s);
          });

        if (normalized.length === 0) {
          toast.error("Aucun identifiant valide trouvé après normalisation.");
          return;
        }

        /* 3. Hash SHA-256 via Web Crypto API. Fallback erreur si pas dispo. */
        if (!crypto.subtle) {
          toast.error(
            "Web Crypto API indisponible. Utilise un navigateur moderne en HTTPS.",
          );
          return;
        }

        const encoder = new TextEncoder();
        const hashes: string[] = [];
        for (const id of normalized) {
          const hash = await crypto.subtle.digest(
            "SHA-256",
            encoder.encode(id),
          );
          hashes.push(bytesToHex(new Uint8Array(hash)));
        }

        /* 4. Créer l'audience d'abord. */
        const createRes = await fetch("/api/ads/audiences/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ad_account_id: accountId,
            name: audienceName.trim(),
            type: "custom_list",
          }),
        });
        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({}));
          toast.error(err.error ?? "Impossible de créer l'audience.");
          return;
        }
        const created = (await createRes.json()) as { id: string };

        /* 5. Upload hashes. */
        const uploadRes = await fetch("/api/ads/audiences/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audience_id: created.id,
            identifier_type: identifierType,
            hashes,
          }),
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          toast.error(err.error ?? "Upload échoué.");
          return;
        }
        const result = await uploadRes.json();

        toast.success(
          `Audience créée. ${result.hashes_uploaded} identifiants uploadés. Match rate calculé sous 1h.`,
        );
        router.push("/ads-manager/audiences");
      } catch (err) {
        console.error("[CustomAudienceUploader]", err);
        toast.error("Erreur pendant le hashing ou l'upload.");
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-line p-5 sm:p-6 space-y-4">
      <Field label="Compte publicitaire">
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className={inputCls}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Nom de l'audience">
        <input
          type="text"
          value={audienceName}
          onChange={(e) => setAudienceName(e.target.value)}
          maxLength={100}
          className={inputCls}
          placeholder="ex: Clients premium 2026"
        />
      </Field>

      <Field label="Type d'identifiant">
        <select
          value={identifierType}
          onChange={(e) =>
            setIdentifierType(e.target.value as "email" | "phone")
          }
          className={inputCls}
        >
          <option value="email">Emails</option>
          <option value="phone">Téléphones (E.164 ex +33...)</option>
        </select>
      </Field>

      <Field label="Fichier CSV (1 colonne, 1 identifiant par ligne)">
        <input
          type="file"
          accept=".csv,.txt"
          onChange={onFile}
          className="w-full text-[13px] text-night file:mr-3 file:px-3 file:py-1.5 file:rounded-full file:border-0 file:bg-night file:text-cream file:text-[12px] file:font-semibold"
        />
      </Field>

      {preview ? (
        <div className="rounded-xl bg-bg-soft border border-line p-3 text-[12px]">
          <p className="font-semibold text-night mb-1">
            {preview.raw_count.toLocaleString("fr-FR")} ligne
            {preview.raw_count > 1 ? "s" : ""} détectée
            {preview.raw_count > 1 ? "s" : ""}
          </p>
          <p className="text-night-muted">Échantillon (3 premières) :</p>
          <ul className="font-mono text-[11px] text-night-soft mt-1 space-y-0.5">
            {preview.sample.map((s, i) => (
              <li key={i} className="truncate">
                {s.length > 40 ? `${s.slice(0, 40)}…` : s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={pending || !file}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-night text-cream text-[13px] font-semibold disabled:opacity-50 hover:bg-night/90"
      >
        <Upload className="w-4 h-4" aria-hidden />
        {pending ? "Hashing + upload…" : "Hasher et uploader"}
      </button>
      <p className="text-[11px] text-night-muted">
        Le hashing peut prendre quelques secondes pour 100k identifiants.
      </p>
    </div>
  );
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
