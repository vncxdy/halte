import React, { useState, useEffect } from "react";
import { X, Bus, Clock, ShieldCheck, Navigation, ArrowUpDown, ChevronRight } from "lucide-react";
import { getRouteDetails } from "../services/api";

export default function RouteDetailModal({
  routeId = null,
  onClose = null,
  onSelectStop = null,
  onTrackRoute = null
}) {
  const [details, setDetails] = useState(null);
  const [direction, setDirection] = useState("outbound"); // 'outbound' | 'inbound'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!routeId) return;
    setLoading(true);
    getRouteDetails(routeId).then((data) => {
      setDetails(data);
      setLoading(false);
    });
  }, [routeId]);

  if (!routeId) return null;

  const currentTrip = direction === "outbound" ? details?.outbound : details?.inbound;
  const stops = currentTrip?.stops || [];
  const route = details?.route;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl border border-zinc-200">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-4 border-b border-zinc-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded text-xs font-mono font-bold text-white shadow-2xs"
              style={{ backgroundColor: route?.color || "#0070BA" }}
            >
              {route?.code || routeId}
            </span>
            <span className="text-xs font-mono font-medium text-zinc-500 uppercase">
              {route?.modeLabel || "Transjakarta"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* Route Title & Fare */}
          <div>
            <h3 className="text-xl font-bold text-zinc-900 tracking-tight leading-tight">
              {route?.name || `Rute ${routeId}`}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              {route?.description || "Layanan transportasi publik Jakarta"}
            </p>
          </div>

          {/* Key Stats Bar */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-center">
            <div>
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">TARIF</span>
              <span className="font-mono text-xs font-bold text-zinc-900">
                {route?.fare === 0 ? "Gratis" : (typeof route?.fare === "number" ? `Rp ${route.fare.toLocaleString("id-ID")}` : "Rp 3.500")}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">JAM LAYANAN</span>
              <span className="font-mono text-xs font-bold text-zinc-900">
                {route?.operatingHours ? route.operatingHours.split(" ")[0] : "05:00 - 22:00"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-zinc-400 block uppercase">HEADWAY</span>
              <span className="font-mono text-xs font-bold text-zinc-900">
                {route?.headwayMinutes || "5 - 10 mnt"}
              </span>
            </div>
          </div>

          {/* Action Track Button */}
          <button
            onClick={() => {
              if (onTrackRoute) onTrackRoute(routeId);
              if (onClose) onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Navigation className="size-4" />
            <span>Lacak Armada di Jalur Ini</span>
          </button>

          {/* Direction Switcher */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
            <span className="text-xs font-semibold text-zinc-700">Arah Perjalanan</span>
            <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg">
              <button
                onClick={() => setDirection("outbound")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  direction === "outbound" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Ke {details?.outbound?.headsign || "Tujuan A"}
              </button>
              {details?.inbound?.stops?.length > 0 && (
                <button
                  onClick={() => setDirection("inbound")}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    direction === "inbound" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Ke {details?.inbound?.headsign || "Tujuan B"}
                </button>
              )}
            </div>
          </div>

          {/* Stop Sequence Timeline */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="font-mono uppercase text-[10px] tracking-wider">URUTAN HALTE ({stops.length})</span>
              <span className="text-[11px]">Klik halte untuk detail</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400">Memuat rincian halte...</div>
            ) : stops.length === 0 ? (
              <div className="p-4 bg-zinc-50 rounded-xl text-center text-xs text-zinc-500 italic">
                Daftar halte untuk arah ini tidak tersedia.
              </div>
            ) : (
              <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-200">
                {stops.map((stop, sIdx) => {
                  const isFirst = sIdx === 0;
                  const isLast = sIdx === stops.length - 1;
                  return (
                    <div
                      key={stop.id || sIdx}
                      onClick={() => {
                        if (onSelectStop) onSelectStop(stop);
                        if (onClose) onClose();
                      }}
                      className="relative flex items-center justify-between text-xs cursor-pointer group hover:bg-zinc-50 p-1.5 -ml-1.5 rounded-lg transition-colors"
                    >
                      {/* Timeline Dot */}
                      <span
                        className={`absolute -left-6 size-3 rounded-full border-2 border-white shadow-xs ${
                          isFirst ? "bg-emerald-500 ring-2 ring-emerald-100" : (isLast ? "bg-red-500 ring-2 ring-red-100" : "bg-zinc-400")
                        }`}
                      />
                      <span className="font-medium text-zinc-800 group-hover:text-zinc-950 truncate">
                        {stop.name}
                      </span>
                      <ChevronRight className="size-3.5 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
