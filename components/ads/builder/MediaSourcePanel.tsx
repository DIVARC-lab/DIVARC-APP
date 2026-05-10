"use client";

import {
  AlertCircle,
  Camera,
  Crop,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

/* MediaSourcePanel — sélecteur de visuel multi-source.
 *
 * 4 sources :
 *   A. URL directe (V1 hosted ailleurs)
 *   B. Stock (Pexels + Unsplash via /api/ads/creative/stock-search)
 *   C. Génération IA (Replicate SDXL via /api/ads/creative/ai-generate)
 *   D. Upload — V2 (placeholder pour Supabase Storage)
 *
 * + un MediaCropper modal pour ajuster le ratio par placement.
 *   Ratios supportés : 1:1, 4:5, 9:16, 16:9.
 */

type StockPhoto = {
  id: string;
  url: string;
  thumb: string;
  photographer: string;
  source: "pexels" | "unsplash";
  width: number;
  height: number;
};

type SourceTab = "url" | "stock" | "ai" | "upload";

type Ratio = "1:1" | "4:5" | "9:16" | "16:9";

const RATIO_VALUES: Record<Ratio, number> = {
  "1:1": 1,
  "4:5": 4 / 5,
  "9:16": 9 / 16,
  "16:9": 16 / 9,
};

type Props = {
  accountId: string;
  mediaUrl: string;
  onMediaUrlChange: (next: string) => void;
  /* Optional pré-prompt depuis Website Analyzer. */
  initialPromptHint?: string;
};

export function MediaSourcePanel({
  accountId,
  mediaUrl,
  onMediaUrlChange,
  initialPromptHint,
}: Props) {
  const [tab, setTab] = useState<SourceTab>(mediaUrl ? "url" : "stock");
  const [ratio, setRatio] = useState<Ratio>("1:1");
  const [cropperOpen, setCropperOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* === Tabs === */}
      <div className="flex items-center gap-1 rounded-full border border-line bg-white p-0.5 w-full overflow-x-auto">
        <TabBtn active={tab === "stock"} onClick={() => setTab("stock")}>
          <Camera className="w-[12px] h-[12px]" aria-hidden />
          Stock photos
        </TabBtn>
        <TabBtn active={tab === "ai"} onClick={() => setTab("ai")}>
          <Sparkles className="w-[12px] h-[12px]" aria-hidden />
          Génération IA
        </TabBtn>
        <TabBtn active={tab === "url"} onClick={() => setTab("url")}>
          <Link2 className="w-[12px] h-[12px]" aria-hidden />
          URL
        </TabBtn>
        <TabBtn active={tab === "upload"} onClick={() => setTab("upload")}>
          <Upload className="w-[12px] h-[12px]" aria-hidden />
          Upload
        </TabBtn>
      </div>

      {/* === Tab content === */}
      {tab === "url" ? (
        <UrlTab mediaUrl={mediaUrl} onMediaUrlChange={onMediaUrlChange} />
      ) : null}
      {tab === "stock" ? (
        <StockTab onPick={onMediaUrlChange} initialQuery={initialPromptHint} />
      ) : null}
      {tab === "ai" ? (
        <AITab
          accountId={accountId}
          onPick={onMediaUrlChange}
          initialPrompt={initialPromptHint}
        />
      ) : null}
      {tab === "upload" ? <UploadTab /> : null}

      {/* === Selected preview + ratio + cropper === */}
      {mediaUrl ? (
        <div className="rounded-2xl bg-white border border-line p-3 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-night-muted">
              Visuel sélectionné
            </p>
            <button
              type="button"
              onClick={() => onMediaUrlChange("")}
              className="text-[10.5px] text-night-muted hover:text-red-600 inline-flex items-center gap-0.5"
            >
              <X className="w-[11px] h-[11px]" aria-hidden />
              Retirer
            </button>
          </div>
          <div className="relative w-full max-w-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl}
              alt="Visuel sélectionné"
              className="w-full rounded-lg border border-line object-cover"
              style={{ aspectRatio: ratio.replace(":", "/") }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-night-muted">
              Ratio
            </span>
            <div className="inline-flex items-center gap-1 rounded-full border border-line bg-white p-0.5">
              {(Object.keys(RATIO_VALUES) as Ratio[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRatio(r)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    ratio === r
                      ? "bg-night text-cream"
                      : "text-night-muted hover:bg-bg-soft"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCropperOpen(true)}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-night text-cream text-[11px] font-bold"
            >
              <Crop className="w-[11px] h-[11px]" aria-hidden />
              Recadrer
            </button>
          </div>
        </div>
      ) : null}

      {/* === Cropper modal === */}
      {cropperOpen ? (
        <CropperModal
          imageUrl={mediaUrl}
          ratio={RATIO_VALUES[ratio]}
          onCancel={() => setCropperOpen(false)}
          onApply={(croppedDataUrl) => {
            onMediaUrlChange(croppedDataUrl);
            setCropperOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap ${
        active
          ? "bg-night text-cream"
          : "text-night-muted hover:bg-bg-soft"
      }`}
    >
      {children}
    </button>
  );
}

/* ============================================================
 * Tab A — URL directe
 * ============================================================ */

function UrlTab({
  mediaUrl,
  onMediaUrlChange,
}: {
  mediaUrl: string;
  onMediaUrlChange: (next: string) => void;
}) {
  return (
    <div className="space-y-1">
      <input
        type="url"
        value={mediaUrl.startsWith("data:") ? "" : mediaUrl}
        onChange={(e) => onMediaUrlChange(e.target.value)}
        placeholder="https://… (image ou vidéo hébergée)"
        className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[13px]"
      />
      <p className="text-[10.5px] text-night-muted">
        Colle une URL d&apos;image hébergée (CDN, Cloudinary, S3…). V2 :
        upload direct via Supabase Storage.
      </p>
    </div>
  );
}

/* ============================================================
 * Tab B — Stock photos (Pexels + Unsplash)
 * ============================================================ */

function StockTab({
  onPick,
  initialQuery,
}: {
  onPick: (url: string) => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [photos, setPhotos] = useState<StockPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/ads/creative/stock-search?q=${encodeURIComponent(query)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setError("Recherche impossible.");
        return;
      }
      const json = (await res.json()) as { photos?: StockPhoto[] };
      setPhotos(json.photos ?? []);
      if ((json.photos ?? []).length === 0) {
        setError(
          "Aucun résultat. Astuce : essaie en anglais (ex: « coffee », « lifestyle »).",
        );
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-night-muted"
            aria-hidden
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search();
              }
            }}
            placeholder="ex: produit, coffee, fashion…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-line bg-white text-[13px]"
          />
        </div>
        <button
          type="button"
          onClick={search}
          disabled={loading || query.trim().length < 2}
          className="px-4 py-2 rounded-lg bg-night text-cream text-[12px] font-bold disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="w-[14px] h-[14px] animate-spin" aria-hidden />
          ) : (
            "Chercher"
          )}
        </button>
      </div>

      {error ? (
        <p className="text-[11.5px] text-night-muted px-1">{error}</p>
      ) : null}

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p.url)}
              className="relative group rounded-lg overflow-hidden border border-line hover:border-night/40 aspect-square"
              aria-label={`Photo de ${p.photographer}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumb}
                alt={`Photo de ${p.photographer}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[9px] px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {p.photographer} · {p.source}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-[10px] text-night-muted px-1 inline-flex items-center gap-1">
        <ExternalLink className="w-[10px] h-[10px]" aria-hidden />
        Photos libres de droits via Pexels &amp; Unsplash. Crédit
        photographe affiché sur l&apos;ad si requis.
      </p>
    </div>
  );
}

/* ============================================================
 * Tab C — IA (Replicate SDXL)
 * ============================================================ */

function AITab({
  accountId,
  onPick,
  initialPrompt,
}: {
  accountId: string;
  onPick: (url: string) => void;
  initialPrompt?: string;
}) {
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [style, setStyle] = useState<
    "photo" | "illustration" | "lifestyle" | "bold" | "minimalist"
  >("photo");
  const [ratio, setRatio] = useState<Ratio>("1:1");
  const [count, setCount] = useState<2 | 4>(2);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (prompt.trim().length < 3) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ads/creative/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad_account_id: accountId,
          prompt: prompt.trim(),
          style,
          ratio,
          count,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        images?: string[];
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Génération impossible.");
        return;
      }
      setResults(json.images ?? []);
      if ((json.images ?? []).length === 0) {
        setError("Aucune image générée. Essaie un prompt plus précis.");
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setGenerating(false);
    }
  }, [accountId, prompt, style, ratio, count]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1">
          Prompt (anglais recommandé)
        </label>
        <textarea
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={400}
          placeholder="ex: a steaming cup of coffee on a wooden table, morning light through window"
          className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[13px]"
        />
        <p className="text-[10px] text-night-muted text-right">
          {prompt.length} / 400
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Field label="Style">
          <select
            value={style}
            onChange={(e) =>
              setStyle(e.target.value as typeof style)
            }
            className="w-full px-2 py-1.5 rounded-lg border border-line bg-white text-[12px]"
          >
            <option value="photo">Photo studio</option>
            <option value="lifestyle">Lifestyle</option>
            <option value="illustration">Illustration</option>
            <option value="bold">Bold &amp; vivid</option>
            <option value="minimalist">Minimaliste</option>
          </select>
        </Field>
        <Field label="Ratio">
          <select
            value={ratio}
            onChange={(e) => setRatio(e.target.value as Ratio)}
            className="w-full px-2 py-1.5 rounded-lg border border-line bg-white text-[12px]"
          >
            <option value="1:1">1:1 carré</option>
            <option value="4:5">4:5 portrait</option>
            <option value="9:16">9:16 stories</option>
            <option value="16:9">16:9 horizontal</option>
          </select>
        </Field>
        <Field label="Nombre">
          <select
            value={count}
            onChange={(e) =>
              setCount(Number(e.target.value) as 2 | 4)
            }
            className="w-full px-2 py-1.5 rounded-lg border border-line bg-white text-[12px]"
          >
            <option value={2}>2 images</option>
            <option value={4}>4 images</option>
          </select>
        </Field>
        <button
          type="button"
          onClick={generate}
          disabled={generating || prompt.trim().length < 3}
          className="self-end px-3 py-1.5 rounded-lg bg-night text-cream text-[12px] font-bold disabled:opacity-40"
        >
          {generating ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="w-[12px] h-[12px] animate-spin" aria-hidden />
              {count === 4 ? "~50s" : "~30s"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Sparkles className="w-[12px] h-[12px]" aria-hidden />
              Générer
            </span>
          )}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11.5px] text-amber-900 inline-flex items-start gap-1.5">
          <AlertCircle className="w-[12px] h-[12px] mt-0.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {results.map((src, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onPick(src)}
              className="relative rounded-lg overflow-hidden border border-line hover:border-night/40"
              aria-label={`Sélectionner image ${idx + 1}`}
              style={{ aspectRatio: ratio.replace(":", "/") }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Génération ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-[10px] text-night-muted leading-snug">
        Génération via Stable Diffusion XL · ~$0.005 / image · pas de
        textes/logos générés (interdits sur les ads pour conformité). Tu
        pourras ajouter ton CTA / titre dans le composant suivant.
      </p>
    </div>
  );
}

/* ============================================================
 * Tab D — Upload (V2 placeholder)
 * ============================================================ */

function UploadTab() {
  return (
    <div className="rounded-xl bg-bg-soft border border-line p-4 text-center">
      <Upload
        className="w-[24px] h-[24px] text-night-muted mx-auto mb-2"
        aria-hidden
      />
      <p className="text-[12.5px] font-semibold text-night mb-1">
        Upload direct — V2
      </p>
      <p className="text-[11px] text-night-muted leading-snug">
        L&apos;upload via Supabase Storage arrive dans la prochaine
        release. Pour V1, utilise Stock, IA, ou colle une URL.
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-night-muted mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ============================================================
 * Cropper modal — react-easy-crop
 * ============================================================ */

function CropperModal({
  imageUrl,
  ratio,
  onCancel,
  onApply,
}: {
  imageUrl: string;
  ratio: number;
  onCancel: () => void;
  onApply: (dataUrl: string) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);

  const apply = useCallback(async () => {
    if (!cropArea) return;
    setApplying(true);
    try {
      const dataUrl = await getCroppedDataUrl(
        imageUrl,
        cropArea,
        rotation,
      );
      onApply(dataUrl);
    } catch (err) {
      console.error("[ads:cropper]", err);
    } finally {
      setApplying(false);
    }
  }, [imageUrl, cropArea, rotation, onApply]);

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-cream rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <header className="flex items-center justify-between px-4 py-3 border-b border-line">
          <p className="text-[14px] font-bold text-night flex items-center gap-1.5">
            <Crop className="w-[14px] h-[14px] text-gold-deep" aria-hidden />
            Recadrer le visuel
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="text-night-muted hover:text-night"
            aria-label="Fermer"
          >
            <X className="w-[16px] h-[16px]" aria-hidden />
          </button>
        </header>

        <div className="relative bg-night/90 h-[400px]">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={ratio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={(_, area) => setCropArea(area)}
          />
        </div>

        <div className="px-4 py-3 border-t border-line space-y-3">
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1">
              Zoom ({zoom.toFixed(1)}×)
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-night"
            />
          </div>
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1">
              Rotation ({rotation}°)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1 accent-night"
              />
              <button
                type="button"
                onClick={() => setRotation(0)}
                className="text-night-muted hover:text-night"
                aria-label="Réinitialiser rotation"
              >
                <RefreshCw className="w-[12px] h-[12px]" aria-hidden />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-full text-[12px] text-night-muted hover:bg-bg-soft"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!cropArea || applying}
              className="px-4 py-2 rounded-full bg-night text-cream text-[12px] font-bold disabled:opacity-40 inline-flex items-center gap-1"
            >
              {applying ? (
                <Loader2 className="w-[12px] h-[12px] animate-spin" aria-hidden />
              ) : (
                <ImageIcon className="w-[12px] h-[12px]" aria-hidden />
              )}
              Appliquer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

async function getCroppedDataUrl(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number,
): Promise<string> {
  const img = await loadImage(imageSrc);
  const radians = (rotation * Math.PI) / 180;
  /* Calcule la bounding box de l'image rotated. */
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const bBoxW = img.width * cos + img.height * sin;
  const bBoxH = img.width * sin + img.height * cos;

  const canvas = document.createElement("canvas");
  canvas.width = bBoxW;
  canvas.height = bBoxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context indisponible");

  ctx.translate(bBoxW / 2, bBoxH / 2);
  ctx.rotate(radians);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  /* Extrait la zone croppée. */
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
  );
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(data, 0, 0);

  return canvas.toDataURL("image/jpeg", 0.92);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}
