// Transjakarta TiJe API Client & Local GTFS Data Access
import localRoutes from "../data/routes.json";
import localStops from "../data/stops.json";
import localShapes from "../data/shapes.json";
import corridorsData from "../data/corridors.json";
import { getDistanceKm } from "./geo";

const TIJE_BASE_URL = "/api/tj"; // Routed via Vite dev proxy
const DIRECT_API_URL = "https://tijeapi.transjakarta.co.id/v1";

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Generate a consistent device ID for guest sessions
 */
function getDeviceId() {
  let id = localStorage.getItem("halte_device_id");
  if (!id) {
    id = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    localStorage.setItem("halte_device_id", id);
  }
  return id;
}

/**
 * Obtain a valid JWT guest session token from TiJe
 */
export async function getAuthToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiry > now + 60000) {
    return cachedToken;
  }

  const stored = localStorage.getItem("halte_tj_token");
  const storedExp = localStorage.getItem("halte_tj_token_exp");
  if (stored && storedExp && parseInt(storedExp, 10) > now + 60000) {
    cachedToken = stored;
    tokenExpiry = parseInt(storedExp, 10);
    return cachedToken;
  }

  try {
    const deviceId = getDeviceId();
    const res = await fetch(`${TIJE_BASE_URL}/auth/login/guest`, {
      method: "POST",
      headers: {
        "x-app-version": "2.11.0",
        "x-device-id": deviceId,
        "x-lang": "id",
        "x-app-os": "android",
        "x-app-os-version": "12",
        "x-app-platform": "32",
        "x-device-model": "Samsung|SM-F741N",
        "User-Agent": "okhttp/4.12.0",
        "accept": "application/json",
        "content-type": "application/json",
        "x-skip-auth": "true"
      },
      body: JSON.stringify({ device_id: deviceId })
    });

    if (res.ok) {
      const data = await res.json();
      const token = data?.token || data?.data?.token;
      if (token) {
        cachedToken = token;
        tokenExpiry = now + (24 * 3600 * 1000); // 24 hours
        localStorage.setItem("halte_tj_token", token);
        localStorage.setItem("halte_tj_token_exp", tokenExpiry.toString());
        return token;
      }
    }
  } catch (err) {
    console.warn("[Halte API] TiJe guest authentication failed, operating in offline/cached mode:", err.message);
  }
  return null;
}

/**
 * Standard headers for TiJe API calls
 */
async function getHeaders(token) {
  const deviceId = getDeviceId();
  const headers = {
    "x-app-version": "2.11.0",
    "x-device-id": deviceId,
    "x-lang": "id",
    "x-app-os": "android",
    "x-app-os-version": "12",
    "x-app-platform": "32",
    "x-device-model": "Samsung|SM-F741N",
    "User-Agent": "okhttp/4.12.0",
    "accept": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    headers["x-skip-auth"] = "true";
  }
  return headers;
}

/**
 * Get all routes (BRT, Metrotrans, Mikrotrans, Rail)
 */
export async function getRoutes() {
  try {
    const token = await getAuthToken();
    if (token) {
      const headers = await getHeaders(token);
      const res = await fetch(`${TIJE_BASE_URL}/route`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          // Merge API live route statuses with our rich local dataset
          return mergeRoutes(json.data, localRoutes);
        }
      }
    }
  } catch (e) {
    // Handled by local fallback
  }
  return localRoutes;
}

function mergeRoutes(apiRoutes, localList) {
  const apiMap = new Map(apiRoutes.map(r => [r.route_id, r]));
  return localList.map(lr => {
    const live = apiMap.get(lr.id);
    if (!live) return lr;
    return {
      ...lr,
      livePrice: live.price,
      liveFacilities: live.facilities || []
    };
  });
}

/**
 * Fetch detailed route stops and inbound/outbound legs
 */
export async function getRouteDetails(routeId) {
  // Try live API first
  try {
    const token = await getAuthToken();
    if (token) {
      const headers = await getHeaders(token);
      const res = await fetch(`${TIJE_BASE_URL}/route/${encodeURIComponent(routeId)}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.route) {
          return {
            source: "live_tije",
            route: json.data.route,
            inbound: json.data.inbound,
            outbound: json.data.outbound,
            facilities: json.data.facilities || []
          };
        }
      }
    }
  } catch (e) {
    // Fallback
  }

  // Local fallback
  const found = localRoutes.find(r => r.id === routeId || r.code === routeId);
  if (!found) return null;

  const stopsMap = new Map(localStops.map(s => [s.id, s]));
  const outboundStops = (found.outboundStops || []).map(id => stopsMap.get(id)).filter(Boolean);
  const inboundStops = (found.inboundStops || []).map(id => stopsMap.get(id)).filter(Boolean);

  return {
    source: "local_gtfs",
    route: found,
    outbound: {
      headsign: found.outboundHeadsign || found.name.split("-")[1]?.trim() || "Tujuan Akhir",
      stops: outboundStops
    },
    inbound: {
      headsign: found.inboundHeadsign || found.name.split("-")[0]?.trim() || "Keberangkatan Awal",
      stops: inboundStops
    },
    facilities: ["accessible for all", "toilet", "praying area"]
  };
}

/**
 * Fetch nearby stops based on latitude and longitude
 */
export async function getNearbyStops(lat, lon, limit = 15) {
  try {
    const token = await getAuthToken();
    if (token) {
      const headers = await getHeaders(token);
      const res = await fetch(`${TIJE_BASE_URL}/bus-stop?latitude=${lat}&longitude=${lon}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          return json.data.map(s => ({
            id: s.stop_id,
            name: s.stop_name,
            code: s.platform_code || s.stop_id,
            lat: s.stop_lat,
            lon: s.stop_lon,
            distance: s.distance, // km
            facilities: s.facilities || [],
            type: s.bus_stop_type || "halte",
            isBRT: s.bus_stop_type === "halte"
          }));
        }
      }
    }
  } catch (e) {
    // fallback to local calculation
  }

  // Calculate distance from local stops
  return localStops
    .map(s => {
      const d = getDistanceKm(lat, lon, s.lat, s.lon);
      return { ...s, distance: d };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/**
 * Fetch live fleet positions near a coordinate
 */
export async function getLiveBusesFromAPI(lat, lon, radius = 5) {
  try {
    const token = await getAuthToken();
    if (token) {
      const headers = await getHeaders(token);
      headers["content-type"] = "application/json";
      const res = await fetch(`${TIJE_BASE_URL}/bus`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          radius,
          event: "change_loc"
        })
      });
      if (res.ok) {
        const json = await res.json();
        return {
          source: "tije_rest",
          buses: json.data?.buses || [],
          polyline: json.data?.polyline || ""
        };
      }
    }
  } catch (e) {
    console.warn("[Halte API] Could not poll /v1/bus:", e.message);
  }
  return { source: "unavailable", buses: [], polyline: "" };
}

/**
 * Get stop details with all lines passing through it
 */
export function getStopById(stopId) {
  return localStops.find(s => s.id === stopId || s.code === stopId);
}

/**
 * Search stops and routes
 */
export function searchTransportation(query) {
  if (!query || query.trim().length === 0) {
    return { routes: [], stops: [] };
  }
  const q = query.trim().toLowerCase();

  const matchingRoutes = localRoutes.filter(r =>
    r.code.toLowerCase().includes(q) ||
    r.name.toLowerCase().includes(q) ||
    r.description.toLowerCase().includes(q) ||
    (r.category && r.category.toLowerCase().includes(q))
  ).slice(0, 10);

  const matchingStops = localStops.filter(s =>
    s.name.toLowerCase().includes(q) ||
    (s.code && s.code.toLowerCase().includes(q))
  ).slice(0, 12);

  return { routes: matchingRoutes, stops: matchingStops };
}

export { localRoutes, localStops, localShapes, corridorsData };
