import { Logo } from "@/components/Logo";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Chargement"
      className="min-h-screen flex flex-col items-center justify-center"
    >
      <div className="animate-pulse">
        <Logo size={48} />
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
