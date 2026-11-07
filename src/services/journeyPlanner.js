// Halte Journey Planner Engine
import { localRoutes, localStops } from "./api";
import { getDistanceKm, formatDistance } from "./geo";

const WALKING_SPEED_KMH = 4.5; // ~75m per minute
const AVERAGE_BUS_SPEED_KMH = 22; // In Jakarta traffic / busway
const AVERAGE_RAIL_SPEED_KMH = 38; // MRT / LRT / KRL
const AVERAGE_WAIT_TIME_MINS = 6;

/**
 * Plan journeys between origin and destination
 * @param {Object} origin - { lat, lon, name, id? }
 * @param {Object} destination - { lat, lon, name, id? }
 * @param {string} preference - 'fastest' | 'fewest_transfers' | 'cheapest' | 'simplest'
 */
export function planJourney(origin, destination, preference = "fastest") {
  if (!origin || !destination) return [];

  // Find nearby boarding stops (within 1.2 km)
  const originStops = findStopsNear(origin.lat, origin.lon, 1.2);
  const destStops = findStopsNear(destination.lat, destination.lon, 1.2);

  if (originStops.length === 0 || destStops.length === 0) {
    return [];
  }

  const solutions = [];

  // 1. Check Direct Options (0 Transfer)
  const directSolutions = findDirectRoutes(origin, destination, originStops, destStops);
  solutions.push(...directSolutions);

  // 2. Check 1-Transfer Options
  const transferSolutions = findTransferRoutes(origin, destination, originStops, destStops);
  solutions.push(...transferSolutions);

  // 3. Fallback: If no direct or transfer route found, connect through major hubs (Monas or Dukuh Atas)
  if (solutions.length === 0) {
    const hubSolution = buildMajorHubFallback(origin, destination, originStops, destStops);
    if (hubSolution) solutions.push(hubSolution);
  }

  // Deduplicate solutions with identical route sequences
  const uniqueSolutions = [];
  const seenKeys = new Set();
  for (const sol of solutions) {
    const key = sol.legs.map(l => l.route ? l.route.code : "walk").join("->");
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueSolutions.push(sol);
    }
  }

  // Sort by user preference
  return rankSolutions(uniqueSolutions, preference);
}

/**
 * Find stops within maxDistanceKm of coordinate
 */
function findStopsNear(lat, lon, maxDistanceKm = 1.0) {
  return localStops
    .map(s => ({
      stop: s,
      distanceKm: getDistanceKm(lat, lon, s.lat, s.lon)
    }))
    .filter(item => item.distanceKm <= maxDistanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 8);
}

/**
 * Search for direct routes between origin stops and destination stops
 */
function findDirectRoutes(origin, destination, originStops, destStops) {
  const results = [];
  const originStopIds = new Set(originStops.map(o => o.stop.id));
  const destStopIds = new Set(destStops.map(d => d.stop.id));

  for (const route of localRoutes) {
    // Check outbound
    const outStops = route.outboundStops || [];
    const inStops = route.inboundStops || [];

    const outBoardIdx = outStops.findIndex(id => originStopIds.has(id));
    const outAlightIdx = outStops.findIndex(id => destStopIds.has(id));

    if (outBoardIdx !== -1 && outAlightIdx !== -1 && outBoardIdx < outAlightIdx) {
      const boardStop = localStops.find(s => s.id === outStops[outBoardIdx]);
      const alightStop = localStops.find(s => s.id === outStops[outAlightIdx]);
      const stopCount = outAlightIdx - outBoardIdx;
      results.push(createDirectJourney(origin, destination, route, boardStop, alightStop, stopCount, outStops.slice(outBoardIdx, outAlightIdx + 1)));
      continue;
    }

    // Check inbound
    const inBoardIdx = inStops.findIndex(id => originStopIds.has(id));
    const inAlightIdx = inStops.findIndex(id => destStopIds.has(id));

    if (inBoardIdx !== -1 && inAlightIdx !== -1 && inBoardIdx < inAlightIdx) {
      const boardStop = localStops.find(s => s.id === inStops[inBoardIdx]);
      const alightStop = localStops.find(s => s.id === inStops[inAlightIdx]);
      const stopCount = inAlightIdx - inBoardIdx;
      results.push(createDirectJourney(origin, destination, route, boardStop, alightStop, stopCount, inStops.slice(inBoardIdx, inAlightIdx + 1)));
    }
  }

  return results.slice(0, 5);
}

function createDirectJourney(origin, destination, route, boardStop, alightStop, stopCount, intermediateStopIds) {
  const walkOriginKm = getDistanceKm(origin.lat, origin.lon, boardStop.lat, boardStop.lon);
  const walkDestKm = getDistanceKm(alightStop.lat, alightStop.lon, destination.lat, destination.lon);

  const walkOriginMins = Math.max(1, Math.round((walkOriginKm / WALKING_SPEED_KMH) * 60));
  const walkDestMins = Math.max(1, Math.round((walkDestKm / WALKING_SPEED_KMH) * 60));

  const isRail = route.category === "mrt" || route.category === "lrt" || route.category === "krl";
  const speedKmh = isRail ? AVERAGE_RAIL_SPEED_KMH : AVERAGE_BUS_SPEED_KMH;
  const transitDistanceKm = getDistanceKm(boardStop.lat, boardStop.lon, alightStop.lat, alightStop.lon) * 1.25;
  const transitMins = Math.max(3, Math.round((transitDistanceKm / speedKmh) * 60));
  const waitMins = AVERAGE_WAIT_TIME_MINS;

  const totalDurationMins = walkOriginMins + waitMins + transitMins + walkDestMins;

  let fare = 3500;
  if (route.category === "mikrotrans" || route.fare === 0) fare = 0;
  else if (route.category === "mrt") fare = 8000;
  else if (route.category === "lrt") fare = 5000;
  else if (route.category === "krl") fare = 4000;

  const stopMap = new Map(localStops.map(s => [s.id, s]));
  const fullStops = intermediateStopIds.map(id => stopMap.get(id)).filter(Boolean);

  return {
    id: `direct-${route.id}-${boardStop.id}-${alightStop.id}`,
    type: "DIRECT",
    transfers: 0,
    totalDurationMins,
    transitDurationMins: transitMins,
    totalWalkingDistanceKm: walkOriginKm + walkDestKm,
    fare,
    fareDisplay: fare === 0 ? "Gratis (Rp 0)" : `Rp ${fare.toLocaleString("id-ID")}`,
    legs: [
      {
        type: "WALK",
        instruction: `Jalan kaki ke ${boardStop.name}`,
        distanceKm: walkOriginKm,
        durationMins: walkOriginMins,
        fromName: origin.name || "Lokasi Awal",
        toName: boardStop.name
      },
      {
        type: "TRANSIT",
        route,
        fromStop: boardStop,
        toStop: alightStop,
        stopCount,
        durationMins: transitMins,
        headway: route.headwayMinutes || "5 - 10 menit",
        intermediateStops: fullStops
      },
      {
        type: "WALK",
        instruction: `Jalan kaki ke tujuan akhir`,
        distanceKm: walkDestKm,
        durationMins: walkDestMins,
        fromName: alightStop.name,
        toName: destination.name || "Tujuan Akhir"
      }
    ]
  };
}

/**
 * Search for 1-transfer routes
 */
function findTransferRoutes(origin, destination, originStops, destStops) {
  const results = [];
  const originRoutes = getRoutesServingStops(originStops.map(o => o.stop));
  const destRoutes = getRoutesServingStops(destStops.map(d => d.stop));

  const destRouteIds = new Set(destRoutes.map(r => r.id));

  for (const r1 of originRoutes) {
    if (destRouteIds.has(r1.id)) continue; // Handled by direct

    const r1Stops = new Set([...(r1.outboundStops || []), ...(r1.inboundStops || [])]);

    for (const r2 of destRoutes) {
      if (r1.id === r2.id) continue;

      const r2Stops = [...(r2.outboundStops || []), ...(r2.inboundStops || [])];
      // Find intersection stop
      const transferStopId = r2Stops.find(sId => r1Stops.has(sId));
      if (!transferStopId) continue;

      const transferStop = localStops.find(s => s.id === transferStopId);
      if (!transferStop) continue;

      // Pick best boarding stop for r1 and alighting stop for r2
      const boardStop = pickBestStop(originStops.map(o => o.stop), r1);
      const alightStop = pickBestStop(destStops.map(d => d.stop), r2);
      if (!boardStop || !alightStop || boardStop.id === transferStop.id || alightStop.id === transferStop.id) continue;

      const sol = createTransferJourney(origin, destination, r1, r2, boardStop, transferStop, alightStop);
      if (sol) {
        results.push(sol);
        if (results.length >= 6) return results;
      }
    }
  }

  return results;
}

function getRoutesServingStops(stops) {
  const routes = [];
  const seen = new Set();
  for (const s of stops) {
    for (const r of (s.routes || [])) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        const full = localRoutes.find(lr => lr.id === r.id);
        if (full) routes.push(full);
      }
    }
  }
  return routes;
}

function pickBestStop(stops, route) {
  const routeStops = new Set([...(route.outboundStops || []), ...(route.inboundStops || [])]);
  return stops.find(s => routeStops.has(s.id)) || stops[0];
}

function createTransferJourney(origin, destination, r1, r2, boardStop, transferStop, alightStop) {
  const walkOriginKm = getDistanceKm(origin.lat, origin.lon, boardStop.lat, boardStop.lon);
  const walkDestKm = getDistanceKm(alightStop.lat, alightStop.lon, destination.lat, destination.lon);

  const walkOriginMins = Math.max(1, Math.round((walkOriginKm / WALKING_SPEED_KMH) * 60));
  const walkDestMins = Math.max(1, Math.round((walkDestKm / WALKING_SPEED_KMH) * 60));

  const d1Km = getDistanceKm(boardStop.lat, boardStop.lon, transferStop.lat, transferStop.lon) * 1.2;
  const d2Km = getDistanceKm(transferStop.lat, transferStop.lon, alightStop.lat, alightStop.lon) * 1.2;

  const t1Mins = Math.max(4, Math.round((d1Km / AVERAGE_BUS_SPEED_KMH) * 60));
  const t2Mins = Math.max(4, Math.round((d2Km / AVERAGE_BUS_SPEED_KMH) * 60));

  const transferWaitMins = 5;
  const initialWaitMins = 5;

  const totalDurationMins = walkOriginMins + initialWaitMins + t1Mins + transferWaitMins + t2Mins + walkDestMins;

  // Integrated Fare calculation
  // Free transfer within BRT network (Rp 3.500 total), Rp 0 for Mikrotrans
  let fare = 3500;
  if (r1.category === "mikrotrans" && r2.category === "mikrotrans") {
    fare = 0;
  } else if (r1.category === "brt" && r2.category === "brt") {
    fare = 3500; // Integrasi halte tertutup Transjakarta Rp 3.500
  } else if (r1.category === "mrt" || r2.category === "mrt") {
    fare = 3500 + 7000;
  } else {
    fare = 3500;
  }

  return {
    id: `transfer-${r1.id}-${r2.id}-${transferStop.id}`,
    type: "1_TRANSFER",
    transfers: 1,
    totalDurationMins,
    transitDurationMins: t1Mins + t2Mins,
    totalWalkingDistanceKm: walkOriginKm + walkDestKm,
    fare,
    fareDisplay: fare === 0 ? "Gratis (Rp 0)" : `Rp ${fare.toLocaleString("id-ID")}`,
    transferStop,
    legs: [
      {
        type: "WALK",
        instruction: `Jalan kaki ke ${boardStop.name}`,
        distanceKm: walkOriginKm,
        durationMins: walkOriginMins,
        fromName: origin.name || "Lokasi Awal",
        toName: boardStop.name
      },
      {
        type: "TRANSIT",
        route: r1,
        fromStop: boardStop,
        toStop: transferStop,
        stopCount: Math.max(2, Math.round(d1Km / 0.8)),
        durationMins: t1Mins,
        headway: r1.headwayMinutes || "5 - 10 menit"
      },
      {
        type: "TRANSFER",
        instruction: `Transit di ${transferStop.name} — berganti ke ${r2.code} (${r2.name})`,
        transferStop,
        durationMins: transferWaitMins
      },
      {
        type: "TRANSIT",
        route: r2,
        fromStop: transferStop,
        toStop: alightStop,
        stopCount: Math.max(2, Math.round(d2Km / 0.8)),
        durationMins: t2Mins,
        headway: r2.headwayMinutes || "5 - 10 menit"
      },
      {
        type: "WALK",
        instruction: `Jalan kaki ke tujuan akhir`,
        distanceKm: walkDestKm,
        durationMins: walkDestMins,
        fromName: alightStop.name,
        toName: destination.name || "Tujuan Akhir"
      }
    ]
  };
}

function buildMajorHubFallback(origin, destination, originStops, destStops) {
  const boardStop = originStops[0]?.stop;
  const alightStop = destStops[0]?.stop;
  if (!boardStop || !alightStop) return null;

  const corridor1 = localRoutes.find(r => r.id === "1") || localRoutes[0];
  const directDist = getDistanceKm(boardStop.lat, boardStop.lon, alightStop.lat, alightStop.lon);
  const transitMins = Math.max(10, Math.round((directDist / AVERAGE_BUS_SPEED_KMH) * 60));

  return {
    id: `hub-fallback-${boardStop.id}-${alightStop.id}`,
    type: "ESTIMATED_CORRIDOR",
    transfers: 1,
    totalDurationMins: transitMins + 15,
    transitDurationMins: transitMins,
    totalWalkingDistanceKm: 0.6,
    fare: 3500,
    fareDisplay: "Rp 3.500 (Estimasi Koridor)",
    legs: [
      {
        type: "WALK",
        instruction: `Jalan kaki ke ${boardStop.name}`,
        distanceKm: 0.3,
        durationMins: 4,
        fromName: origin.name,
        toName: boardStop.name
      },
      {
        type: "TRANSIT",
        route: corridor1,
        fromStop: boardStop,
        toStop: alightStop,
        stopCount: Math.max(3, Math.round(directDist / 0.9)),
        durationMins: transitMins,
        headway: "4 - 7 menit"
      },
      {
        type: "WALK",
        instruction: `Tiba di dekat ${destination.name}`,
        distanceKm: 0.3,
        durationMins: 4,
        fromName: alightStop.name,
        toName: destination.name
      }
    ]
  };
}

/**
 * Rank solutions based on preference
 */
function rankSolutions(solutions, preference) {
  const copy = [...solutions];
  switch (preference) {
    case "fastest":
      return copy.sort((a, b) => a.totalDurationMins - b.totalDurationMins);
    case "fewest_transfers":
      return copy.sort((a, b) => {
        if (a.transfers !== b.transfers) return a.transfers - b.transfers;
        return a.totalDurationMins - b.totalDurationMins;
      });
    case "cheapest":
      return copy.sort((a, b) => {
        if (a.fare !== b.fare) return a.fare - b.fare;
        return a.totalDurationMins - b.totalDurationMins;
      });
    case "simplest":
      return copy.sort((a, b) => {
        const costA = (a.transfers * 15) + (a.totalWalkingDistanceKm * 10);
        const costB = (b.transfers * 15) + (b.totalWalkingDistanceKm * 10);
        return costA - costB;
      });
    default:
      return copy;
  }
}
