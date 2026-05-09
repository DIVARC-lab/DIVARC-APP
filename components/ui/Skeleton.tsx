import { cn } from "@/lib/utils/cn";

type SkeletonProps = {
  className?: string;
  /* Forme : `rect` (rectangle), `circle`, ou `text` (line). Défaut rect. */
  shape?: "rect" | "circle" | "text";
};

/* Skeleton placeholder cohérent avec la grammaire Bold : background gradient
 * cream → bg-soft, animation pulse subtile. Réutilisable dans tous les
 * loading.tsx Next.js. */
export function Skeleton({ className, shape = "rect" }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "bg-gradient-to-br from-cream via-bg-soft to-cream/60 animate-pulse",
        shape === "circle" && "rounded-full",
        shape === "text" && "rounded-md h-3",
        shape === "rect" && "rounded-2xl",
        className,
      )}
    />
  );
}
