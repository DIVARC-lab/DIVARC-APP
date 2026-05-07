import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { ArcMark } from "@/components/marketing/ArcMark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <aside className="relative hidden lg:flex flex-col justify-between p-12 bg-night text-cream overflow-hidden grain">
        <div className="pointer-events-none absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-gold/40 via-gold/10 to-transparent blur-3xl halo-drift" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-cream/10 via-cream/0 to-transparent blur-3xl halo-drift" />

        <Link href="/" className="relative inline-flex items-center gap-3">
          <Wordmark className="text-cream [&_span]:text-cream" />
        </Link>

        <div className="relative">
          <ArcMark size={420} className="opacity-95 -ml-10" />
        </div>

        <div className="relative max-w-md">
          <p className="font-display text-3xl text-balance text-cream leading-tight">
            <em className="italic">Une seule app</em> pour discuter, vendre,
            travailler et payer — entre Paris, Dakar, Abidjan et Montréal.
          </p>
          <p className="mt-6 text-sm text-cream/60">
            DIVARC · Bâti pour la francophonie.
          </p>
        </div>
      </aside>

      <main className="flex flex-col">
        <header className="lg:hidden px-6 sm:px-10 py-5 border-b border-line">
          <Link href="/" className="inline-flex">
            <Wordmark />
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center px-6 py-12 sm:py-20">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
