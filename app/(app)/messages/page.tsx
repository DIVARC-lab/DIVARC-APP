import { MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function MessagesEmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8 sm:py-16">
      <div className="max-w-md text-center">
        <div
          aria-hidden
          className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/20 border border-gold/30 flex items-center justify-center mb-4 sm:mb-6 shadow-soft"
        >
          <MessageCircle
            className="w-9 h-9 sm:w-11 sm:h-11 text-gold-deep"
            aria-hidden
          />
        </div>
        <h1 className="font-display italic text-[28px] sm:text-[48px] text-night text-balance leading-[1.05] tracking-[-0.02em]">
          Bienvenue dans tes{" "}
          <em className="italic text-gold-deep">discussions</em>.
        </h1>
        <p className="mt-3 text-sm sm:text-base text-muted-strong leading-relaxed">
          Choisis une conversation à gauche, ou démarre-en une nouvelle. Tes
          messages sont chiffrés et stockés en Europe.
        </p>
        <div className="mt-6 sm:mt-8 flex justify-center gap-3">
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
