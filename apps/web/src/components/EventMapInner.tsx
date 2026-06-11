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

async function geocode(query: string): Promise<[number, number] | null> {
  if (!query.trim()) return null;

  // Google Geocoding — best multilingual accuracy, any country
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const data = await res.json();
      const loc = data?.results?.[0]?.geometry?.location;
      if (loc && typeof loc.lat === 'number') return [loc.lat, loc.lng];
    } catch { /* fall through to Nominatim */ }
  }

  // Nominatim fallback — no country or language restrictions, globally inclusive
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'User-Agent': 'JudienApp/1.0' } },
    );
    const data = await res.json();
    if (!data.length) return null;
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {
    return null;
  }
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
