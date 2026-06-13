import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { useEffect } from 'react';
import { useLang } from '../i18n';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
export const hasMapsKey = Boolean(MAPS_KEY);

interface PropertyMapProps {
  lat: number;
  lng: number;
  title: string;
  zoom?: number;
}

function FitBounds({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (map) map.setCenter({ lat, lng });
  }, [map, lat, lng]);
  return null;
}

export default function PropertyMap({ lat, lng, title, zoom = 15 }: PropertyMapProps) {
  const { t } = useLang();
  if (!MAPS_KEY) {
    // Fallback: show a static link to Google Maps
    const href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="map-fallback"
        aria-label={`View ${title} on Google Maps`}
      >
        <span className="map-fallback-icon">📍</span>
        <span>{t('map.open')}</span>
      </a>
    );
  }

  return (
    <APIProvider apiKey={MAPS_KEY}>
      <div className="property-map-wrap">
        <Map
          mapId="meridian-property-map"
          defaultCenter={{ lat, lng }}
          defaultZoom={zoom}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
          aria-label={`Map showing location of ${title}`}
        >
          <FitBounds lat={lat} lng={lng} />
          <AdvancedMarker position={{ lat, lng }} title={title}>
            <Pin
              background="#c8a24b"
              borderColor="#9a7830"
              glyphColor="#131a1e"
            />
          </AdvancedMarker>
        </Map>
      </div>
    </APIProvider>
  );
}

// ── Multi-property map for search results ─────────────────────────────────
export interface MapPin {
  id: number;
  lat: number;
  lng: number;
  title: string;
  priceCents: number;
  currency: string;
}

interface SearchMapProps {
  pins: MapPin[];
  center?: { lat: number; lng: number };
  onPinClick?: (id: number) => void;
}

export function SearchMap({ pins, center, onPinClick }: SearchMapProps) {
  if (!MAPS_KEY) return null;

  const defaultCenter = center ?? (pins[0]
    ? { lat: pins[0].lat, lng: pins[0].lng }
    : { lat: 18.7357, lng: -70.1627 }); // DR geographic center

  return (
    <APIProvider apiKey={MAPS_KEY}>
      <div className="search-map-wrap">
        <Map
          mapId="meridian-search-map"
          defaultCenter={defaultCenter}
          defaultZoom={9}
          gestureHandling="greedy"
          style={{ width: '100%', height: '100%' }}
          aria-label="Map of property listings"
        >
          {pins.map((pin) => (
            <AdvancedMarker
              key={pin.id}
              position={{ lat: pin.lat, lng: pin.lng }}
              title={pin.title}
              onClick={() => onPinClick?.(pin.id)}
            >
              <div className="map-price-pin">
                <span>
                  {pin.currency === 'USD' ? '$' : 'DOP '}
                  {Math.round(pin.priceCents / 100).toLocaleString()}
                </span>
              </div>
            </AdvancedMarker>
          ))}
        </Map>
      </div>
    </APIProvider>
  );
}
