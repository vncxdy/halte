const assert = require("node:assert/strict");

function loadModule() {
  const source = require("fs").readFileSync(require("path").join(__dirname, "../src/services/stopGrouping.js"), "utf8")
    .replace(/export function /g, "function ")
    .replace(/export \{[^}]+\};?/g, "module.exports = { groupStops, summarizeGrouping, normalizeName, distanceMeters };");
  const module = { exports: {} };
  new Function("module", "exports", source)(module, module.exports);
  return module.exports;
}

const { groupStops, summarizeGrouping } = loadModule();
const stop = (id, name, lat, lon, extra = {}) => ({ id, name, lat, lon, mode: "bus", type: "bus_stop", routes: [], facilities: [], ...extra });

const parentGroups = groupStops([
  stop("a", "Central", -6.1, 106.8, { parentStation: "P1" }),
  stop("b", "Central Platform 2", -6.2, 106.9, { parentStation: "P1" })
]);
assert.equal(parentGroups.length, 1);
assert.equal(parentGroups[0].groupingConfidence, "parent_station");
assert.deepEqual(parentGroups[0].variants.map((item) => item.id).sort(), ["a", "b"]);

const nearbyGroups = groupStops([
  stop("a", "Jembatan Baru 1", -6.1, 106.8),
  stop("b", "Jembatan Baru 2", -6.1002, 106.8002)
]);
assert.equal(nearbyGroups.length, 1);
assert.equal(nearbyGroups[0].variantCount, 2);

const distantGroups = groupStops([
  stop("a", "Jembatan Baru 1", -6.1, 106.8),
  stop("b", "Jembatan Baru 2", -6.11, 106.8)
]);
assert.equal(distantGroups.length, 2, "distant same-name stops must not be merged");

const oppositeGroups = groupStops([
  stop("a", "Jembatan Baru", -6.1, 106.8),
  stop("b", "Jembatan Baru", -6.101, 106.8)
]);
assert.equal(oppositeGroups.length, 2, "opposite-side stops beyond the threshold stay selectable");

const summary = summarizeGrouping(nearbyGroups, [
  stop("a", "Jembatan Baru 1", -6.1, 106.8),
  stop("b", "Jembatan Baru 2", -6.1002, 106.8002)
]);
assert.deepEqual(summary.categories, { parent_station: 0, name_proximity: 1, individual: 0 });
assert.equal(summary.totalGroups, summary.categories.parent_station + summary.categories.name_proximity + summary.categories.individual);
assert.equal(summary.totalGroups, summary.multiVariantGroups + summary.singletonGroups);
assert.equal(summary.variantsPreserved, summary.originalStops);

const invalidGroups = [{ ...nearbyGroups[0], variants: [nearbyGroups[0].variants[0], nearbyGroups[0].variants[0]], variantCount: 2 }];
assert.throws(() => summarizeGrouping(invalidGroups, [
  stop("a", "Jembatan Baru 1", -6.1, 106.8),
  stop("b", "Jembatan Baru 2", -6.1002, 106.8002)
]));

const fs = require("node:fs");
const path = require("node:path");
const sourceStops = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/data/stops.json"), "utf8"));
const finalGroups = groupStops(sourceStops);
const finalSummary = summarizeGrouping(finalGroups, sourceStops);
assert.equal(finalSummary.variantsPreserved, 8143);
assert.equal(finalSummary.parentStationStops, sourceStops.filter((stop) => Boolean(stop.parentStation)).length);
console.log(JSON.stringify({ passed: true, cases: 7, finalSummary }));