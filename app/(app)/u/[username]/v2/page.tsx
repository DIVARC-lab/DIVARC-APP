import { permanentRedirect } from "next/navigation";

/* /u/[username]/v2 → /u/[username]
 *
 * La preview V2 a été basculée comme layout principal. Cette route
 * redirige permanent vers la racine pour ne pas casser les anciens
 * liens / bookmarks. */

export default async function ProfileV2Redirect({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  permanentRedirect(`/u/${username}`);
}
