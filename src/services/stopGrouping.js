const GROUP_RADIUS_METERS = 70;

function normalizeName(name = "") {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\s*[-/]\s*(arah|direction|platform|halte)\b.*$/i, "")
    .replace(/\s+(?:[a-z]|\d+)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function distanceMeters(a, b) {
  const latScale = 111320;
  const lonScale = 111320 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const dLat = (b.lat - a.lat) * latScale;
  const dLon = (b.lon - a.lon) * lonScale;
  return Math.sqrt((dLat * dLat) + (dLon * dLon));
}

function unionRoutes(variants) {
  const routes = new Map();
  for (const variant of variants) {
    for (const route of variant.routes || []) {
      routes.set(route.id || route.code, route);
    }
  }
  return [...routes.values()].sort((a, b) => String(a.code).localeCompare(String(b.code)));
}

function unionFacilities(variants) {
  return [...new Set(variants.flatMap((variant) => variant.facilities || []))];
}

function makeGroup(variants, key, confidence) {
  const sorted = [...variants].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const anchor = sorted[0];
  const lat = sorted.reduce((sum, variant) => sum + variant.lat, 0) / sorted.length;
  const lon = sorted.reduce((sum, variant) => sum + variant.lon, 0) / sorted.length;
  const distinctNames = [...new Set(sorted.map((variant) => variant.name))];
  return {
    id: `location:${key}`,
    name: normalizeName(anchor.name) || anchor.name,
    lat,
    lon,
    distance: null,
    mode: anchor.mode,
    type: anchor.type,
    isBRT: sorted.some((variant) => variant.isBRT),
    routes: unionRoutes(sorted),
    facilities: unionFacilities(sorted),
    variants: sorted,
    variantCount: sorted.length,
    variantNames: distinctNames,
    groupingConfidence: confidence,
    groupingCategory: confidence === "parent_station"
      ? "parent_station"
      : (confidence === "name_proximity" ? "name_proximity" : "individual"),
    source: anchor.source,
    sourceUpdatedAt: anchor.sourceUpdatedAt
  };
}

/**
 * Groups stops for presentation only. Every original stop remains in variants.
 * Parent-station IDs always win. Name/proximity fallback requires the same
 * normalized name, same mode, and <= 70 meters between each variant and the
 * group's anchor to avoid merging distant or opposite-side locations.
 */
export function groupStops(stops, radiusMeters = GROUP_RADIUS_METERS) {
  const groups = [];
  const byParent = new Map();
  const unassigned = [];

  for (const stop of stops) {
    if (stop.parentStation) {
      if (!byParent.has(stop.parentStation)) byParent.set(stop.parentStation, []);
      byParent.get(stop.parentStation).push(stop);
    } else {
      unassigned.push(stop);
    }
  }

  for (const [parentId, variants] of byParent) {
    groups.push(makeGroup(variants, `parent:${parentId}`, "parent_station"));
  }

  const buckets = new Map();
  for (const stop of unassigned) {
    const key = `${stop.mode || "unknown"}:${normalizeName(stop.name)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(stop);
  }

  for (const [key, candidates] of buckets) {
    const pending = [...candidates];
    while (pending.length) {
      const anchor = pending.shift();
      const variants = [anchor];
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        if (distanceMeters(anchor, pending[index]) <= radiusMeters) {
          variants.push(pending[index]);
          pending.splice(index, 1);
        }
      }
      groups.push(makeGroup(variants, `${key}:${anchor.id}`, variants.length > 1 ? "name_proximity" : "individual"));
    }
  }

  return groups.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

/**
 * Returns mutually exclusive metrics for one final presentation-group output.
 * `singletonGroups` means groups with exactly one original stop; it does not
 * mean that the source stop lacked a parent_station field.
 */
export function summarizeGrouping(groups, originalStops) {
  const sourceIds = originalStops.map((stop) => stop.id);
  const variantIds = groups.flatMap((group) => group.variants.map((stop) => stop.id));
  const idCounts = new Map();
  for (const id of variantIds) idCounts.set(id, (idCounts.get(id) || 0) + 1);

  const duplicateVariantIds = [...idCounts.entries()].filter(([, count]) => count !== 1).map(([id]) => id);
  const missingVariantIds = sourceIds.filter((id) => !idCounts.has(id));
  const unexpectedVariantIds = variantIds.filter((id) => !sourceIds.includes(id));
  if (duplicateVariantIds.length || missingVariantIds.length || unexpectedVariantIds.length) {
    throw new Error(`Grouping partition invalid: duplicate=${duplicateVariantIds.length}, missing=${missingVariantIds.length}, unexpected=${unexpectedVariantIds.length}`);
  }

  const categories = {
    parent_station: groups.filter((group) => group.groupingCategory === "parent_station").length,
    name_proximity: groups.filter((group) => group.groupingCategory === "name_proximity").length,
    individual: groups.filter((group) => group.groupingCategory === "individual").length
  };
  const totalGroups = groups.length;
  const multiVariantGroups = groups.filter((group) => group.variantCount > 1).length;
  const singletonGroups = groups.filter((group) => group.variantCount === 1).length;
  const parentStationStops = originalStops.filter((stop) => Boolean(stop.parentStation)).length;

  if (categories.parent_station + categories.name_proximity + categories.individual !== totalGroups) {
    throw new Error("Grouping category totals do not equal total presentation groups");
  }
  if (multiVariantGroups + singletonGroups !== totalGroups) {
    throw new Error("Multi-variant and singleton group totals do not equal total presentation groups");
  }
  if (variantIds.length !== originalStops.length) {
    throw new Error("Presentation variant total does not equal original stop total");
  }
  if (groups.some((group) => group.variantCount !== group.variants.length || group.variantCount < 1)) {
    throw new Error("Every presentation group must contain exactly its declared, non-zero variant count");
  }
  if (groups.some((group) => group.groupingCategory === "parent_station" && group.variants.some((stop) => !stop.parentStation))) {
    throw new Error("Parent-station groups may only contain stops with actual parentStation values");
  }

  return {
    originalStops: originalStops.length,
    totalGroups,
    multiVariantGroups,
    singletonGroups,
    groupedLocations: multiVariantGroups,
    parentStationStops,
    categories,
    variantsPreserved: variantIds.length
  };
}

export { GROUP_RADIUS_METERS, normalizeName, distanceMeters };