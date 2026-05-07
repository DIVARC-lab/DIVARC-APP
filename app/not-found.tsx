import { Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-night/5 border border-line flex items-center justify-center mb-5">
        <Compass className="w-7 h-7 text-night" aria-hidden />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-night">
        Page introuvable
      </h1>
      <p className="mt-2 text-muted max-w-md">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Button asChild className="mt-6">
        <a href="/">Retour à l&apos;accueil</a>
      </Button>
    </div>
  );
}
