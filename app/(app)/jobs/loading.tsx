import { Skeleton } from "@/components/ui/Skeleton";

/* Loading skeleton de /jobs — mime hero + filtres + grid offres.
 * Affiché pendant le SSR (queries listings + featured + filters). */
export default function JobsLoading() {
  return (
    <div className="bg-bg-soft min-h-[calc(100dvh-56px)] pb-24" aria-busy>
      <div className="mx-auto w-full max-w-6xl">
        {/* Hero */}
        <header className="bg-gradient-to-b from-cream to-bg-soft px-5 sm:px-8 pt-8 sm:pt-10 pb-7">
          <Skeleton shape="text" className="w-32 h-3 mb-2" />
          <Skeleton className="w-full max-w-[480px] h-12 mb-2" />
          <Skeleton className="w-2/3 max-w-[380px] h-12" />
          <div className="mt-5 flex gap-2">
            <Skeleton className="w-32 h-10 rounded-full" />
            <Skeleton className="w-28 h-10 rounded-full" />
          </div>
        </header>

        {/* Filters chips */}
        <div className="px-4 sm:px-7 pt-2 flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="shrink-0 w-24 h-9 rounded-full" />
          ))}
        </div>

        {/* Grid offres */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-4 sm:px-7 pt-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[18px] bg-white border border-line p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <Skeleton shape="circle" className="w-12 h-12" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton shape="text" className="w-3/4 h-4" />
                  <Skeleton shape="text" className="w-1/2 h-3" />
                </div>
                <Skeleton shape="circle" className="w-7 h-7" />
              </div>
              <Skeleton shape="text" className="w-full h-3" />
              <Skeleton shape="text" className="w-5/6 h-3" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="w-16 h-6 rounded-full" />
                <Skeleton className="w-20 h-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Chargement des offres d&apos;emploi…</span>
    </div>
  );
}
