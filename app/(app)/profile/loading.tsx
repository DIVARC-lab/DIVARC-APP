export default function ProfileLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="h-[68px] border-b border-line" />
      <main className="flex-1 px-6 sm:px-10 py-12 max-w-2xl mx-auto w-full animate-pulse">
        <div className="h-9 w-48 rounded-lg bg-night/10" />
        <div className="mt-3 h-4 w-72 rounded bg-night/5" />

        <div className="mt-10 p-6 rounded-2xl bg-white border border-line">
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-full bg-night/10" />
            <div className="space-y-2">
              <div className="h-9 w-40 rounded-full bg-night/10" />
              <div className="h-3 w-28 rounded bg-night/5" />
            </div>
          </div>
        </div>

        <div className="mt-6 p-6 rounded-2xl bg-white border border-line space-y-5">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="space-y-2">
              <div className="h-4 w-24 rounded bg-night/5" />
              <div className="h-12 w-full rounded-xl bg-night/5" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
