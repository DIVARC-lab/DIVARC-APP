import { Calendar, ExternalLink, MapPin, Users2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { listGeolocatedEventsForUser } from "@/lib/queries/circle_events";
import { listMyCircles } from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import type { CircleEventCategory } from "@/lib/database.types";

export const metadata = {
  title: "Carte",
};

const CATEGORY_BADGE: Record<CircleEventCategory, string> = {
  community: "bg-emerald-50 text-emerald-700 border-emerald-200",
  social: "bg-gold/10 text-gold-deep border-gold/30",
  cultural: "bg-violet-50 text-violet-700 border-violet-200",
};

const CATEGORY_LABEL: Record<CircleEventCategory, string> = {
  community: "Communauté",
  social: "Social",
  cultural: "Culturel",
};

/** Compute a bbox from a list of points with a small padding (~2 km on world). */
function computeBbox(
  points: { lat: number; lng: number }[],
): { minLat: number; minLng: number; maxLat: number; maxLng: number } {
  if (points.length === 0) {
    /* Default : centered on Paris with sensible zoom. */
    return { minLat: 48.78, minLng: 2.25, maxLat: 48.92, maxLng: 2.45 };
  }
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  /* Pad : if all points are the same, give some room. */
  const padLat = Math.max(0.02, (maxLat - minLat) * 0.2);
  const padLng = Math.max(0.02, (maxLng - minLng) * 0.2);
  return {
    minLat: minLat - padLat,
    minLng: minLng - padLng,
    maxLat: maxLat + padLat,
    maxLng: maxLng + padLng,
  };
}

export default async function MapPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [events, myCircles] = await Promise.all([
    listGeolocatedEventsForUser(user.id, 50),
    listMyCircles(user.id),
  ]);

  const points = events
    .filter(
      (e): e is typeof e & { lat: number; lng: number } =>
        e.lat !== null && e.lng !== null,
    )
    .map((e) => ({ lat: e.lat, lng: e.lng }));

  const { minLat, minLng, maxLat, maxLng } = computeBbox(points);
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik`;

  return (
    <div className="px-4 sm:px-10 py-10 max-w-6xl mx-auto w-full">
      <header className="mb-8">
        <KickerLabel>Carte</KickerLabel>
        <DisplayHeading size="lg" className="mt-2">
          Ce qui se passe <em className="italic text-gold-deep">près de toi</em>.
        </DisplayHeading>
        <p className="mt-2 text-muted-strong text-sm leading-relaxed max-w-md">
          Les événements géolocalisés des cercles dont tu fais partie. Pour
          ajouter ton événement à la carte, renseigne ses coordonnées GPS à la
          création.
        </p>
      </header>

      {myCircles.length === 0 ? (
        <EmptyState
          icon={Users2}
          kicker="Tu n'as pas de cercle"
          title={
            <>
              Rejoins un <em className="italic text-gold-deep">cercle</em> d'abord
            </>
          }
          body="La carte affiche les événements de tes cercles. Découvre les communautés près de chez toi pour voir leur agenda géolocalisé."
          ctaHref="/circles"
          ctaLabel="Voir les cercles"
          tone="soft"
        />
      ) : events.length === 0 ? (
        <EmptyState
          icon={MapPin}
          kicker="Aucun événement géolocalisé"
          title={
            <>
              Pas d'événement <em className="italic text-gold-deep">sur la carte</em>
            </>
          }
          body="Tes cercles n'ont pas encore d'événement avec des coordonnées GPS. Crée-en un avec lat/lng pour qu'il apparaisse ici."
          ctaHref="/circles"
          ctaLabel="Aller aux cercles"
        />
      ) : (
        <>
          <section
            aria-label="Carte"
            className="rounded-3xl overflow-hidden border border-line shadow-soft mb-8"
          >
            <iframe
              src={mapSrc}
              title="Carte des événements"
              className="w-full h-[440px] sm:h-[520px] block bg-night/5"
              loading="lazy"
            />
            <div className="px-4 py-2 bg-cream/40 border-t border-line text-[11px] text-muted-strong">
              © OpenStreetMap contributors ·{" "}
              <a
                href={`https://www.openstreetmap.org/?mlat=${(minLat + maxLat) / 2}&mlon=${(minLng + maxLng) / 2}`}
                target="_blank"
                rel="noreferrer"
                className="text-gold-deep hover:underline inline-flex items-center gap-1"
              >
                Ouvrir en plein écran
                <ExternalLink className="w-3 h-3" aria-hidden />
              </a>
            </div>
          </section>

          <section aria-label="Événements">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display italic text-2xl text-night leading-tight">
                {events.length} événement{events.length > 1 ? "s" : ""} à venir
              </h2>
              <span className="text-xs text-muted">
                triés par date croissante
              </span>
            </div>
            <ul className="grid sm:grid-cols-2 gap-3">
              {events.map((event) => {
                if (event.lat === null || event.lng === null) return null;
                const date = new Date(event.starts_at);
                const dayLabel = date.toLocaleDateString("fr-FR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                });
                const time = date.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const osmLink = `https://www.openstreetmap.org/?mlat=${event.lat}&mlon=${event.lng}#map=16/${event.lat}/${event.lng}`;
                return (
                  <li key={event.id}>
                    <article className="rounded-2xl bg-white border border-line p-4 hover:border-gold/40 transition-colors">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            CATEGORY_BADGE[event.category],
                          )}
                        >
                          {CATEGORY_LABEL[event.category]}
                        </span>
                        <span className="text-[11px] text-muted inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" aria-hidden />
                          {dayLabel} · {time}
                        </span>
                      </div>
                      <h3 className="font-semibold text-night leading-tight truncate">
                        {event.title}
                      </h3>
                      {event.location ? (
                        <p className="text-xs text-muted-strong mt-1 inline-flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" aria-hidden />
                          {event.location}
                        </p>
                      ) : null}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-muted">
                          {event.attendance_count}{" "}
                          {event.attendance_count > 1 ? "personnes" : "personne"} y
                          va
                        </p>
                        <a
                          href={osmLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-gold-deep hover:text-night inline-flex items-center gap-1"
                        >
                          Voir sur la carte
                          <ExternalLink className="w-3 h-3" aria-hidden />
                        </a>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
