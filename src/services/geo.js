// Geospatial utility functions for Halte

/**
 * Calculates distance in kilometers between two coordinates using Haversine formula
 */
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Formats distance nicely (e.g. "350 m" or "2.4 km")
 */
export function formatDistance(distanceKm) {
  if (distanceKm == null || isNaN(distanceKm)) return "-";
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Calculates compass heading bearing (0 - 359 degrees) from coord1 to coord2
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(deg2rad(lon2 - lon1)) * Math.cos(deg2rad(lat2));
  const x =
    Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
    Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(deg2rad(lon2 - lon1));
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Default Jakarta central anchor coordinates (Monumen Nasional)
 */
export const JAKARTA_CENTER = {
  lat: -6.175392,
  lon: 106.827153,
  name: "Monas / Pusat Jakarta"
};

/**
 * Popular landmarks / hubs for quick trip planning
 */
export const POPULAR_LOCATIONS = [
  { id: "monas", name: "Monumen Nasional (Monas)", lat: -6.1754, lon: 106.8272 },
  { id: "bundaran-hi", name: "Bundaran HI / Grand Indonesia", lat: -6.1950, lon: 106.8230 },
  { id: "blok-m", name: "Terminal Blok M / CSW", lat: -6.2433, lon: 106.8018 },
  { id: "dukuh-atas", name: "Transport Hub Dukuh Atas / Sudirman", lat: -6.2008, lon: 106.8229 },
  { id: "senayan", name: "Gelora Bung Karno / FX Senayan", lat: -6.2255, lon: 106.8021 },
  { id: "manggarai", name: "Stasiun Manggarai Sentral", lat: -6.2099, lon: 106.8502 },
  { id: "kota", name: "Kota Tua / Stasiun Jakarta Kota", lat: -6.1376, lon: 106.8146 },
  { id: "ragunan", name: "Taman Margasatwa Ragunan", lat: -6.3040, lon: 106.8202 }
];
