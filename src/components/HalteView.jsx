import React, { useState, useMemo } from "react";
import { Search, Bus, MapPin, Accessibility, ShieldCheck, ChevronRight, Check, Compass, Info } from "lucide-react";
import { localStopGroups } from "../services/api";
import { formatDistance, getDistanceKm } from "../services/geo";

export default function HalteView({
  userLocation = null,
  onSelectStop = null,
  onSelectRoute = null
}) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all' | 'brt' | 'bus_stop' | 'rail'
  const [filterFacility, setFilterFacility] = useState(null); // 'accessible for all' | 'toilet' | 'praying area' | 'eskalator'

  const userLat = userLocation?.lat || -6.1754;
  const userLon = userLocation?.lon || 106.8272;

  // Process and sort physical locations while retaining individual variants.
  const enrichedStops = useMemo(() => {
    return localStopGroups.map((group) => {
      const variants = group.variants.map((variant) => ({
        ...variant,
        distance: getDistanceKm(userLat, userLon, variant.lat, variant.lon)
      }));
      const nearest = variants.reduce((best, variant) => variant.distance < best.distance ? variant : best, variants[0]);
      return { ...group, distance: nearest?.distance ?? getDistanceKm(userLat, userLon, group.lat, group.lon), variants };
    });
  }, [userLat, userLon]);

  const filteredStops = useMemo(() => {
    return enrichedStops.filter(s => {
      // Type filter
      if (filterType === "brt" && !s.isBRT) return false;
      if (filterType === "bus_stop" && (s.isBRT || s.mode !== "bus")) return false;

      // Facility filter
      if (filterFacility && !(s.facilities || []).includes(filterFacility)) {
        return false;
      }

      // Query filter
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchName = s.name.toLowerCase().includes(q);
        const matchVariant = s.variants.some((variant) => variant.name.toLowerCase().includes(q) || variant.id.toLowerCase().includes(q));
        const matchCode = s.variants.some((variant) => (variant.code || "").toLowerCase().includes(q));
        const matchRoute = (s.routes || []).some(r => r.code.toLowerCase().includes(q));
        return matchName || matchVariant || matchCode || matchRoute;
      }

      return true;
    }).sort((a, b) => a.distance - b.distance);
  }, [enrichedStops, filterType, filterFacility, query]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-24 pt-20 text-zinc-900 dark:text-zinc-100 sm:px-6 sm:pt-24">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Direktori Halte Transjakarta</h2>
        <p className="text-xs text-zinc-600 mt-0.5">
          Jelajahi {localStopGroups.length} lokasi fisik dari {localStopGroups.reduce((sum, group) => sum + group.variantCount, 0)} stop GTFS Transjakarta.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama halte (cth: Monas, Harmoni, CSW, Senayan)..."
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
          >
            Hapus
          </button>
        )}
      </div>

      {/* Mode Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: "all", label: "Semua Titik" },
          { id: "brt", label: "Halte BRT" },
          { id: "bus_stop", label: "Plang Bus Stop" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilterType(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filterType === t.id
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Facility Quick Filters */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-mono text-zinc-600 shrink-0">Fasilitas:</span>
        {[
          { id: "accessible for all", label: "Disabilitas" },
          { id: "toilet", label: "Toilet" },
          { id: "praying area", label: "Musholla" },
          { id: "eskalator", label: "Eskalator / Lift" }
        ].map((f) => {
          const isSelected = filterFacility === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilterFacility(isSelected ? null : f.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap border ${
                isSelected
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Stop Count & Distance Reference */}
      <div className="flex items-center justify-between text-xs text-zinc-600 px-1">
        <span>Menampilkan <strong>{Math.min(filteredStops.length, 60)}</strong> dari {filteredStops.length} lokasi</span>
        <span className="font-mono text-[10px] text-zinc-600">Urut: Terdekat</span>
      </div>

      {/* Stop Items List */}
      <div className="flex flex-col gap-2">
        {filteredStops.slice(0, 60).map((stop) => {
          return (
            <div
              key={stop.id}
              onClick={() => onSelectStop && onSelectStop(stop)}
              className="flex items-center justify-between p-3.5 bg-white border border-zinc-200/80 rounded-xl hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`mt-0.5 size-8 rounded-lg flex items-center justify-center shrink-0 ${
                    stop.isBRT ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-600"
                }`}>
                  <Bus className="size-4" />
                </div>

                <div className="flex flex-col min-w-0">
                  <h4 className="text-xs font-semibold text-zinc-900 truncate group-hover:text-zinc-950">
                    {stop.name}
                  </h4>

                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-600">
                    <span className="font-mono text-[10px] uppercase">
                      {stop.isBRT ? "Halte BRT" : "Bus Stop"}
                    </span>
                    <span>•</span>
                    <span>{stop.variantCount} varian</span>
                    <span>•</span>
                    <span className="font-mono text-[11px] font-medium text-zinc-700">
                      {formatDistance(stop.distance)}
                    </span>
                  </div>

                  {/* Facilities icons */}
                  {stop.facilities && stop.facilities.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-zinc-600">
                      {stop.facilities.includes("accessible for all") && (
                        <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 flex items-center gap-0.5 font-medium">
                          <Accessibility className="size-2.5" /> Akses Ramah
                        </span>
                      )}
                      {stop.facilities.includes("toilet") && (
                        <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 font-medium">
                          Toilet
                        </span>
                      )}
                      {stop.facilities.includes("praying area") && (
                        <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 font-medium">
                          Musholla
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Connecting routes */}
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <div className="flex flex-wrap gap-1 max-w-[120px] justify-end">
                    {(stop.routes || []).slice(0, 3).map((r) => (
                    <span
                      key={r.id || r.code}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectRoute) onSelectRoute(r.id);
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white shadow-2xs hover:opacity-85 transition-opacity"
                      style={{ backgroundColor: r.color || "#0070BA" }}
                    >
                      {r.code}
                    </span>
                  ))}
                  {(stop.routes || []).length > 3 && (
                    <span className="text-[10px] font-mono text-zinc-600 self-center">
                      +{stop.routes.length - 3}
                    </span>
                  )}
                  {stop.variantCount > 1 && (
                    <span className="text-[10px] text-zinc-500">{stop.variantCount} stop →</span>
                  )}
                </div>
                <ChevronRight className="size-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
