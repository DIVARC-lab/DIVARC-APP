import { Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function MessagesEmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center px-8 py-16">
      <div className="max-w-md text-center">
        <div
          aria-hidden
          className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/20 border border-gold/30 flex items-center justify-center mb-6 shadow-soft text-5xl leading-none"
        >
          💬
        </div>
        <h1 className="font-display text-4xl text-night text-balance">
          Bienvenue dans tes discussions.
        </h1>
        <p className="mt-3 text-muted-strong leading-relaxed">
          Choisis une conversation à gauche, ou démarre-en une nouvelle. Tes
          messages sont chiffrés et stockés en Europe.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/messages/new">
              <Sparkles className="w-4 h-4" aria-hidden />
              Nouvelle conversation
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
