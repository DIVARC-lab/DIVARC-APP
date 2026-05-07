import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { UserSearch } from "./UserSearch";

export const metadata = {
  title: "Nouvelle discussion",
};

export default function NewConversationPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <header className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-line bg-white sticky top-0 z-10">
        <Link
          href="/messages"
          aria-label="Retour"
          className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-night" aria-hidden />
        </Link>
        <div>
          <h1 className="font-semibold text-night">Nouvelle discussion</h1>
          <p className="text-xs text-muted">
            Trouve quelqu&apos;un par son nom ou son pseudo.
          </p>
        </div>
      </header>
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <UserSearch />
      </div>
    </div>
  );
}
