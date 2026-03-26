'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon paths broken by webpack
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconAnchor: [12, 41],
  iconSize: [25, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ─── Geocoding helpers (Google Maps for Taiwan + Nominatim fallback) ───────────

interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function normalizeTaiwanQuery(query: string): string {
  const q = query.trim();
  if (!q) return q;
  const hasTaiwanKeyword = /taiwan|台灣|臺灣|taipei|台北|臺北/i.test(q);
  return hasTaiwanKeyword ? q : `${q}, Taiwan`;
}

async function searchSuggestionsGoogle(query: string): Promise<GeocodeResult[]> {
  if (!GOOGLE_MAPS_API_KEY) return [];
  try {
    const input = normalizeTaiwanQuery(query);
    const placeRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&language=zh-TW&components=country:tw&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const placeData = await placeRes.json();
    const predictions = Array.isArray(placeData?.predictions) ? placeData.predictions.slice(0, 5) : [];
    if (!predictions.length) return [];

    const detailResults = await Promise.all(
      predictions.map(async (p: { place_id?: string; description?: string }) => {
        if (!p.place_id) return null;
        const detailRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(p.place_id)}&fields=geometry/location,formatted_address&language=zh-TW&key=${GOOGLE_MAPS_API_KEY}`,
        );
        const detailData = await detailRes.json();
        const loc = detailData?.result?.geometry?.location;
        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;
        return {
          lat: loc.lat,
          lng: loc.lng,
          label: detailData?.result?.formatted_address || p.description || '',
        } as GeocodeResult;
      }),
    );

    return detailResults.filter((r): r is GeocodeResult => Boolean(r && r.label));
  } catch {
    return [];
  }
}

async function reverseGeocodeGoogle(lat: number, lng: number): Promise<string | null> {
  if (!GOOGLE_MAPS_API_KEY) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=zh-TW&region=TW&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const data = await res.json();
    const first = Array.isArray(data?.results) ? data.results[0] : null;
    return first?.formatted_address ?? null;
  } catch {
    return null;
  }
}

async function searchSuggestionsNominatim(query: string): Promise<GeocodeResult[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(normalizeTaiwanQuery(query))}&limit=5&countrycodes=tw&accept-language=zh-TW`,
    );
    const data = await res.json();
    return data.map((item: { lat: string; lon: string; display_name: string }) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      label: item.display_name,
    }));
  } catch {
    return [];
  }
}

async function searchSuggestions(query: string): Promise<GeocodeResult[]> {
  const googleResults = await searchSuggestionsGoogle(query);
  if (googleResults.length > 0) return googleResults;
  return searchSuggestionsNominatim(query);
}

async function reverseGeocodeNominatim(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=zh-TW`,
    );
    const data = await res.json();
    const a = data.address ?? {};
    const short = [a.road, a.suburb, a.city || a.town || a.village, a.country]
      .filter(Boolean)
      .join(', ');
    return short || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const google = await reverseGeocodeGoogle(lat, lng);
  if (google) return google;
  return reverseGeocodeNominatim(lat, lng);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Flies the map viewport to a new center whenever `center` changes */
function FlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  map.flyTo(center, 15, { duration: 0.8 });
  return null;
}

/** Draggable marker that calls onDrag when released */
function DraggableMarker({
  position,
  onDrag,
}: {
  position: [number, number];
  onDrag: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  return (
    <Marker
      draggable
      position={position}
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const m = markerRef.current;
          if (m) {
            const ll = m.getLatLng();
            onDrag(ll.lat, ll.lng);
          }
        },
      }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showMapPreview?: boolean;
}

export default function LocationPickerInner({ value, onChange, placeholder, showMapPreview = true }: Props) {
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSelectedLabelRef = useRef<string | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setNotFound(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const results = await searchSuggestions(value);
      setSearching(false);
      setSuggestions(results);
      setShowSuggestions(true);
      setNotFound(results.length === 0);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const handleSelect = (result: GeocodeResult) => {
    onChange(result.label);
    lastSelectedLabelRef.current = result.label;
    setPos([result.lat, result.lng]);
    setSuggestions([]);
    setShowSuggestions(false);
    setNotFound(false);
  };

  const handleDrag = async (lat: number, lng: number) => {
    setPos([lat, lng]);
    const label = await reverseGeocode(lat, lng);
    lastSelectedLabelRef.current = label;
    onChange(label);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          className="w-full border rounded-md px-3 py-2 text-sm"
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            if (showMapPreview && lastSelectedLabelRef.current && next !== lastSelectedLabelRef.current) {
              // User edited the address text after selecting a location; clear stale map preview.
              setPos(null);
            }
            onChange(next);
            if (!next.trim()) {
              lastSelectedLabelRef.current = null;
              if (showMapPreview) setPos(null);
            }
            setNotFound(false);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder={placeholder ?? "e.g. Da'an Park, Taipei"}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
            {suggestions.map((result) => (
              <button
                key={`${result.lat}-${result.lng}-${result.label}`}
                type="button"
                onClick={() => handleSelect(result)}
                className="block w-full border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 last:border-b-0"
              >
                {result.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {searching && value.trim().length >= 3 && (
        <p className="text-xs text-gray-400">Searching addresses…</p>
      )}

      {notFound && (
        <p className="text-xs text-red-500">Location not found. Try a more specific address.</p>
      )}

      {showMapPreview && pos && (
        <>
          <MapContainer
            center={pos}
            zoom={15}
            style={{ height: 240 }}
            className="w-full rounded-lg border border-gray-200"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyTo center={pos} />
            <DraggableMarker position={pos} onDrag={handleDrag} />
          </MapContainer>
          <p className="text-xs text-gray-400">Drag the pin to fine-tune the location.</p>
        </>
      )}
    </div>
  );
}
