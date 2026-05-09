import { Skeleton } from "@/components/ui/Skeleton";

/* Loading skeleton de /network — mime hero + 3 stats + suggestions list. */
export default function NetworkLoading() {
  return (
    <div className="bg-bg-soft min-h-screen pb-24" aria-busy>
      <div className="mx-auto w-full max-w-2xl lg:max-w-3xl">
        <header className="bg-gradient-to-b from-cream to-bg-soft px-5 sm:px-8 pt-8 sm:pt-10 pb-7">
          <Skeleton shape="text" className="w-28 h-3 mb-2" />
          <Skeleton className="w-full max-w-[420px] h-12 mb-2" />
          <Skeleton className="w-3/4 h-12 mb-3" />
          <Skeleton shape="text" className="w-2/3 h-3" />
        </header>

        {/* Stats grid */}
        <section className="px-4 sm:px-7 pt-4 grid grid-cols-3 gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white border border-line p-4"
            >
              <Skeleton shape="text" className="w-12 h-2 mb-2" />
              <Skeleton className="w-8 h-7" />
            </div>
          ))}
        </section>

        {/* Tabs */}
        <div className="px-4 sm:px-7 pt-5 flex gap-2">
          <Skeleton className="w-28 h-9 rounded-full" />
          <Skeleton className="w-32 h-9 rounded-full" />
          <Skeleton className="w-28 h-9 rounded-full" />
        </div>

        {/* List of cards */}
        <ul className="grid sm:grid-cols-2 gap-3 px-4 sm:px-7 pt-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="rounded-[18px] bg-white border border-line p-4 flex items-start gap-3"
            >
              <Skeleton shape="circle" className="w-12 h-12" />
              <div className="flex-1 space-y-1.5">
                <Skeleton shape="text" className="w-32 h-3" />
                <Skeleton shape="text" className="w-24 h-2.5" />
                <Skeleton shape="text" className="w-40 h-2.5" />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <span className="sr-only">Chargement du réseau…</span>
    </div>
  );
}
