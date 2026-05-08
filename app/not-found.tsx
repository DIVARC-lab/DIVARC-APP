import { Compass, Home } from "lucide-react";
import Link from "next/link";
import { ArcMark } from "@/components/marketing/ArcMark";
import { Button } from "@/components/ui/Button";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata = {
  title: "Page introuvable",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="px-6 sm:px-10 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night"
        >
          <Home className="w-4 h-4" aria-hidden />
          DIVARC
        </Link>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 text-center relative">
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none"
        >
          <ArcMark size={340} animate={false} />
        </div>

        <div className="relative font-display text-[140px] sm:text-[180px] leading-[0.85] text-night tracking-[-0.04em]">
          4<span className="text-gold-deep">0</span>4
        </div>
        <div className="mt-6 relative">
          <KickerLabel>Introuvable</KickerLabel>
        </div>
        <h1 className="mt-2 font-display italic text-2xl sm:text-3xl text-night leading-[1.15] text-balance relative">
          Cette page a pris une{" "}
          <span className="text-gold-deep">autre direction</span>.
        </h1>
        <p className="mt-3 text-muted-strong leading-relaxed max-w-md relative">
          Le contenu a été supprimé, déplacé, ou n&apos;a jamais existé.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 relative">
          <Button asChild size="lg">
            <Link href="/">
              <Home className="w-4 h-4" aria-hidden />
              Retour à l&apos;accueil
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/explore">
              <Compass className="w-4 h-4" aria-hidden />
              Explorer
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
