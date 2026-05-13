import { CircleTabStub } from "../_components/CircleTabStub";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "Library du cercle" };

export default async function CircleLibraryTab({ params }: { params: Params }) {
  const { slug } = await params;
  return (
    <CircleTabStub
      emoji="📚"
      title="Bibliothèque bientôt disponible"
      body="Articles longs, ressources, templates et wikis collaboratifs organisés en catégories par les admins. Chantier 3.5."
      circleSlug={slug}
    />
  );
}
