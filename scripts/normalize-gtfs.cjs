const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const INPUT_DIR = path.join(ROOT, "tmp-gtfs");
const DATA_DIR = path.join(ROOT, "src", "data");

function parseCsv(fileName) {
  const text = fs.readFileSync(path.join(INPUT_DIR, fileName), "utf8").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => value !== "")) rows.push(row);
  }

  const headers = rows.shift();
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function routeCategory(code) {
  if (/^JAK\./i.test(code)) return { category: "mikrotrans", modeLabel: "Mikrotrans" };
  if (/^(1[0-4]|[1-9])$/.test(code)) return { category: "brt", modeLabel: "Transjakarta BRT" };
  if (/^(MRT|LRT|KRL)/i.test(code)) return { category: "rail", modeLabel: "Rel" };
  return { category: "feeder", modeLabel: "Transjakarta Feeder" };
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? (hours * 60) + minutes : null;
}

function formatMinutes(value) {
  if (value == null) return null;
  const hours = Math.floor(value / 60) % 24;
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(DATA_DIR, fileName), `${JSON.stringify(value)}\n`, "utf8");
}

const routesCsv = parseCsv("routes.txt");
const stopsCsv = parseCsv("stops.txt");
const tripsCsv = parseCsv("trips.txt");
const stopTimesCsv = parseCsv("stop_times.txt");
const shapesCsv = parseCsv("shapes.txt");
const calendarCsv = parseCsv("calendar.txt");

const updatedAt = new Date().toISOString();
const stopById = new Map();
for (const stop of stopsCsv) {
  const lat = number(stop.stop_lat);
  const lon = number(stop.stop_lon);
  if (lat == null || lon == null) continue;
  stopById.set(stop.stop_id, {
    id: stop.stop_id,
    code: stop.stop_code || "",
    name: stop.stop_name,
    description: stop.stop_desc || "",
    parentStation: stop.parent_station || null,
    platformCode: stop.platform_code || null,
    locationType: stop.location_type === "1" ? "station" : "stop",
    lat,
    lon,
    isBRT: /^H/.test(stop.stop_id),
    type: stop.location_type === "1" ? "station" : "bus_stop",
    mode: "bus",
    facilities: stop.wheelchair_boarding === "1" || stop.wheelchair_boarding === "2" ? ["accessible for all"] : [],
    routes: [],
    source: "Transjakarta GTFS",
    sourceUpdatedAt: updatedAt
  });
}

const stopTimesByTrip = new Map();
for (const row of stopTimesCsv) {
  if (!stopById.has(row.stop_id)) continue;
  if (!stopTimesByTrip.has(row.trip_id)) stopTimesByTrip.set(row.trip_id, []);
  stopTimesByTrip.get(row.trip_id).push({
    stopId: row.stop_id,
    sequence: Number(row.stop_sequence),
    arrival: row.arrival_time,
    departure: row.departure_time
  });
}
for (const times of stopTimesByTrip.values()) times.sort((a, b) => a.sequence - b.sequence);

const tripsByRoute = new Map();
for (const trip of tripsCsv) {
  const times = stopTimesByTrip.get(trip.trip_id);
  if (!times || times.length < 2) continue;
  if (!tripsByRoute.has(trip.route_id)) tripsByRoute.set(trip.route_id, []);
  tripsByRoute.get(trip.route_id).push({ ...trip, times });
}

const shapePoints = new Map();
for (const point of shapesCsv) {
  if (!shapePoints.has(point.shape_id)) shapePoints.set(point.shape_id, []);
  shapePoints.get(point.shape_id).push([
    number(point.shape_pt_lat),
    number(point.shape_pt_lon),
    Number(point.shape_pt_sequence)
  ]);
}
for (const points of shapePoints.values()) points.sort((a, b) => a[2] - b[2]);

const calendarById = new Map(calendarCsv.map((row) => [row.service_id, row]));
const normalizedRoutes = [];
const normalizedShapes = {};
const routeSummariesByStop = new Map();

for (const sourceRoute of routesCsv) {
  const routeTrips = tripsByRoute.get(sourceRoute.route_id) || [];
  if (!routeTrips.length) continue;

  const byDirection = new Map();
  for (const trip of routeTrips) {
    const direction = trip.direction_id || "0";
    const current = byDirection.get(direction);
    if (!current || trip.times.length > current.times.length) byDirection.set(direction, trip);
  }
  const selectedTrips = [...byDirection.values()].sort((a, b) => Number(a.direction_id || 0) - Number(b.direction_id || 0));
  const outbound = selectedTrips[0];
  const inbound = selectedTrips[1] || null;
  const classification = routeCategory(sourceRoute.route_short_name);
  const service = calendarById.get(outbound.service_id);
  const allTimes = routeTrips.flatMap((trip) => trip.times.flatMap((time) => [time.arrival, time.departure]).filter(Boolean));
  const timeMinutes = allTimes.map(timeToMinutes).filter((value) => value != null);
  const route = {
    id: sourceRoute.route_id,
    code: sourceRoute.route_short_name || sourceRoute.route_id,
    name: sourceRoute.route_long_name || sourceRoute.route_short_name || sourceRoute.route_id,
    description: sourceRoute.route_desc || "",
    category: classification.category,
    mode: "bus",
    modeLabel: classification.modeLabel,
    operator: "Transjakarta",
    color: sourceRoute.route_color ? `#${sourceRoute.route_color}` : "#0070BA",
    textColor: sourceRoute.route_text_color ? `#${sourceRoute.route_text_color}` : "#FFFFFF",
    fare: null,
    fareDisplay: "Tarif tidak ditautkan pada rute ini",
    operatingHours: timeMinutes.length ? `${formatMinutes(Math.min(...timeMinutes))} - ${formatMinutes(Math.max(...timeMinutes))}` : null,
    headwayMinutes: null,
    stopCount: outbound.times.length,
    outboundHeadsign: outbound.trip_headsign || sourceRoute.route_long_name || "",
    outboundStops: outbound.times.map((time) => time.stopId),
    inboundHeadsign: inbound?.trip_headsign || "",
    inboundStops: inbound ? inbound.times.map((time) => time.stopId) : [],
    schedule: {
      serviceId: outbound.service_id,
      serviceDays: service ? {
        monday: service.monday === "1", tuesday: service.tuesday === "1", wednesday: service.wednesday === "1",
        thursday: service.thursday === "1", friday: service.friday === "1", saturday: service.saturday === "1", sunday: service.sunday === "1"
      } : null,
      representativeTripId: outbound.trip_id,
      inboundTripId: inbound?.trip_id || null
    },
    source: "Transjakarta GTFS",
    sourceUpdatedAt: updatedAt
  };
  normalizedRoutes.push(route);

  for (const stopId of new Set([...route.outboundStops, ...route.inboundStops])) {
    if (!routeSummariesByStop.has(stopId)) routeSummariesByStop.set(stopId, []);
    routeSummariesByStop.get(stopId).push({ id: route.id, code: route.code, name: route.name, color: route.color, category: route.category });
  }

  const routeShapes = {};
  for (const trip of selectedTrips) {
    const points = shapePoints.get(trip.shape_id);
    if (points?.length) routeShapes[trip.shape_id] = points.map(([lat, lon]) => [lat, lon]);
  }
  if (Object.keys(routeShapes).length) normalizedShapes[route.id] = routeShapes;
}

const normalizedStops = [...stopById.values()].map((stop) => ({
  ...stop,
  routes: routeSummariesByStop.get(stop.id) || []
}));

const metadata = {
  operator: "Transjakarta",
  source: "https://gtfs.transjakarta.co.id/files/file_gtfs.zip",
  license: "Not specified in the downloaded source archive",
  updatedAt,
  records: { routes: normalizedRoutes.length, stops: normalizedStops.length, shapes: Object.keys(normalizedShapes).length }
};

writeJson("routes.json", normalizedRoutes);
writeJson("stops.json", normalizedStops);
writeJson("shapes.json", normalizedShapes);
writeJson("dataSources.json", [metadata]);

console.log(JSON.stringify({ ...metadata, sourceRoutes: routesCsv.length, sourceStops: stopsCsv.length, sourceTrips: tripsCsv.length }, null, 2));