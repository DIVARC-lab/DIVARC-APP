import { CircleTabStub } from "../_components/CircleTabStub";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "Jobs du cercle" };

export default async function CircleJobsTab({ params }: { params: Params }) {
  const { slug } = await params;
  return (
    <CircleTabStub
      emoji="💼"
      title="Job board bientôt disponible"
      body="Offres d'emploi et missions postées par les membres, gratuites pour la communauté. Chantier 3.4."
      circleSlug={slug}
    />
  );
}
