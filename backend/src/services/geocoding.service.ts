import { logger } from '../utils/logger';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

// Fallback map for common Serbian/regional cities
const CITY_COORDS: Record<string, GeoPoint> = {
  // Vojvodina
  'novi sad': { lat: 45.2671, lon: 19.8335 },
  'futog': { lat: 45.2500, lon: 19.7167 },
  'petrovaradin': { lat: 45.2478, lon: 19.8681 },
  'sremska kamenica': { lat: 45.2167, lon: 19.8500 },
  'veternik': { lat: 45.2833, lon: 19.7667 },
  'kać': { lat: 45.3167, lon: 19.9167 },
  'kac': { lat: 45.3167, lon: 19.9167 },
  'temerin': { lat: 45.4083, lon: 19.8917 },
  'bečej': { lat: 45.6167, lon: 20.0333 },
  'becej': { lat: 45.6167, lon: 20.0333 },
  'vrbas': { lat: 45.5667, lon: 19.6500 },
  'sombor': { lat: 45.7722, lon: 19.1139 },
  'subotica': { lat: 46.1000, lon: 19.6667 },
  'zrenjanin': { lat: 45.3833, lon: 20.3833 },
  'kikinda': { lat: 45.8333, lon: 20.4667 },
  'pančevo': { lat: 44.8708, lon: 20.6403 },
  'pancevo': { lat: 44.8708, lon: 20.6403 },
  'sremska mitrovica': { lat: 44.9719, lon: 19.6114 },
  'ruma': { lat: 45.0086, lon: 19.8231 },
  'šid': { lat: 45.1264, lon: 19.2181 },
  'sid': { lat: 45.1264, lon: 19.2181 },
  // Srbija
  'beograd': { lat: 44.8176, lon: 20.4569 },
  'belgrade': { lat: 44.8176, lon: 20.4569 },
  'nis': { lat: 43.3209, lon: 21.8954 },
  'niš': { lat: 43.3209, lon: 21.8954 },
  'kragujevac': { lat: 44.0165, lon: 20.9114 },
  'cacak': { lat: 43.8914, lon: 20.3497 },
  'čačak': { lat: 43.8914, lon: 20.3497 },
  'kraljevo': { lat: 43.7233, lon: 20.6894 },
  'novi pazar': { lat: 43.1367, lon: 20.5122 },
  'uzice': { lat: 43.8500, lon: 19.8500 },
  'užice': { lat: 43.8500, lon: 19.8500 },
  'valjevo': { lat: 44.2742, lon: 19.8831 },
  'sabac': { lat: 44.7500, lon: 19.6833 },
  'šabac': { lat: 44.7500, lon: 19.6833 },
  'smederevo': { lat: 44.6631, lon: 20.9278 },
  'leskovac': { lat: 42.9981, lon: 21.9461 },
  'vranje': { lat: 42.5500, lon: 21.9000 },
  'zajecar': { lat: 43.9044, lon: 22.2719 },
  'zaječar': { lat: 43.9044, lon: 22.2719 },
  'pirot': { lat: 43.1528, lon: 22.5861 },
  'prokuplje': { lat: 43.2333, lon: 21.5833 },
  'jagodina': { lat: 43.9769, lon: 21.2611 },
  'pozarevac': { lat: 44.6208, lon: 21.1875 },
  'požarevac': { lat: 44.6208, lon: 21.1875 },
  // Region
  'sarajevo': { lat: 43.8563, lon: 18.4131 },
  'zagreb': { lat: 45.8150, lon: 15.9819 },
  'ljubljana': { lat: 46.0569, lon: 14.5058 },
  'podgorica': { lat: 42.4304, lon: 19.2594 },
  'skopje': { lat: 41.9965, lon: 21.4314 },
};

export async function geocodeCity(city: string): Promise<GeoPoint | null> {
  const key = city.toLowerCase().trim();

  // Try fallback map first (instant, no network needed)
  if (CITY_COORDS[key]) {
    logger.info(`Geocoded "${city}" from local map`);
    return CITY_COORDS[key];
  }

  // Try Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'UDD-Forensics-App/1.0 (university project)' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.warn(`Nominatim HTTP ${response.status} for city: ${city}`);
      return null;
    }

    const results = (await response.json()) as NominatimResult[];
    if (!results.length) {
      logger.warn(`Nominatim returned no results for city: ${city}`);
      return null;
    }

    const point = { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
    logger.info(`Geocoded "${city}" via Nominatim → ${point.lat}, ${point.lon}`);
    return point;
  } catch (err) {
    logger.warn(`Nominatim request failed for "${city}": ${(err as Error).message}`);
    return null;
  }
}
