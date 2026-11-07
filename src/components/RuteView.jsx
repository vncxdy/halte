import React, { useState, useMemo, useEffect } from "react";
import { ArrowUpDown, MapPin, Navigation, Clock, Shield, ChevronDown, ChevronUp, Footprints, Bus, AlertCircle } from "lucide-react";
import { planJourney } from "../services/journeyPlanner";
import { POPULAR_LOCATIONS, formatDistance } from "../services/geo";
import { localStops } from "../services/api";

export default function RuteView({
  userLocation = null,
  originOverride = null,
  destinationOverride = null,
  onSelectStop = null
}) {
  const [origin, setOrigin] = useState(POPULAR_LOCATIONS[1]); // Bundaran HI
  const [destination, setDestination] = useState(POPULAR_LOCATIONS[2]); // Blok M
  const [preference, setPreference] = useState("fastest");
  const [originQuery, setOriginQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [isEditingDest, setIsEditingDest] = useState(false);
  const [expandedJourneyId, setExpandedJourneyId] = useState(null);

  useEffect(() => {
    if (originOverride) {
      setOrigin(originOverride);
      setOriginQuery("");
      setIsEditingOrigin(false);
    }
  }, [originOverride]);

  useEffect(() => {
    if (destinationOverride) {
      setDestination(destinationOverride);
      setDestQuery("");
      setIsEditingDest(false);
    }
  }, [destinationOverride]);

  // Swap origin and destination
  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  // Plan journey
  const solutions = useMemo(() => {
    if (!origin || !destination) return [];
    return planJourney(origin, destination, preference);
  }, [origin, destination, preference]);

  // Filter stops for picker search
  const filteredOriginStops = useMemo(() => {
    if (!originQuery.trim()) return [];
    return localStops.filter(s => s.name.toLowerCase().includes(originQuery.toLowerCase())).slice(0, 5);
  }, [originQuery]);

  const filteredDestStops = useMemo(() => {
    if (!destQuery.trim()) return [];
    return localStops.filter(s => s.name.toLowerCase().includes(destQuery.toLowerCase())).slice(0, 5);
  }, [destQuery]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-24 pt-20 text-zinc-900 dark:text-zinc-100 sm:px-6 sm:pt-24">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Rencana Perjalanan</h2>
        <p className="text-xs text-zinc-600 mt-0.5">
          Temukan rute tercepat, paling murah, dan sedikit transit di Jabodetabek.
        </p>
      </div>

      {/* Origin & Destination Card */}
      <div className="relative flex flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* Origin Field */}
        <div className="flex items-center gap-3">
          <div className="size-3 rounded-full bg-emerald-500 shrink-0 ring-4 ring-emerald-100" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block">DARI MANA</span>
            {isEditingOrigin ? (
              <div className="relative mt-1">
                <input
                  type="text"
                  autoFocus
                  value={originQuery}
                  onChange={(e) => setOriginQuery(e.target.value)}
                  placeholder="Ketik nama halte atau tempat..."
                  className="w-full text-xs font-semibold py-1 border-b border-zinc-400 focus:outline-hidden"
                />
                {filteredOriginStops.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto">
                    {filteredOriginStops.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setOrigin(s);
                          setIsEditingOrigin(false);
                          setOriginQuery("");
                        }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-100 flex items-center justify-between"
                      >
                        <span className="truncate">{s.name}</span>
                        <span className="text-[10px] font-mono text-zinc-600 uppercase">{s.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsEditingOrigin(true)}
                className="text-xs font-semibold text-zinc-900 truncate block text-left hover:text-zinc-600 w-full"
              >
                {origin?.name || "Pilih lokasi awal"}
              </button>
            )}
          </div>
        </div>

        {/* Swap Divider Button */}
        <div className="relative flex items-center justify-center my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-100"></div>
          </div>
          <button
            onClick={handleSwap}
            title="Tukar asal dan tujuan"
            className="relative size-7 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-600 hover:bg-zinc-200 flex items-center justify-center transition-transform hover:scale-110"
          >
            <ArrowUpDown className="size-3.5" />
          </button>
        </div>

        {/* Destination Field */}
        <div className="flex items-center gap-3">
          <div className="size-3 rounded-full bg-red-500 shrink-0 ring-4 ring-red-100" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider block">KE MANA</span>
            {isEditingDest ? (
              <div className="relative mt-1">
                <input
                  type="text"
                  autoFocus
                  value={destQuery}
                  onChange={(e) => setDestQuery(e.target.value)}
                  placeholder="Ketik nama halte atau tempat..."
                  className="w-full text-xs font-semibold py-1 border-b border-zinc-400 focus:outline-hidden"
                />
                {filteredDestStops.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto">
                    {filteredDestStops.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setDestination(s);
                          setIsEditingDest(false);
                          setDestQuery("");
                        }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-zinc-100 flex items-center justify-between"
                      >
                        <span className="truncate">{s.name}</span>
                        <span className="text-[10px] font-mono text-zinc-600 uppercase">{s.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsEditingDest(true)}
                className="text-xs font-semibold text-zinc-900 truncate block text-left hover:text-zinc-600 w-full"
              >
                {destination?.name || "Pilih lokasi tujuan"}
              </button>
            )}
          </div>
        </div>

        {/* Popular Locations Shortcut Bar */}
        <div className="pt-2 border-t border-zinc-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono text-zinc-600 shrink-0">Pilihan:</span>
          {POPULAR_LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              onClick={() => {
                if (isEditingOrigin) {
                  setOrigin(loc);
                  setIsEditingOrigin(false);
                } else {
                  setDestination(loc);
                  setIsEditingDest(false);
                }
              }}
              className="px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-[10px] font-medium text-zinc-700 whitespace-nowrap transition-colors"
            >
              {loc.name.split("/")[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Strategy Filters */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { id: "fastest", label: "Tercepat" },
          { id: "fewest_transfers", label: "Sedikit Transit" },
          { id: "cheapest", label: "Termurah" },
          { id: "simplest", label: "Sederhana" }
        ].map((strat) => {
          const isActive = preference === strat.id;
          return (
            <button
              key={strat.id}
              onClick={() => setPreference(strat.id)}
              className={`py-2 px-1 text-center rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-zinc-900 text-white shadow-xs font-semibold"
                  : "bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200/80"
              }`}
            >
              {strat.label}
            </button>
          );
        })}
      </div>

      {/* Journey Solutions List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-zinc-600 px-1">
          <span>Ditemukan <strong>{solutions.length}</strong> alternatif perjalanan</span>
          <span className="font-mono text-[11px] text-zinc-600">Tarif Resmi</span>
        </div>

        {solutions.length === 0 ? (
          <div className="p-8 bg-white border border-zinc-200 rounded-2xl flex flex-col items-center justify-center text-center">
            <AlertCircle className="size-8 text-zinc-300 mb-2" />
            <h4 className="text-sm font-semibold text-zinc-700">Rute Belum Ditemukan</h4>
            <p className="text-xs text-zinc-600 mt-1 max-w-xs">
              Coba pilih halte awal atau tujuan terdekat lain dalam jaringan Transjakarta atau MRT.
            </p>
          </div>
        ) : (
          solutions.map((sol, index) => {
            const isExpanded = expandedJourneyId === sol.id;
            return (
              <div
                key={sol.id}
                className="p-4 bg-white border border-zinc-200/90 rounded-2xl hover:border-zinc-300 transition-all flex flex-col gap-3 shadow-xs"
              >
                {/* Header Summary */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-zinc-950">
                      {sol.totalDurationMins} mnt
                    </span>
                    <span className="text-zinc-400">•</span>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                      {sol.fareDisplay}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-600">
                    {sol.transfers === 0 ? "Langsung (0 Transit)" : `${sol.transfers}x Transit`}
                  </span>
                </div>

                {/* Line Path Badges Progression */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {sol.legs.map((leg, lIdx) => {
                    if (leg.type === "WALK") {
                      return (
                        <div key={lIdx} className="flex items-center gap-1 text-zinc-600 text-[11px]">
                          <Footprints className="size-3.5" />
                          <span>{formatDistance(leg.distanceKm)}</span>
                          {lIdx < sol.legs.length - 1 && <span className="text-zinc-400">→</span>}
                        </div>
                      );
                    }
                    if (leg.type === "TRANSIT") {
                      return (
                        <div key={lIdx} className="flex items-center gap-1.5">
                          <span
                            className="px-2 py-0.5 rounded font-mono font-bold text-white text-xs shadow-2xs"
                            style={{ backgroundColor: leg.route?.color || "#0070BA" }}
                          >
                            {leg.route?.code}
                          </span>
                          <span className="text-[11px] font-medium text-zinc-600">
                            ({leg.durationMins} mnt)
                          </span>
                          {lIdx < sol.legs.length - 1 && <span className="text-zinc-400">→</span>}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>

                {/* Toggle Details Button */}
                <button
                  onClick={() => setExpandedJourneyId(isExpanded ? null : sol.id)}
                  className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  <span>{isExpanded ? "Sembunyikan Petunjuk Rinci" : "Lihat Petunjuk Rute & Halte"}</span>
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>

                {/* Expanded Itinerary Steps */}
                {isExpanded && (
                  <div className="pt-2 space-y-3 text-xs border-t border-zinc-100 animate-in fade-in duration-150">
                    {sol.legs.map((leg, legIndex) => (
                      <div key={legIndex} className="flex items-start gap-3">
                        <div className="mt-1 size-5 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-600">
                          {leg.type === "WALK" ? <Footprints className="size-3" /> : <Bus className="size-3" />}
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="font-semibold text-zinc-900 leading-tight">
                            {leg.instruction || `${leg.type} menuju ${leg.toStop?.name || leg.toName}`}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-600">
                            {leg.durationMins && <span>Estimasi {leg.durationMins} menit</span>}
                            {leg.stopCount && <span>• {leg.stopCount} Halte</span>}
                            {leg.headway && <span>• Antara bus {leg.headway}</span>}
                          </div>

                          {/* Expandable intermediate stops list */}
                          {leg.intermediateStops && leg.intermediateStops.length > 2 && (
                            <div className="mt-2 p-2 bg-zinc-50 rounded-lg border border-zinc-100 text-[11px] text-zinc-600">
                              <span className="font-medium text-zinc-700 block mb-1">Melewati {leg.intermediateStops.length} halte:</span>
                              <div className="space-y-0.5 pl-2 border-l border-zinc-200">
                                {leg.intermediateStops.map((st, sIdx) => (
                                  <div key={sIdx} className="truncate">{st.name}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
