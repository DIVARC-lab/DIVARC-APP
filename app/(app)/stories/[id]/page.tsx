import { notFound, redirect } from "next/navigation";
import {
  groupStoriesByAuthor,
  listVisibleStories,
} from "@/lib/queries/stories";
import { createClient } from "@/lib/supabase/server";
import { StoryViewer } from "../_components/StoryViewer";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Story" };

export default async function StoryViewerPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stories = await listVisibleStories(user.id);
  const groups = groupStoriesByAuthor(stories, user.id);

  const exists = stories.some((s) => s.id === id);
  if (!exists) notFound();

  return (
    <StoryViewer
      groups={groups}
      currentUserId={user.id}
      initialStoryId={id}
    />
  );
}
