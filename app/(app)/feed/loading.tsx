import { Skeleton } from "@/components/ui/Skeleton";

/* Loading skeleton du feed — mime la grammaire Bold : hero + stories rail
 * + composer chip + 3 post cards. Sert pendant le SSR Supabase (ranking,
 * stories, suggestions, trending). */
export default function FeedLoading() {
  return (
    <div className="relative bg-bg-soft min-h-screen pb-[86px]" aria-busy>
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-0 lg:gap-10">
          <div className="mx-auto w-full max-w-2xl lg:mx-0">
            {/* Hero header */}
            <header className="bg-gradient-to-b from-cream to-bg-soft pt-16 pb-7 px-[22px] sm:pt-20 sm:px-7">
              <Skeleton shape="text" className="w-32 h-3 mb-3" />
              <Skeleton className="w-full h-12 mb-3" />
              <Skeleton className="w-3/4 h-12 mb-4" />
              <Skeleton shape="text" className="w-2/3 h-3" />
            </header>

            {/* Stories rail */}
            <div className="px-4 sm:px-6 py-4 flex gap-3 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="shrink-0 flex flex-col items-center gap-2">
                  <Skeleton shape="circle" className="w-16 h-16" />
                  <Skeleton shape="text" className="w-12 h-2.5" />
                </div>
              ))}
            </div>

            {/* Composer chip */}
            <div className="px-4 sm:px-6 pb-3.5">
              <Skeleton className="w-full h-12" />
            </div>

            {/* Posts */}
            <ul className="flex flex-col gap-4 px-4 sm:px-6 pb-10">
              {Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={i}
                  className="rounded-3xl bg-white border border-line p-4 sm:p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton shape="circle" className="w-10 h-10" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton shape="text" className="w-32 h-3" />
                      <Skeleton shape="text" className="w-20 h-2.5" />
                    </div>
                  </div>
                  <Skeleton shape="text" className="w-full h-3 mb-2" />
                  <Skeleton shape="text" className="w-5/6 h-3 mb-3" />
                  {i === 0 ? (
                    <Skeleton className="w-full h-64 sm:h-80 mb-3" />
                  ) : null}
                  <div className="flex items-center gap-2 mt-3">
                    <Skeleton className="w-20 h-9" />
                    <Skeleton className="w-24 h-9" />
                    <Skeleton className="w-9 h-9" shape="circle" />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right rail desktop */}
          <div className="hidden lg:block py-10 pr-4">
            <div className="rounded-3xl bg-white border border-line p-5 mb-4">
              <Skeleton shape="text" className="w-24 h-3 mb-3" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton shape="circle" className="w-10 h-10" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton shape="text" className="w-24 h-2.5" />
                    <Skeleton shape="text" className="w-32 h-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">Chargement du feed…</span>
    </div>
  );
}
