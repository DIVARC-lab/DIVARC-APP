"use client";

import { Crosshair, Loader2, MapPin, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

/* LocationPicker — modal de sélection de lieu via Mapbox Places.
 *
 * Sources :
 *   - Bouton "Utiliser ma position" → navigator.geolocation +
 *     reverse geocoding via /api/posts/places/search?proximity=lng,lat
 *   - Recherche autocomplete → /api/posts/places/search?q=...
 *
 * Output : LocationSelection ou null (retirer le lieu).
 */

export type LocationSelection = {
  name: string;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
};

type Place = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
  category: string | null;
};

type Props = {
  initialLocation: LocationSelection | null;
  onApply: (location: LocationSelection | null) => void;
  onClose: () => void;
};

export function LocationPicker({ initialLocation, onApply, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(
    async (q: string, proximity: { lat: number; lng: number } | null) => {
      if (q.trim().length < 2) {
        setPlaces([]);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ q });
        if (proximity) {
          params.set("proximity", `${proximity.lng},${proximity.lat}`);
        }
        const res = await fetch(`/api/posts/places/search?${params}`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          places?: Place[];
          unavailable?: boolean;
          error?: string;
        };
        setUnavailable(!!json.unavailable);
        setPlaces(json.places ?? []);
        if (json.error && !json.unavailable) setError(json.error);
        else setError(null);
      } catch {
        setError("Erreur réseau.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* Debounce search 300ms. */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void search(query, coords);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, coords, search]);

  const useMyPosition = () => {
    if (!navigator.geolocation) {
      setError("Géolocalisation non disponible sur ce navigateur.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        setGeoLoading(false);
        /* Reverse geocode : on cherche les lieux proches sans query. */
        if (query.length < 2) {
          /* Pas de query → on récupère la ville la plus proche directement. */
          void search("café", { lat, lng });
        }
      },
      (err) => {
        setGeoLoading(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Permission refusée. Active la géolocalisation."
            : "Position indisponible.",
        );
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const select = (place: Place) => {
    onApply({
      name: place.name,
      city: place.city,
      country: place.country,
      lat: place.lat,
      lng: place.lng,
    });
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <p className="font-display italic text-[18px] text-night flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gold-deep" aria-hidden />
          Ajouter un lieu
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-night-muted hover:text-night"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
      </header>

      <div className="px-4 pt-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-night-muted"
            aria-hidden
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ex: Café de Flore, Paris…"
            autoFocus
            className="w-full pl-9 pr-3 py-2 rounded-full border border-line bg-bg-soft text-[13px]"
          />
          {loading ? (
            <Loader2
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-night-muted"
              aria-hidden
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={useMyPosition}
          disabled={geoLoading}
          className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-bold text-gold-deep hover:underline disabled:opacity-60"
        >
          {geoLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Crosshair className="w-3.5 h-3.5" aria-hidden />
          )}
          Utiliser ma position
        </button>
      </div>

      {/* Liste des résultats. */}
      <div className="flex-1 overflow-y-auto px-1 pt-2 pb-4 min-h-0">
        {unavailable ? (
          <div className="px-4 py-6 text-center text-[12.5px] text-night-muted leading-snug">
            La recherche de lieux est indisponible (clé Mapbox manquante).
            Tu peux saisir le nom du lieu manuellement plus tard.
          </div>
        ) : null}

        {error && !unavailable ? (
          <div className="px-4 py-3 text-[12px] text-red-700">{error}</div>
        ) : null}

        {places.length === 0 && query.length >= 2 && !loading ? (
          <div className="px-4 py-6 text-center text-[12.5px] text-night-muted">
            Aucun résultat pour « {query} ».
          </div>
        ) : null}

        <ul className="divide-y divide-line">
          {places.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => select(place)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-2.5 hover:bg-bg-soft text-left transition-colors",
                )}
              >
                <span
                  aria-hidden
                  className="w-8 h-8 rounded-lg bg-gold/15 text-gold-deep flex items-center justify-center shrink-0 mt-0.5"
                >
                  <MapPin className="w-3.5 h-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-night truncate">
                    {place.name}
                  </p>
                  <p className="text-[11.5px] text-night-muted truncate">
                    {place.address}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer : retirer si un lieu est déjà sélectionné. */}
      {initialLocation ? (
        <footer className="flex items-center justify-between px-4 py-3 border-t border-line bg-bg-soft">
          <span className="text-[12px] text-night-soft truncate">
            <MapPin
              className="inline w-3 h-3 mr-1 text-gold-deep"
              aria-hidden
            />
            {initialLocation.name}
          </span>
          <button
            type="button"
            onClick={() => {
              onApply(null);
              onClose();
            }}
            className="text-[12px] font-bold text-red-600 hover:underline"
          >
            Retirer le lieu
          </button>
        </footer>
      ) : null}
    </div>
  );
}
