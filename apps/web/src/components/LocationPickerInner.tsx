'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconAnchor: [12, 41],
  iconSize: [25, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ─── Geocoding helpers ────────────────────────────────────────────────────────

interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// ─── Taiwan address normalizer ────────────────────────────────────────────────
// Taiwan addresses are officially big-to-small: 台北市大安區瑞安街208巷2號
// but people often type small-to-big:           瑞安街208巷2號大安區台北市
// Detect the reversed pattern and reorder so geocoders can find it.

const TW_CITIES = [
  '台北市','臺北市','新北市','桃園市','台中市','臺中市','台南市','臺南市',
  '高雄市','基隆市','新竹市','嘉義市','宜蘭縣','花蓮縣','台東縣','臺東縣',
  '苗栗縣','彰化縣','南投縣','雲林縣','嘉義縣','屏東縣','澎湖縣','金門縣',
  '連江縣','新竹縣',
];

function normalizeTaiwanAddress(q: string): string | null {
  if (!/[一-鿿]/.test(q)) return null;
  // Find a city name at the END — that signals reversed order
  const city = TW_CITIES.find((c) => q.endsWith(c));
  if (!city) return null; // city at start = already correct order
  const withoutCity = q.slice(0, q.length - city.length).trim();
  // Try to pull out a district (ends with 區/鄉/鎮) from the tail of the remainder
  const districtMatch = withoutCity.match(/([一-鿿]+(區|鄉|鎮))$/);
  if (districtMatch) {
    const district = districtMatch[0];
    const street = withoutCity.slice(0, withoutCity.length - district.length).trim();
    return `${city}${district}${street}`;
  }
  return `${city}${withoutCity}`;
}

// Strip the most granular Taiwan address token from the tail so we can retry
// with progressively broader queries when exact addresses aren't in OSM.
// Order: floor/sub-unit → house number → alley → lane
const TW_STRIP_PATTERNS = [
  /\d+(?:樓|F|之\d+)\s*$/,  // e.g. 2樓, 3F, 1之2
  /\d+號\s*$/,               // e.g. 2號
  /\d+弄\s*$/,               // e.g. 3弄
  /\d+巷\s*$/,               // e.g. 208巷
];

function stripTaiwanAddressTail(q: string): string | null {
  const trimmed = q.trim();
  for (const p of TW_STRIP_PATTERNS) {
    if (p.test(trimmed)) return trimmed.replace(p, '').trim();
  }
  return null;
}

// Build a list of progressively broader address variants to try in order
function addressVariants(query: string): string[] {
  const normalized = normalizeTaiwanAddress(query);
  const seen = new Set<string>();
  const variants: string[] = [];
  const add = (s: string) => { if (s && !seen.has(s)) { seen.add(s); variants.push(s); } };

  add(query);
  if (normalized) add(normalized);

  // Strip specificity from the normalized (correct-order) form
  let current = normalized ?? query;
  for (let i = 0; i < 4; i++) {
    const stripped = stripTaiwanAddressTail(current);
    if (!stripped) break;
    add(stripped);
    current = stripped;
  }
  return variants;
}

// Google Places autocomplete — no country restriction, returns results in the
// language closest to the query text so any language input works globally.
async function searchSuggestionsGoogle(query: string): Promise<GeocodeResult[]> {
  if (!GOOGLE_MAPS_API_KEY || !query.trim()) return [];
  try {
    const placeRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const placeData = await placeRes.json();
    const predictions = Array.isArray(placeData?.predictions) ? placeData.predictions.slice(0, 5) : [];
    if (!predictions.length) return [];

    const detailResults = await Promise.all(
      predictions.map(async (p: { place_id?: string; description?: string }) => {
        if (!p.place_id) return null;
        const detailRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(p.place_id)}&fields=geometry/location,formatted_address&key=${GOOGLE_MAPS_API_KEY}`,
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
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const data = await res.json();
    const first = Array.isArray(data?.results) ? data.results[0] : null;
    return first?.formatted_address ?? null;
  } catch {
    return null;
  }
}

// Nominatim fallback — globally inclusive, no country/language restrictions
async function nominatimSearch(q: string): Promise<GeocodeResult[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`,
      { headers: { 'User-Agent': 'JudienApp/1.0' } },
    );
    const data = await res.json();
    return (data as { lat: string; lon: string; display_name: string }[]).map((item) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      label: item.display_name,
    }));
  } catch {
    return [];
  }
}

async function searchSuggestionsNominatim(query: string): Promise<GeocodeResult[]> {
  if (!query.trim()) return [];
  // Try progressively broader address variants until Nominatim finds something
  for (const variant of addressVariants(query)) {
    const results = await nominatimSearch(variant);
    if (results.length > 0) return results;
  }
  return [];
}

async function searchSuggestions(query: string): Promise<GeocodeResult[]> {
  // Try Google with the normalized (correct-order) query first, then original
  const normalized = normalizeTaiwanAddress(query);
  const googleResults = await searchSuggestionsGoogle(normalized ?? query);
  if (googleResults.length > 0) return googleResults;
  // Fall back to Nominatim with progressive address broadening
  return searchSuggestionsNominatim(query);
}

async function reverseGeocodeNominatim(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'User-Agent': 'JudienApp/1.0' } },
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

function FlyTo({ center }: { center: [number, number] }) {
  const map = useMap();
  map.flyTo(center, 15, { duration: 0.8 });
  return null;
}

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
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={value}
          onChange={(e) => {
            const next = e.target.value;
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
          placeholder={placeholder ?? 'Search any address in any language…'}
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
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
