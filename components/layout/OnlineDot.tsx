import { cn } from "@/lib/utils/cn";

/* OnlineDot — petit indicateur "en ligne" 12×12 avec ring 2px ring-bg
 * (contraste sur l'avatar). Pattern Facebook / Instagram standard.
 *
 * Couleur : online green (#4CAF50). C'est un standard universel pour
 * "en ligne" qu'on garde tel quel — la palette DIVARC s'applique
 * partout AILLEURS, mais le green online reste car associé universellement. */

type Props = {
  online: boolean;
  size?: "sm" | "md";
  /** Position du dot relative à l'avatar parent (default bottom-right). */
  className?: string;
};

export function OnlineDot({ online, size = "md", className }: Props) {
  if (!online) return null;
  return (
    <span
      aria-label="En ligne"
      className={cn(
        "absolute rounded-full bg-online ring-2 ring-bg",
        size === "sm" ? "w-2.5 h-2.5 -bottom-0.5 -right-0.5" : "w-3 h-3 -bottom-0.5 -right-0.5",
        className,
      )}
    />
  );
}
