import { CircleTabStub } from "../_components/CircleTabStub";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "Marketplace du cercle" };

export default async function CircleMarketTab({ params }: { params: Params }) {
  const { slug } = await params;
  return (
    <CircleTabStub
      emoji="🛍️"
      title="Marketplace bientôt disponible"
      body="Les membres pourront vendre du matériel et des produits thématiques directement dans le cercle. Activation à la création (Chantier 3.3)."
      circleSlug={slug}
    />
  );
}
