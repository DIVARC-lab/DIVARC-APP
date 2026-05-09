import { redirect } from "next/navigation";
import { listGeolocatedEventsForUser } from "@/lib/queries/circle_events";
import { listMyCircles } from "@/lib/queries/circles";
import { getCurrentProfile } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { MapView } from "./_components/MapView";

export const metadata = {
  title: "Carte",
};

/* Calcule un centre + zoom raisonnable depuis les points géolocalisés.
   Fallback : Paris centre, zoom 11. */
function computeCameraFromPoints(
  points: { lat: number; lng: number }[],
): { center: [number, number]; zoom: number } {
  if (points.length === 0) {
    return { center: [2.3522, 48.8566], zoom: 11 };
  }
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const center: [number, number] = [
    (minLng + maxLng) / 2,
    (minLat + maxLat) / 2,
  ];
  /* Zoom heuristique : plus la bbox est petite, plus on zoome. */
  const span = Math.max(maxLat - minLat, maxLng - minLng, 0.005);
  const zoom = Math.min(
    14,
    Math.max(9, Math.round(Math.log2(360 / span))),
  );
  return { center, zoom };
}

export default async function MapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [events, myCircles, profile] = await Promise.all([
    listGeolocatedEventsForUser(user.id, 50),
    listMyCircles(user.id),
    getCurrentProfile(),
  ]);

  const fullName =
    profile?.full_name ?? user.email?.split("@")[0] ?? null;

  /* On ne passe au client que les events qui ont vraiment des coordonnées
     (filtre déjà côté SQL mais TS exige le narrowing). */
  const geolocated = events.filter(
    (e): e is typeof e & { lat: number; lng: number } =>
      e.lat !== null && e.lng !== null,
  );

  const camera = computeCameraFromPoints(
    geolocated.map((e) => ({ lat: e.lat, lng: e.lng })),
  );

  return (
    <MapView
      events={geolocated}
      initialCenter={camera.center}
      initialZoom={camera.zoom}
      hasCircles={myCircles.length > 0}
      currentUserName={fullName}
    />
  );
}
