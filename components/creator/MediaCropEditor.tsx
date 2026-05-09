"use client";

import { Crop, Loader2, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

/* MediaCropEditor — crop forcé avant upload (style Instagram).
 *
 * Bibliothèque : react-easy-crop (validé via AskUserQuestion). Le user
 * choisit un ratio standard (1:1, 4:5, 16:9 ou Original), zoom + drag pour
 * cadrer. La sortie est un Blob JPEG via canvas, prêt à être upload sur
 * Supabase Storage.
 *
 * Multi-images dans le même post : le ratio est forcé identique pour
 * toutes les photos (cohérence galerie). Le caller passe `forcedRatio`
 * pour bloquer le sélecteur.
 *
 * Pour les stories : le caller force "9/16" (vertical). */

export type AspectRatio = "1/1" | "4/5" | "16/9" | "9/16" | "original";

export type CropResult = {
  blob: Blob;
  /** Ratio appliqué au final, "1/1" / "4/5" / etc. */
  aspectRatio: string;
  /** Dimensions en pixels du blob généré. */
  width: number;
  height: number;
};

type MediaCropEditorProps = {
  /** Le fichier source à cropper. */
  file: File;
  /** Force un ratio (ne montre pas le sélecteur). Sinon le user choisit. */
  forcedRatio?: AspectRatio;
  /** Set par défaut si pas forcé. */
  defaultRatio?: AspectRatio;
  /** Liste des ratios proposés au user (ignoré si forcedRatio). */
  availableRatios?: AspectRatio[];
  onCancel: () => void;
  onCrop: (result: CropResult) => void;
};

const RATIO_OPTIONS: Record<AspectRatio, { label: string; value: number | undefined }> = {
  "1/1": { label: "Carré (1:1)", value: 1 },
  "4/5": { label: "Portrait (4:5)", value: 4 / 5 },
  "16/9": { label: "Paysage (16:9)", value: 16 / 9 },
  "9/16": { label: "Story (9:16)", value: 9 / 16 },
  /* "original" laisse la valeur undefined → react-easy-crop autorise libre. */
  original: { label: "Original", value: undefined },
};

const DEFAULT_AVAILABLE: AspectRatio[] = ["1/1", "4/5", "16/9", "original"];

export function MediaCropEditor({
  file,
  forcedRatio,
  defaultRatio,
  availableRatios = DEFAULT_AVAILABLE,
  onCancel,
  onCrop,
}: MediaCropEditorProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ratio, setRatio] = useState<AspectRatio>(
    forcedRatio ?? defaultRatio ?? availableRatios[0] ?? "4/5",
  );
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  /* Charge l'image source — `URL.createObjectURL` est SYNCHRO + révoqué au
     unmount pour ne pas leaker. */
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /* react-easy-crop renvoie l'area en pixels ABSOLUS sur l'image originale
     à chaque changement (drag/zoom). On la stocke pour le crop final. */
  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels || !imageUrl) return;
    setProcessing(true);
    try {
      const blob = await renderCroppedBlob(
        imageUrl,
        croppedAreaPixels,
        rotation,
      );
      if (!blob) {
        setProcessing(false);
        return;
      }
      onCrop({
        blob,
        aspectRatio: ratio === "original" ? `${croppedAreaPixels.width}/${croppedAreaPixels.height}` : ratio,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-night text-cream">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Annuler"
          className="w-11 h-11 rounded-full bg-white/10 text-cream hover:bg-white/20 flex items-center justify-center"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
        <h3 className="font-display italic text-lg">Cadrer la photo</h3>
        <button
          type="button"
          onClick={() => setRotation((r) => (r + 90) % 360)}
          aria-label="Rotation 90°"
          className="w-11 h-11 rounded-full bg-white/10 text-cream hover:bg-white/20 flex items-center justify-center"
        >
          <RotateCw className="w-4 h-4" aria-hidden />
        </button>
      </header>

      {/* Cropper canvas */}
      <div className="relative flex-1 min-h-0 bg-black">
        {imageUrl ? (
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={RATIO_OPTIONS[ratio].value}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid
          />
        ) : null}
      </div>

      {/* Controls */}
      <div className="shrink-0 px-4 py-3 space-y-3 border-t border-cream/10">
        {!forcedRatio ? (
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {availableRatios.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setRatio(opt)}
                aria-pressed={ratio === opt}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-bold transition-colors",
                  ratio === opt
                    ? "bg-gold text-night"
                    : "bg-white/10 text-cream hover:bg-white/20",
                )}
              >
                <Crop className="w-3 h-3" aria-hidden />
                {RATIO_OPTIONS[opt].label}
              </button>
            ))}
          </div>
        ) : null}

        <label className="flex items-center gap-3">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-cream/60">
            Zoom
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.currentTarget.value))}
            className="flex-1 accent-gold"
            aria-label="Zoom"
          />
        </label>

        <Button
          type="button"
          onClick={handleConfirm}
          loading={processing}
          disabled={!croppedAreaPixels || processing}
          className="w-full !h-12"
        >
          {processing ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : (
            <Crop className="w-4 h-4" aria-hidden />
          )}
          Valider le cadrage
        </Button>
      </div>
    </div>
  );
}

/* Render le crop final via canvas. Source : pattern officiel react-easy-crop
 * (https://www.npmjs.com/package/react-easy-crop#example) adapté pour
 * supporter la rotation. */
async function renderCroppedBlob(
  imageSrc: string,
  areaPixels: Area,
  rotationDeg: number,
): Promise<Blob | null> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  /* Pour gérer la rotation correctement, on crée un canvas intermédiaire
     de la taille de l'image rotated, on dessine l'image rotated dessus,
     puis on extrait l'area pixels. */
  const rotRad = (rotationDeg * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rotRad));
  const cos = Math.abs(Math.cos(rotRad));
  const rotatedW = image.width * cos + image.height * sin;
  const rotatedH = image.width * sin + image.height * cos;

  const tmp = document.createElement("canvas");
  tmp.width = rotatedW;
  tmp.height = rotatedH;
  const tmpCtx = tmp.getContext("2d");
  if (!tmpCtx) return null;
  tmpCtx.translate(rotatedW / 2, rotatedH / 2);
  tmpCtx.rotate(rotRad);
  tmpCtx.drawImage(image, -image.width / 2, -image.height / 2);

  canvas.width = areaPixels.width;
  canvas.height = areaPixels.height;
  ctx.drawImage(
    tmp,
    areaPixels.x,
    areaPixels.y,
    areaPixels.width,
    areaPixels.height,
    0,
    0,
    areaPixels.width,
    areaPixels.height,
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      "image/jpeg",
      0.92,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
