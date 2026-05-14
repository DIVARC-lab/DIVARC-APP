import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listFriendsForUser } from "@/lib/queries/friendships";
import { createClient } from "@/lib/supabase/server";
import { GroupForm } from "./GroupForm";
import { Container } from "@/components/primitives/Container";

export const metadata = {
  title: "Nouveau groupe",
};

export default async function NewGroupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const friendships = await listFriendsForUser(user.id);
  const friends = friendships.map((f) => ({
    id: f.other.id,
    full_name: f.other.full_name,
    username: f.other.username,
    avatar_url: f.other.avatar_url,
  }));

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
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-night" aria-hidden />
          <div>
            <h1 className="font-semibold text-night">Nouveau groupe</h1>
            <p className="text-xs text-muted">
              Choisis un nom et tes membres parmi tes amis.
            </p>
          </div>
        </div>
      </header>
      <Container maxWidth="text" paddingX="lg" paddingY="2xl">
        <GroupForm friends={friends} />
      </Container>
    </div>
  );
}
