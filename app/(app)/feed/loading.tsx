import { Skeleton } from "@/components/ui/Skeleton";

/* Loading skeleton du feed — mime la grammaire Bold : hero + stories rail
 * + composer chip + 3 post cards + right rail desktop avec 2 sections.
 * Hauteurs réalistes (image h-80 sm:h-96 = ~ostraille post réel) pour
 * éliminer le CLS au moment du remplacement par les vrais posts. */
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

            {/* Posts — hauteurs réalistes pour éviter CLS au load. */}
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
                    /* Premier post = hero avec image plein cadre.
                       Hauteur 320/384 = approx réel sur mobile/desktop. */
                    <Skeleton className="w-full h-80 sm:h-96 mb-3" />
                  ) : null}
                  {/* Footer pills réactions / commenter / partager. */}
                  <div className="flex items-center gap-2 mt-3">
                    <Skeleton className="w-20 h-11 rounded-full" />
                    <Skeleton className="w-24 h-11 rounded-full" />
                    <Skeleton className="w-11 h-11 rounded-full" />
                    <Skeleton className="w-11 h-11 rounded-full ml-auto" />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Right rail desktop — 2 cards mocked (Suggestions + Tendances)
              pour que le rail apparaisse complet au chargement et évite
              le shift visuel quand les vraies données arrivent. */}
          <div className="hidden lg:block py-10 pr-4 space-y-4">
            {/* Card Suggestions */}
            <div className="rounded-3xl bg-white border border-line p-5">
              <Skeleton shape="text" className="w-24 h-3 mb-4" />
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

            {/* Card Tendances */}
            <div className="rounded-3xl bg-cream/40 border border-line p-5">
              <Skeleton shape="text" className="w-20 h-3 mb-2" />
              <Skeleton className="w-32 h-7 mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <Skeleton shape="text" className="w-24 h-2.5" />
                    <Skeleton shape="text" className="w-8 h-2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">Chargement du feed…</span>
    </div>
  );
}
