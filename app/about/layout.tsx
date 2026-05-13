import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100dvh-56px)] bg-bg-soft">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[13px] text-night-dim hover:text-night transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour
        </Link>
        <article className="prose prose-neutral prose-sm sm:prose-base max-w-none [&_h1]:font-display [&_h1]:font-normal [&_h1]:tracking-[-0.02em] [&_h2]:font-display [&_h2]:font-normal [&_h2]:mt-10 [&_h2]:mb-3 [&_a]:text-gold-deep [&_a]:underline-offset-2">
          {children}
        </article>
      </div>
    </div>
  );
}
