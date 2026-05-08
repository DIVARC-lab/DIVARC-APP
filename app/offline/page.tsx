import { Home, RotateCcw, WifiOff } from "lucide-react";
import Link from "next/link";
import { ArcMark } from "@/components/marketing/ArcMark";
import { Button } from "@/components/ui/Button";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata = {
  title: "Hors ligne",
};

/** Page servie par le service worker quand la connexion est down et
 *  qu'aucune version cache n'est disponible pour l'URL demandée. */
export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-night text-cream relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -right-32 top-16 opacity-25 pointer-events-none"
      >
        <ArcMark size={500} animate={false} />
      </div>

      <div className="relative max-w-xl mx-auto px-6 sm:px-10 pt-24 pb-12 text-center">
        <div className="w-24 h-24 mx-auto rounded-full bg-cream/[0.06] border border-gold/30 flex items-center justify-center relative">
          <WifiOff className="w-11 h-11 text-gold" aria-hidden />
          <span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: "inset 0 0 0 1px rgba(244,185,66,0.18)",
            }}
          />
        </div>

        <div className="mt-8">
          <KickerLabel className="!text-gold">Hors ligne</KickerLabel>
        </div>
        <h1 className="mt-2 font-display italic text-4xl sm:text-[42px] leading-[1.05] tracking-[-0.02em] text-balance text-cream">
          Pas de réseau
          <br />
          pour le moment.
        </h1>
        <p className="mt-4 text-cream/70 leading-relaxed max-w-sm mx-auto">
          Tes derniers posts sont gardés en cache. Tout sera resynchronisé dès
          que la connexion revient.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="lg" className="!bg-gold !text-night hover:!bg-gold-soft">
            <Link href="/">
              <RotateCcw className="w-4 h-4" aria-hidden />
              Réessayer
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="!text-cream hover:!bg-cream/10"
          >
            <Link href="/feed/saved">
              <Home className="w-4 h-4" aria-hidden />
              Mes sauvegardés
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
