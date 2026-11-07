import { localRoutes, localStops } from "./api";
import { getDistanceKm } from "./geo";

const WALKING_SPEED_KMH = 4.5;
const BUS_SPEED_KMH = 22;
const WALK_RADIUS_KM = 1.2;

function minutesForDistance(distanceKm, speedKmh) {
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}

function nearbyStops(point) {
  return localStops
    .map((stop) => ({ stop, distanceKm: getDistanceKm(point.lat, point.lon, stop.lat, stop.lon) }))
    .filter(({ distanceKm }) => distanceKm <= WALK_RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 10);
}

function addEdge(graph, from, to, route, distanceKm, fromStopId) {
  if (!graph.has(from)) graph.set(from, []);
  graph.get(from).push({ to, route, distanceKm, fromStopId });
}

function buildTransitGraph() {
  const graph = new Map();
  for (const route of localRoutes) {
    for (const direction of ["outbound", "inbound"]) {
      const stopIds = route[`${direction}Stops`] || [];
      for (let index = 0; index < stopIds.length - 1; index += 1) {
        const from = localStops.find((stop) => stop.id === stopIds[index]);
        const to = localStops.find((stop) => stop.id === stopIds[index + 1]);
        if (!from || !to) continue;
        const distanceKm = getDistanceKm(from.lat, from.lon, to.lat, to.lon);
        addEdge(graph, from.id, to.id, route, distanceKm, from.id);
        addEdge(graph, to.id, from.id, route, distanceKm, to.id);
      }
    }
  }
  return graph;
}

function edgeCost(edge, preference, transfer) {
  const travelMinutes = minutesForDistance(edge.distanceKm, BUS_SPEED_KMH);
  if (preference === "fewest_transfers") return travelMinutes + (transfer ? 45 : 0);
  if (preference === "cheapest") return travelMinutes + (transfer ? 5 : 0);
  if (preference === "simplest") return travelMinutes + (transfer ? 25 : 0);
  return travelMinutes;
}

function stateKey(stopId, routeId) {
  return `${stopId}|${routeId || "WALK"}`;
}

function calculatePath(origin, destination, preference) {
  const graph = buildTransitGraph();
  const originAccess = nearbyStops(origin);
  const destinationAccess = nearbyStops(destination);
  if (!originAccess.length || !destinationAccess.length) return null;

  const destinationIds = new Set(destinationAccess.map(({ stop }) => stop.id));
  const best = new Map();
  const previous = new Map();
  const queue = [];
  const push = (item) => {
    queue.push(item);
    queue.sort((a, b) => a.cost - b.cost);
  };

  for (const access of originAccess) {
    const key = stateKey(access.stop.id, null);
    const cost = minutesForDistance(access.distanceKm, WALKING_SPEED_KMH);
    best.set(key, cost);
    push({ key, stopId: access.stop.id, routeId: null, cost });
  }

  let end = null;
  while (queue.length) {
    const current = queue.shift();
    if (current.cost !== best.get(current.key)) continue;
    if (destinationIds.has(current.stopId)) {
      end = current;
      break;
    }

    for (const edge of graph.get(current.stopId) || []) {
      const transfer = Boolean(current.routeId && current.routeId !== edge.route.id);
      const nextCost = current.cost + edgeCost(edge, preference, transfer);
      const nextKey = stateKey(edge.to, edge.route.id);
      if (nextCost >= (best.get(nextKey) ?? Infinity)) continue;
      best.set(nextKey, nextCost);
      previous.set(nextKey, { key: current.key, edge: { ...edge, transfer } });
      push({ key: nextKey, stopId: edge.to, routeId: edge.route.id, cost: nextCost });
    }
  }
  if (!end) return null;

  const edges = [];
  let cursor = end.key;
  while (previous.has(cursor)) {
    const step = previous.get(cursor);
    edges.unshift(step.edge);
    cursor = step.key;
  }
  const startStop = localStops.find((stop) => stop.id === cursor.split("|")[0]);
  const endStop = localStops.find((stop) => stop.id === end.stopId);
  if (!startStop || !endStop || !edges.length) return null;

  const legs = [];
  const firstDistance = getDistanceKm(origin.lat, origin.lon, startStop.lat, startStop.lon);
  if (firstDistance > 0.05) {
    legs.push({
      type: "WALK",
      instruction: `Jalan kaki ke ${startStop.name}`,
      distanceKm: firstDistance,
      durationMins: minutesForDistance(firstDistance, WALKING_SPEED_KMH),
      toStop: startStop
    });
  }

  let active = null;
  for (const edge of edges) {
    if (edge.transfer && active) {
      legs.push(active);
      active = null;
      const transferStop = localStops.find((stop) => stop.id === edge.fromStopId) || endStop;
      legs.push({ type: "TRANSFER", instruction: `Transit di ${transferStop.name}`, transferStop, durationMins: 2 });
    }
    if (!active || active.route.id !== edge.route.id) {
      if (active) legs.push(active);
      active = {
        type: "TRANSIT",
        route: edge.route,
        fromStop: localStops.find((stop) => stop.id === edge.fromStopId),
        toStop: localStops.find((stop) => stop.id === edge.to),
        stopCount: 0,
        durationMins: 0,
        intermediateStops: []
      };
    }
    const toStop = localStops.find((stop) => stop.id === edge.to);
    active.toStop = toStop;
    active.stopCount += 1;
    active.durationMins += minutesForDistance(edge.distanceKm, BUS_SPEED_KMH);
    if (toStop) active.intermediateStops.push(toStop);
  }
  if (active) legs.push(active);

  const finalDistance = getDistanceKm(endStop.lat, endStop.lon, destination.lat, destination.lon);
  if (finalDistance > 0.05) {
    legs.push({
      type: "WALK",
      instruction: `Jalan kaki ke ${destination.name || "tujuan"}`,
      distanceKm: finalDistance,
      durationMins: minutesForDistance(finalDistance, WALKING_SPEED_KMH),
      fromStop: endStop
    });
  }

  const transitLegs = legs.filter((leg) => leg.type === "TRANSIT");
  return {
    id: `${origin.lat}:${origin.lon}-${destination.lat}:${destination.lon}-${preference}`,
    transfers: Math.max(0, transitLegs.length - 1),
    totalDurationMins: legs.reduce((sum, leg) => sum + (leg.durationMins || 0), 0),
    transitDurationMins: transitLegs.reduce((sum, leg) => sum + leg.durationMins, 0),
    totalWalkingDistanceKm: legs.filter((leg) => leg.type === "WALK").reduce((sum, leg) => sum + (leg.distanceKm || 0), 0),
    fare: null,
    fareDisplay: "Tarif perlu dikonfirmasi operator",
    dataQuality: "Urutan halte bersumber dari GTFS Transjakarta; waktu tempuh adalah estimasi berbasis jarak.",
    legs
  };
}

export function planJourney(origin, destination, preference = "fastest") {
  if (!origin || !destination || (origin.id && destination.id && origin.id === destination.id)) return [];
  const journey = calculatePath(origin, destination, preference);
  return journey ? [journey] : [];
}