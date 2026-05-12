import { Skeleton } from "@/components/ui/Skeleton";

/* Loading skeleton de /marketplace — mime hero + categories + grid de
 * listings. Pendant le SSR (queries listings + offers count). */
export default function MarketplaceLoading() {
  return (
    <div className="bg-bg-soft min-h-[calc(100dvh-56px)] pb-24" aria-busy>
      <div className="mx-auto w-full max-w-6xl">
        {/* Hero */}
        <header className="bg-gradient-to-b from-cream to-bg-soft px-5 sm:px-8 pt-8 sm:pt-10 pb-7">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Skeleton shape="text" className="w-28 h-3 mb-2" />
              <Skeleton className="w-full max-w-[480px] h-12 mb-2" />
              <Skeleton className="w-3/4 max-w-[420px] h-12" />
            </div>
            <div className="flex gap-2">
              <Skeleton shape="circle" className="w-9 h-9" />
              <Skeleton shape="circle" className="w-9 h-9" />
              <Skeleton shape="circle" className="w-9 h-9" />
            </div>
          </div>
        </header>

        {/* Search bar */}
        <div className="px-4 sm:px-7 pt-2">
          <Skeleton className="w-full h-12 rounded-2xl" />
        </div>

        {/* Categories scroll */}
        <div className="px-4 sm:px-7 pt-4 flex gap-2 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="shrink-0 w-24 h-9 rounded-full" />
          ))}
        </div>

        {/* Grid listings */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 px-4 sm:px-7 pt-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full" />
              <Skeleton shape="text" className="w-3/4 h-3" />
              <Skeleton shape="text" className="w-1/2 h-3" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Chargement de la marketplace…</span>
    </div>
  );
}
