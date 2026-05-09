import { Skeleton } from "@/components/ui/Skeleton";

/* Loading skeleton de /u/[username] — mime hero cover + avatar + stats +
 * sections posts/jobs. */
export default function UserProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl bg-bg-soft min-h-screen" aria-busy>
      {/* Cover navy + ArcDeco placeholder */}
      <section className="relative">
        <div className="relative h-[140px] bg-night sm:rounded-b-[28px]" />
        {/* Avatar overlap */}
        <div className="px-5 sm:px-8 -mt-12 sm:-mt-14">
          <Skeleton
            shape="circle"
            className="w-24 h-24 sm:w-28 sm:h-28 ring-4 ring-bg-soft"
          />
          <div className="mt-4 space-y-2">
            <Skeleton className="w-48 h-7" />
            <Skeleton shape="text" className="w-32 h-3" />
            <Skeleton shape="text" className="w-2/3 h-3" />
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="px-5 sm:px-8 pt-5 grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white border border-line p-4">
            <Skeleton shape="text" className="w-12 h-2 mb-2" />
            <Skeleton className="w-8 h-6" />
          </div>
        ))}
      </section>

      {/* Action bar */}
      <div className="px-5 sm:px-8 pt-4 flex gap-2">
        <Skeleton className="flex-1 h-11 rounded-full" />
        <Skeleton className="flex-1 h-11 rounded-full" />
      </div>

      {/* Posts grid */}
      <div className="px-5 sm:px-8 pt-6 grid grid-cols-3 gap-1.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
      <span className="sr-only">Chargement du profil…</span>
    </div>
  );
}
