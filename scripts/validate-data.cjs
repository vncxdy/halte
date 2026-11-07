const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const routes = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "routes.json"), "utf8"));
const stops = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "stops.json"), "utf8"));
const shapes = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "shapes.json"), "utf8"));
const sources = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "dataSources.json"), "utf8"));

const failures = [];
const stopIds = new Set(stops.map((stop) => stop.id));
const routeIds = new Set(routes.map((route) => route.id));

if (!routes.length) failures.push("No routes found");
if (!stops.length) failures.push("No stops found");
if (!sources.length) failures.push("No data source manifest found");
if (new Set(routes.map((route) => route.id)).size !== routes.length) failures.push("Duplicate route IDs found");
if (new Set(stops.map((stop) => stop.id)).size !== stops.length) failures.push("Duplicate stop IDs found");

for (const stop of stops) {
  if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)) failures.push(`Invalid coordinate: ${stop.id}`);
  if (stop.lat < -7 || stop.lat > -5 || stop.lon < 105 || stop.lon > 108) failures.push(`Out-of-region coordinate: ${stop.id}`);
  for (const route of stop.routes || []) {
    if (!routeIds.has(route.id)) failures.push(`Stop ${stop.id} references unknown route ${route.id}`);
  }
}

let references = 0;
for (const route of routes) {
  if (!shapes[route.id]) failures.push(`Route ${route.id} has no shape`);
  for (const direction of ["outboundStops", "inboundStops"]) {
    for (const stopId of route[direction] || []) {
      references += 1;
      if (!stopIds.has(stopId)) failures.push(`Route ${route.id} references unknown stop ${stopId}`);
    }
  }
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures: failures.slice(0, 25), failureCount: failures.length }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  routes: routes.length,
  stops: stops.length,
  shapes: Object.keys(shapes).length,
  routeStopReferences: references,
  linkedStops: stops.filter((stop) => (stop.routes || []).length > 0).length,
  sources: sources.map((source) => ({ operator: source.operator, updatedAt: source.updatedAt }))
}, null, 2));