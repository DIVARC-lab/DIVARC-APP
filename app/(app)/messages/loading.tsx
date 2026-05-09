import { Skeleton } from "@/components/ui/Skeleton";

/* Loading skeleton de /messages — mime la liste de conversations + thread
 * preview. Pendant le SSR (queries conversations + presence + draft). */
export default function MessagesLoading() {
  return (
    <div className="bg-bg-soft min-h-screen flex" aria-busy>
      {/* Sidebar conversations (mobile cachée si conversation ouverte) */}
      <aside className="w-full sm:max-w-sm border-r border-line bg-white">
        <header className="px-4 py-5 border-b border-line">
          <Skeleton shape="text" className="w-20 h-3 mb-2" />
          <Skeleton className="w-40 h-8 mb-3" />
          <Skeleton className="w-full h-11 rounded-full" />
        </header>
        <div className="px-2 py-2 flex gap-2">
          <Skeleton className="w-20 h-8 rounded-full" />
          <Skeleton className="w-24 h-8 rounded-full" />
          <Skeleton className="w-20 h-8 rounded-full" />
        </div>
        <ul className="px-2 py-2 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 p-3 rounded-2xl"
            >
              <Skeleton shape="circle" className="w-12 h-12" />
              <div className="flex-1 space-y-1.5">
                <Skeleton shape="text" className="w-28 h-3" />
                <Skeleton shape="text" className="w-44 h-2.5" />
              </div>
              <Skeleton shape="text" className="w-8 h-2" />
            </li>
          ))}
        </ul>
      </aside>

      {/* Thread placeholder desktop */}
      <main className="hidden sm:flex flex-1 flex-col items-center justify-center px-8">
        <Skeleton shape="circle" className="w-16 h-16 mb-4" />
        <Skeleton shape="text" className="w-48 h-3" />
      </main>
      <span className="sr-only">Chargement des messages…</span>
    </div>
  );
}
