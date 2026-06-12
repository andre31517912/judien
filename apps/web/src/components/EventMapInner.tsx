'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const TW_CITIES = [
  '台北市','臺北市','新北市','桃園市','台中市','臺中市','台南市','臺南市',
  '高雄市','基隆市','新竹市','嘉義市','宜蘭縣','花蓮縣','台東縣','臺東縣',
  '苗栗縣','彰化縣','南投縣','雲林縣','嘉義縣','屏東縣','澎湖縣','金門縣',
  '連江縣','新竹縣',
];

function normalizeTaiwanAddress(q: string): string | null {
  if (!/[一-鿿]/.test(q)) return null;
  const city = TW_CITIES.find((c) => q.endsWith(c));
  if (!city) return null;
  const withoutCity = q.slice(0, q.length - city.length).trim();
  const districtMatch = withoutCity.match(/([一-鿿]+(區|鄉|鎮))$/);
  if (districtMatch) {
    const district = districtMatch[0];
    const street = withoutCity.slice(0, withoutCity.length - district.length).trim();
    return `${city}${district}${street}`;
  }
  return `${city}${withoutCity}`;
}

const TW_STRIP_PATTERNS = [
  /\d+(?:樓|F|之\d+)\s*$/,
  /\d+號\s*$/,
  /\d+弄\s*$/,
  /\d+巷\s*$/,
];

function stripTaiwanAddressTail(q: string): string | null {
  const trimmed = q.trim();
  for (const p of TW_STRIP_PATTERNS) {
    if (p.test(trimmed)) return trimmed.replace(p, '').trim();
  }
  return null;
}

function addressVariants(query: string): string[] {
  const normalized = normalizeTaiwanAddress(query);
  const seen = new Set<string>();
  const variants: string[] = [];
  const add = (s: string) => { if (s && !seen.has(s)) { seen.add(s); variants.push(s); } };
  add(query);
  if (normalized) add(normalized);
  let current = normalized ?? query;
  for (let i = 0; i < 4; i++) {
    const stripped = stripTaiwanAddressTail(current);
    if (!stripped) break;
    add(stripped);
    current = stripped;
  }
  return variants;
}

async function geocode(query: string): Promise<[number, number] | null> {
  if (!query.trim()) return null;
  const variants = addressVariants(query);

  // Google Geocoding — try each variant until we get a result
  if (GOOGLE_MAPS_API_KEY) {
    for (const v of variants) {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(v)}&key=${GOOGLE_MAPS_API_KEY}`,
        );
        const data = await res.json();
        const loc = data?.results?.[0]?.geometry?.location;
        if (loc && typeof loc.lat === 'number') return [loc.lat, loc.lng];
      } catch { /* try next variant */ }
    }
  }

  // Nominatim fallback — same progressive broadening
  for (const v of variants) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(v)}&limit=1`,
        { headers: { 'User-Agent': 'JudienApp/1.0' } },
      );
      const data = await res.json();
      if (data.length) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    } catch { /* continue */ }
  }
  return null;
}

interface Props {
  location: string;
  title?: string;
}

export default function EventMapInner({ location, title }: Props) {
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    geocode(location).then((result) => {
      setPos(result);
      setLoading(false);
    });
  }, [location]);

  if (loading) {
    return (
      <div className="w-full h-48 rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
        <span className="text-xs text-gray-400">Loading map…</span>
      </div>
    );
  }

  if (!pos) return null;

  return (
    <MapContainer
      center={pos}
      zoom={15}
      style={{ height: 200 }}
      className="w-full rounded-xl border border-gray-100"
      zoomControl={false}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={pos}>
        {title && <Popup>{title}</Popup>}
      </Marker>
    </MapContainer>
  );
}
