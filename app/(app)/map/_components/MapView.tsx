"use client";

/* Brief Session 8 — refonte carte Bold.
 *
 * - MapLibre GL JS (libre, sans token) + Carto Positron tiles
 * - Markers stylés par catégorie (gold / emerald / violet)
 * - Bottom sheet drag-snappable (peek / expanded) avec motion
 * - Filter chips (Tout / Événements / Jobs / Marketplace)
 * - Pin click → BottomSheet en mode "detail" (PinDetail)
 * - Drag up sur le grip → mode "list" (tous les events)
 *
 * Le composant est entièrement client : la page server fournit les
 * événements géolocalisés filtrés par RLS (cercles du user). */
import "maplibre-gl/dist/maplibre-gl.css";

import {
  Calendar,
  ChevronDown,
  Layers,
  Locate,
  MapPin,
  Search,
  Users2,
  X,
} from "lucide-react";
import maplibregl, { type Map as MlMap, type Marker } from "maplibre-gl";
import {
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type {
  CircleEventCategory,
  CircleEventWithRsvp,
} from "@/lib/database.types";

type GeolocatedEvent = CircleEventWithRsvp & { lat: number; lng: number };

type MapViewProps = {
  events: GeolocatedEvent[];
  initialCenter: [number, number];
  initialZoom: number;
  hasCircles: boolean;
};

type FilterId = "all" | "events" | "jobs" | "marketplace" | "neighbors";

/* Refonte audit S7 (handoff feed-map.jsx L66-98) :
   pinColor = hex pour la teardrop (rotated -45deg), pinEmoji affiché en
   contre-rotation au-dessus. Couleurs alignées sur le proto :
   events social → gold #F4B942
   events community → blue #2C4D8C (= proto jobs blue, on l'utilise pour
                                     community qui est l'asso/voisinage)
   events cultural → terra #D97757 */
const CATEGORY_TONE: Record<
  CircleEventCategory,
  {
    pinColor: string;
    pinEmoji: string;
    label: string;
    chip: string;
  }
> = {
  community: {
    pinColor: "#2C4D8C",
    pinEmoji: "👥",
    label: "Communauté",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  social: {
    pinColor: "#F4B942",
    pinEmoji: "🎉",
    label: "Social",
    chip: "bg-gold/10 text-gold-deep border-gold/30",
  },
  cultural: {
    pinColor: "#D97757",
    pinEmoji: "🎨",
    label: "Culturel",
    chip: "bg-violet-50 text-violet-700 border-violet-200",
  },
};

/* Carto Positron — tiles libres, pas de token, attribution requise. */
const CARTO_STYLE = {
  version: 8 as const,
  sources: {
    "carto-light": {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-light-layer",
      type: "raster" as const,
      source: "carto-light",
    },
  ],
};

export function MapView({
  events,
  initialCenter,
  initialZoom,
  hasCircles,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [sheetMode, setSheetMode] = useState<"peek" | "expanded">("peek");

  /* Initialise la map une fois — référencée via useRef pour éviter les
     recreates sur re-render. */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showAccuracyCircle: true,
      }),
      "top-right",
    );
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [initialCenter, initialZoom]);

  /* Ajoute / met à jour les markers quand les events ou le filtre changent.
     Refonte audit S7 — pins teardrop r `50% 50% 50% 0` rotated -45deg avec
     emoji contre-tourné +45deg au centre (handoff feed-map L88-97). */
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    /* Aujourd'hui seul "events" a des données. Les autres filtres masquent
       tous les markers, ils restent là pour le scaffolding visuel. */
    if (filter !== "all" && filter !== "events") return;

    for (const event of events) {
      const tone = CATEGORY_TONE[event.category];
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", event.title);
      el.className =
        "relative cursor-pointer transition-transform hover:scale-110 focus:scale-110 outline-none";
      /* Teardrop : div carrée 38x38 avec border-radius asymétrique +
         rotation, emoji au-dessus en contre-rotation. */
      el.innerHTML = `
        <span
          aria-hidden
          class="block h-[38px] w-[38px] rounded-[50%_50%_50%_0] -rotate-45 border-[3px] border-white shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
          style="background:${tone.pinColor}"
        ></span>
        <span
          aria-hidden
          class="absolute top-[8px] left-1/2 -translate-x-1/2 text-[16px] leading-none select-none pointer-events-none"
        >${tone.pinEmoji}</span>
      `;
      /* Origin du marker : pointe-bas. anchor "bottom" aligne la pointe
         avec les coordonnées. */
      el.style.transformOrigin = "center bottom";
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedId(event.id);
        setSheetMode("expanded");
        mapRef.current?.flyTo({
          center: [event.lng, event.lat],
          zoom: Math.max(mapRef.current.getZoom(), 14),
          essential: true,
        });
      });
      const marker = new maplibregl.Marker({
        element: el,
        anchor: "bottom",
      })
        .setLngLat([event.lng, event.lat])
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    }
  }, [events, filter]);

  const filtered = useMemo(() => {
    if (filter === "all" || filter === "events") return events;
    return [];
  }, [events, filter]);

  const selected = useMemo(
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId],
  );

  /* "Plus proche" — l'event le plus proche dans le temps (1er ordre starts_at).
     V1 sans geolocation user : on utilise l'ordre chronologique fourni par
     listGeolocatedEventsForUser (ascending starts_at). */
  const nearestEvent = useMemo(
    () => (filtered.length > 0 ? filtered[0]! : null),
    [filtered],
  );

  return (
    <div className="relative h-[calc(100vh-56px-44px)] lg:h-[calc(100vh-44px)] w-full overflow-hidden">
      {/* Top : search + filters flottants au-dessus de la carte. */}
      <div className="absolute inset-x-0 top-0 z-20 px-4 pt-4 pointer-events-none">
        <div className="mx-auto max-w-2xl pointer-events-auto space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-11 rounded-full bg-white/95 backdrop-blur-md border border-line shadow-soft flex items-center gap-2.5 px-4 text-sm text-muted-strong">
              <Search className="w-4 h-4 text-night-muted" aria-hidden />
              <span className="truncate">Rechercher autour de toi…</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!mapRef.current) return;
                mapRef.current.flyTo({
                  center: initialCenter,
                  zoom: initialZoom,
                  essential: true,
                });
              }}
              aria-label="Recentrer la carte"
              className="shrink-0 h-11 w-11 rounded-full bg-white/95 backdrop-blur-md border border-line shadow-soft flex items-center justify-center text-night-muted hover:text-night transition-colors"
            >
              <Locate className="w-4 h-4" aria-hidden />
            </button>
          </div>

          <nav
            aria-label="Filtres carte"
            className="-mx-1 px-1 flex gap-2 overflow-x-auto scrollbar-none"
          >
            {(
              [
                { id: "all", label: "Tout" },
                { id: "events", label: "🎉 Événements", count: events.length },
                { id: "jobs", label: "💼 Jobs" },
                { id: "marketplace", label: "🛍️ Marketplace" },
                { id: "neighbors", label: "👥 Voisins" },
              ] as ReadonlyArray<{
                id: FilterId;
                label: string;
                count?: number;
              }>
            ).map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "shrink-0 px-3.5 h-8 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors",
                    active
                      ? "bg-night text-cream"
                      : "bg-white/95 backdrop-blur-md border border-line text-night-muted hover:border-gold/40",
                  )}
                  aria-pressed={active}
                >
                  {f.label}
                  {f.count ? (
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-extrabold",
                        active
                          ? "bg-gold text-night"
                          : "bg-night/5 text-night",
                      )}
                    >
                      {f.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Map canvas plein écran. */}
      <div ref={containerRef} className="absolute inset-0 bg-bg-deep" />

      {/* Empty overlay si pas de cercle ou pas d'event. */}
      {!hasCircles ? (
        <EmptyOverlay
          icon={Users2}
          title="Rejoins un cercle"
          body="La carte affiche les événements géolocalisés de tes cercles."
          ctaHref="/circles"
          ctaLabel="Voir les cercles"
        />
      ) : events.length === 0 ? (
        <EmptyOverlay
          icon={MapPin}
          title="Aucun événement géolocalisé"
          body="Tes cercles n'ont pas encore d'événement avec coordonnées GPS."
          ctaHref="/circles"
          ctaLabel="Aller aux cercles"
        />
      ) : null}

      {/* Hero "Plus proche" — flottante au-dessus de la sheet en mode peek
          quand aucun pin n'est sélectionné. Refonte audit S7 (handoff
          feed-map L145-180). */}
      {events.length > 0 &&
      sheetMode === "peek" &&
      !selected &&
      nearestEvent ? (
        <NearestEventCard
          event={nearestEvent}
          onOpen={() => {
            setSelectedId(nearestEvent.id);
            setSheetMode("expanded");
            mapRef.current?.flyTo({
              center: [nearestEvent.lng, nearestEvent.lat],
              zoom: Math.max(mapRef.current.getZoom(), 14),
              essential: true,
            });
          }}
        />
      ) : null}

      {/* Bottom sheet drag-snappable. */}
      {events.length > 0 ? (
        <BottomSheet
          mode={sheetMode}
          setMode={setSheetMode}
          events={filtered}
          selected={selected}
          onSelect={(id) => {
            setSelectedId(id);
            const evt = events.find((e) => e.id === id);
            if (evt && mapRef.current) {
              mapRef.current.flyTo({
                center: [evt.lng, evt.lat],
                zoom: Math.max(mapRef.current.getZoom(), 14),
                essential: true,
              });
            }
          }}
          onClearSelection={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}

function BottomSheet({
  mode,
  setMode,
  events,
  selected,
  onSelect,
  onClearSelection,
}: {
  mode: "peek" | "expanded";
  setMode: (m: "peek" | "expanded") => void;
  events: GeolocatedEvent[];
  selected: GeolocatedEvent | null;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
}) {
  const dragControls = useDragControls();
  const y = useMotionValue(0);
  const backdrop = useTransform(y, [0, 200], [0.45, 0]);

  /* Snap points (en pixels depuis le bas). Calculés avec un viewport
     unitless safe : 60vh expanded, 84px peek. */
  const PEEK_HEIGHT = 84;
  const EXPANDED_VH = 0.6;

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 80 || info.velocity.y > 500) {
      setMode("peek");
      onClearSelection();
    } else if (info.offset.y < -40 || info.velocity.y < -300) {
      setMode("expanded");
    }
    y.set(0);
  }

  return (
    <>
      {/* Backdrop dim quand expanded. */}
      <motion.div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-night transition-opacity",
          mode === "expanded"
            ? "pointer-events-auto"
            : "pointer-events-none opacity-0",
        )}
        style={mode === "expanded" ? { opacity: backdrop } : undefined}
        onClick={() => {
          setMode("peek");
          onClearSelection();
        }}
      />

      <motion.section
        aria-label="Détails"
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.4 }}
        onDragEnd={handleDragEnd}
        style={{ y }}
        animate={{
          height:
            mode === "expanded"
              ? `${EXPANDED_VH * 100}vh`
              : `${PEEK_HEIGHT}px`,
        }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="absolute inset-x-0 bottom-0 z-30 bg-white border-t border-line rounded-t-[28px] shadow-[0_-12px_36px_-12px_rgba(10,31,68,0.25)] flex flex-col overflow-hidden"
      >
        {/* Drag handle. */}
        <button
          type="button"
          onPointerDown={(e) => dragControls.start(e)}
          onClick={() =>
            setMode(mode === "peek" ? "expanded" : "peek")
          }
          className="w-full pt-2 pb-1 flex flex-col items-center cursor-grab active:cursor-grabbing touch-none"
          aria-label={mode === "peek" ? "Ouvrir la liste" : "Réduire"}
        >
          <span
            aria-hidden
            className="block h-1 w-10 rounded-full bg-night/15"
          />
        </button>

        {selected && mode === "expanded" ? (
          <PinDetail event={selected} onClose={onClearSelection} />
        ) : (
          <ListSheet
            events={events}
            mode={mode}
            onSelect={(id) => {
              onSelect(id);
              setMode("expanded");
            }}
            onExpand={() => setMode("expanded")}
          />
        )}
      </motion.section>
    </>
  );
}

function ListSheet({
  events,
  mode,
  onSelect,
  onExpand,
}: {
  events: GeolocatedEvent[];
  mode: "peek" | "expanded";
  onSelect: (id: string) => void;
  onExpand: () => void;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <button
        type="button"
        onClick={onExpand}
        className="px-5 py-2 flex items-baseline justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
            · {events.length} résultat{events.length > 1 ? "s" : ""}
          </span>
          <h2 className="font-display italic text-[22px] text-night leading-[1.05] tracking-[-0.015em] truncate">
            Autour de toi
          </h2>
        </div>
        {mode === "peek" ? (
          <span className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-night-muted">
            Ouvrir
          </span>
        ) : null}
      </button>

      {mode === "expanded" ? (
        <ul className="flex-1 min-h-0 overflow-y-auto px-3 pb-6 space-y-2">
          {events.map((event) => {
            const tone = CATEGORY_TONE[event.category];
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
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelect(event.id)}
                  className="w-full text-left rounded-2xl bg-white border border-line p-3 hover:border-gold/40 transition-colors flex items-start gap-3"
                >
                  <DatePill date={date} />
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        tone.chip,
                      )}
                    >
                      {tone.label}
                    </span>
                    <h3 className="mt-1 font-semibold text-night leading-tight truncate">
                      {event.title}
                    </h3>
                    <p className="text-[11px] text-muted truncate inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" aria-hidden />
                      {dayLabel} · {time}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function PinDetail({
  event,
  onClose,
}: {
  event: GeolocatedEvent;
  onClose: () => void;
}) {
  const tone = CATEGORY_TONE[event.category];
  const date = new Date(event.starts_at);
  const dayLabel = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const osmLink = `https://www.openstreetmap.org/?mlat=${event.lat}&mlon=${event.lng}#map=16/${event.lat}/${event.lng}`;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <header className="px-5 pt-1 pb-3 flex items-start gap-3">
        <DatePill date={date} large />
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border",
              tone.chip,
            )}
          >
            {tone.label}
          </span>
          <h2 className="mt-1.5 font-display italic text-[26px] text-night leading-[1.1] tracking-[-0.02em] text-balance">
            {event.title}
          </h2>
          <p className="mt-1 text-xs text-muted-strong inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" aria-hidden />
            {dayLabel} · {time}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le détail"
          className="shrink-0 h-9 w-9 rounded-full bg-bg-deep flex items-center justify-center text-night-muted hover:text-night transition-colors"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6 space-y-4">
        {event.location ? (
          <p className="text-sm text-night-muted inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gold-deep" aria-hidden />
            {event.location}
          </p>
        ) : null}

        {event.description ? (
          <p className="text-[15px] text-night leading-relaxed whitespace-pre-wrap text-pretty">
            {event.description}
          </p>
        ) : null}

        <div className="flex items-center gap-2 text-xs text-muted">
          <Users2 className="w-3.5 h-3.5" aria-hidden />
          {event.attendance_count}{" "}
          {event.attendance_count > 1 ? "personnes" : "personne"} y vont
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Link
            href={`/circles/${event.circle_id}`}
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-night text-cream font-semibold text-sm hover:bg-night-soft transition-colors"
          >
            <Layers className="w-4 h-4" aria-hidden />
            Voir le cercle
          </Link>
          <a
            href={osmLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-gold text-night font-extrabold text-sm hover:bg-gold-soft transition-colors shadow-[0_8px_22px_-8px_rgba(244,185,66,0.55)]"
          >
            Y aller →
          </a>
        </div>
      </div>
    </div>
  );
}

function DatePill({ date, large = false }: { date: Date; large?: boolean }) {
  const wd = date
    .toLocaleDateString("fr-FR", { weekday: "short" })
    .replace(".", "")
    .toUpperCase();
  const day = date.getDate();
  const mo = date
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "");
  return (
    <div
      className={cn(
        "shrink-0 rounded-xl bg-bg-deep border border-line text-center",
        large ? "w-16 py-3" : "w-12 py-2",
      )}
    >
      <div className="text-[9.5px] tracking-[0.14em] uppercase text-gold-deep font-extrabold">
        {wd}
      </div>
      <div
        className={cn(
          "font-display italic leading-none mt-0.5",
          large ? "text-[28px]" : "text-xl",
        )}
      >
        {day}
      </div>
      <div className="text-[9.5px] opacity-70 mt-px">{mo}</div>
    </div>
  );
}

/* Refonte audit S7 (handoff feed-map L145-180) — hero card flottante
   "Plus proche" qui sit au-dessus de la sheet en mode peek. DatePill
   gold gradient avec ArcDeco filigrane + titre Instrument Serif italic
   + meta location + RSVP count + CTA "Y aller →" navy. */
function NearestEventCard({
  event,
  onOpen,
}: {
  event: GeolocatedEvent;
  onOpen: () => void;
}) {
  const date = new Date(event.starts_at);
  const wd = date
    .toLocaleDateString("fr-FR", { weekday: "short" })
    .replace(".", "")
    .toUpperCase();
  const day = date.getDate();
  const mo = date
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "");
  const time = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="absolute inset-x-0 bottom-[100px] z-20 px-3 pointer-events-none">
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto w-full max-w-md mx-auto block text-left rounded-2xl bg-white shadow-[0_12px_32px_rgba(10,31,68,0.18)] p-3.5 hover:shadow-[0_16px_40px_rgba(10,31,68,0.22)] transition-shadow"
      >
        <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-gold-deep">
          · Plus proche · {time}
        </div>
        <div className="mt-2 flex gap-3 items-start">
          {/* DatePill gradient gold avec ArcDeco filigrane interne */}
          <div className="relative shrink-0 w-14 h-[70px] rounded-xl overflow-hidden bg-gradient-to-br from-gold to-[#B88A2A] flex flex-col items-center justify-center text-night">
            <span
              aria-hidden
              className="absolute inset-0 opacity-20 pointer-events-none"
            >
              <ArcDecoInline />
            </span>
            <span className="relative text-[9px] font-extrabold tracking-[0.12em]">
              {wd}
            </span>
            <span className="relative font-display italic text-[28px] leading-none">
              {day}
            </span>
            <span className="relative text-[9px] font-bold">
              {mo} · {time}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display italic text-[18px] text-night leading-tight line-clamp-2">
              {event.title}
            </h3>
            <p className="mt-1 text-[11px] text-night-dim flex items-center gap-1.5 flex-wrap">
              {event.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" aria-hidden />
                  {event.location}
                </span>
              ) : null}
              {event.attendance_count > 0 ? (
                <>
                  {event.location ? <span>·</span> : null}
                  <span className="text-night font-bold">
                    {event.attendance_count} voisin
                    {event.attendance_count > 1 ? "s" : ""} y{" "}
                    {event.attendance_count > 1 ? "vont" : "va"}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <span className="mt-3 block text-center py-2.5 rounded-full bg-night text-cream text-[12.5px] font-extrabold">
          Y aller →
        </span>
      </button>
    </div>
  );
}

/* Inline ArcDeco mini — pour ne pas tirer le composant marketing dans le
   client hot-path. SVG arc gold simple. */
function ArcDecoInline() {
  return (
    <svg
      viewBox="0 0 60 60"
      className="w-full h-full"
      fill="none"
      aria-hidden
    >
      <circle
        cx="30"
        cy="30"
        r="22"
        stroke="#0A1F44"
        strokeWidth="1"
        strokeDasharray="100 30"
      />
    </svg>
  );
}

function EmptyOverlay({
  icon: Icon,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  icon: typeof MapPin;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-30 px-5 pb-6">
      <div className="mx-auto max-w-md rounded-3xl bg-white border border-line shadow-soft p-5 text-center">
        <div
          aria-hidden
          className="w-12 h-12 mx-auto rounded-2xl bg-cream border border-gold/30 flex items-center justify-center mb-3"
        >
          <Icon className="w-5 h-5 text-gold-deep" aria-hidden />
        </div>
        <h2 className="font-display italic text-[22px] text-night">{title}</h2>
        <p className="mt-1 text-sm text-muted">{body}</p>
        <Link
          href={ctaHref}
          className="mt-4 inline-flex items-center gap-2 px-5 h-11 rounded-full bg-night text-cream font-semibold text-sm hover:bg-night-soft"
        >
          {ctaLabel}
          <ChevronDown className="w-4 h-4 rotate-[-90deg]" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
