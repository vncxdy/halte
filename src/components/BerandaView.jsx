import React from "react";
import { Search, Compass, MapPin, Bus, ArrowRight, Clock, ExternalLink, Zap, Navigation } from "lucide-react";
import { formatDistance, POPULAR_LOCATIONS } from "../services/geo";
import { localRoutes, getDataSources } from "../services/api";

export default function BerandaView({
  nearbyStops = [],
  onSelectStop = null,
  onSelectRoute = null,
  onPlanTrip = null,
  onSearchOpen = null,
  setActiveTab = null,
  onSelectCategory = null
}) {
  const quickTripPlans = [
    { from: POPULAR_LOCATIONS[1], to: POPULAR_LOCATIONS[2], label: "Bundaran HI → Blok M" },
    { from: POPULAR_LOCATIONS[0], to: POPULAR_LOCATIONS[6], label: "Monas → Kota Tua" },
    { from: POPULAR_LOCATIONS[3], to: POPULAR_LOCATIONS[5], label: "Dukuh Atas → Stasiun Manggarai" },
    { from: POPULAR_LOCATIONS[7], to: POPULAR_LOCATIONS[1], label: "Ragunan → Bundaran HI" }
  ];

  return (
    <div className="flex flex-col gap-6 pb-24 pt-3">
      {/* Search Input Banner */}
      <div className="relative">
        <button
          onClick={onSearchOpen}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-zinc-200/90 rounded-2xl shadow-xs hover:border-zinc-300 transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <Search className="size-4.5 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-zinc-900">Mau ke mana hari ini?</span>
              <span className="text-xs text-zinc-500">Cari rute busway, nomor koridor, atau halte...</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-xs font-mono font-medium text-zinc-600 group-hover:bg-zinc-200 transition-colors">
            Cari ⌘K
          </span>
        </button>
      </div>

      {/* Quick Category Action Grid */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => {
            if (onSelectCategory) onSelectCategory("brt");
            setActiveTab("jalur");
          }}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs transition-all text-center group cursor-pointer"
        >
          <div className="size-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <span className="font-mono font-bold text-xs">BRT</span>
          </div>
          <span className="text-xs font-medium text-zinc-700 leading-tight">Koridor</span>
        </button>

        <button
          onClick={() => {
            if (onSelectCategory) onSelectCategory("feeder");
            setActiveTab("jalur");
          }}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs transition-all text-center group cursor-pointer"
        >
          <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <Bus className="size-5" />
          </div>
          <span className="text-xs font-medium text-zinc-700 leading-tight">Metrotrans</span>
        </button>

        <button
          onClick={() => {
            if (onSelectCategory) onSelectCategory("mikrotrans");
            setActiveTab("jalur");
          }}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs transition-all text-center group cursor-pointer"
        >
          <div className="size-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <span className="font-mono font-bold text-xs">JAK</span>
          </div>
          <span className="text-xs font-medium text-zinc-700 leading-tight">Mikrotrans</span>
        </button>

        <button
          onClick={() => setActiveTab("lacak")}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs transition-all text-center group cursor-pointer"
        >
          <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <Zap className="size-5" />
          </div>
          <span className="text-xs font-medium text-zinc-700 leading-tight">Lacak Bus</span>
        </button>
      </div>

      {/* Data Status Pill */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex rounded-full size-2 bg-blue-600"></span>
          <span className="font-medium">Data lokal terverifikasi: {localRoutes.length} rute Transjakarta</span>
        </div>
        <span className="font-mono text-[10px] text-zinc-500">GTFS</span>
      </div>

      {/* Quick Trip Planner Shortcuts */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 tracking-tight flex items-center gap-1.5">
            <Navigation className="size-4 text-zinc-500" />
            <span>Pilihan Rute Cepat</span>
          </h3>
          <button
            onClick={() => setActiveTab("rute")}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
          >
            Buka Rencana <ArrowRight className="size-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {quickTripPlans.map((plan, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (onPlanTrip) onPlanTrip(plan.from, plan.to);
                setActiveTab("rute");
              }}
              className="p-3 bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-xl text-left hover:shadow-xs transition-all flex flex-col justify-between group cursor-pointer"
            >
              <span className="text-xs font-semibold text-zinc-800 group-hover:text-zinc-950 leading-tight">
                {plan.label}
              </span>
              <span className="text-[10px] text-zinc-400 mt-2 font-mono flex items-center gap-1">
                Hitung Rute <ArrowRight className="size-2.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Nearby Stops Section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Halte Terdekat</h3>
            <span className="text-[11px] font-mono text-zinc-500">({nearbyStops.length})</span>
          </div>
          <button
            onClick={() => setActiveTab("halte")}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
          >
            Lihat Semua <ArrowRight className="size-3" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {nearbyStops.slice(0, 5).map((stop) => (
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
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-[10px] text-zinc-500 uppercase">
                      {stop.isBRT ? "Halte BRT" : "Bus Stop"}
                    </span>
                    <span className="text-zinc-300">•</span>
                    <span className="font-mono text-[11px] font-medium text-zinc-700">
                      {formatDistance(stop.distance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Connecting route badges */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {(stop.routes || []).slice(0, 3).map((r) => (
                  <span
                    key={r.id || r.code}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white shadow-2xs"
                    style={{ backgroundColor: r.color || "#0070BA" }}
                  >
                    {r.code}
                  </span>
                ))}
                {(stop.routes || []).length > 3 && (
                  <span className="text-[10px] font-mono text-zinc-400">
                    +{stop.routes.length - 3}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main BRT Corridors Grid */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-zinc-900 tracking-tight">Rute Transjakarta dari GTFS Resmi</h3>
            <span className="text-[11px] font-mono text-zinc-500">{localRoutes.length}</span>
          </div>
          <button
            onClick={() => setActiveTab("jalur")}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
          >
            Semua Jalur <ArrowRight className="size-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {localRoutes.filter((route) => route.category === "brt").slice(0, 8).map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectRoute && onSelectRoute(c.id)}
              className="flex flex-col p-3 bg-white border border-zinc-200/80 rounded-xl hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="px-2 py-0.5 rounded text-xs font-mono font-bold text-white shadow-2xs"
                  style={{ backgroundColor: c.color }}
                >
                  {c.code}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">{c.operatingHours || "Jadwal tidak tersedia"}</span>
              </div>
              <h4 className="text-xs font-bold text-zinc-900 truncate leading-snug">
                {c.name}
              </h4>
              <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
                {c.stopCount} Halte • {c.operator}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Data Source Info */}
      <section className="p-4 bg-zinc-900 text-white rounded-2xl flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-blue-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
              Sumber Data
            </h4>
          </div>
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300">
            Resmi
          </span>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed">
          Detail rute, urutan halte, dan geometri pada aplikasi ini bersumber dari GTFS Transjakarta. Status layanan langsung, tarif yang tidak tercantum di GTFS, dan informasi operator lain tidak diasumsikan tersedia.
        </p>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800 text-center">
          <div>
            <div className="font-mono text-xs text-zinc-400">Operator</div>
            <div className="font-mono text-sm font-bold text-white">Transjakarta</div>
          </div>
          <div>
            <div className="font-mono text-xs text-zinc-400">Rute</div>
            <div className="font-mono text-sm font-bold text-white">{localRoutes.length}</div>
          </div>
          <div>
            <div className="font-mono text-xs text-zinc-400">Diperbarui</div>
            <div className="font-mono text-[10px] font-bold text-blue-400">{getDataSources()[0]?.updatedAt?.slice(0, 10) || "-"}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
