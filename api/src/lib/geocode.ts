import { logger } from './logger';

/** Resolves a free-text address to coordinates via Google's Geocoding API. Returns null on any failure — geocoding is a best-effort enhancement, never a blocker for saving a listing. */
export async function geocodeAddress(
  apiKey: string,
  address: string,
  city: string,
  country: string
): Promise<{ latitude: number; longitude: number } | null> {
  const query = [address, city, country === 'DO' ? 'Dominican Republic' : country]
    .filter(Boolean)
    .join(', ');
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as {
      status: string;
      results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    };
    if (data.status !== 'OK' || !data.results[0]) return null;
    const { lat, lng } = data.results[0].geometry.location;
    return { latitude: lat, longitude: lng };
  } catch (err) {
    logger.error('Geocoding request failed', { error: err, query });
    return null;
  }
}
