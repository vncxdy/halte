import React from "react";
import { Search, Compass, MapPin, Bus, ArrowRight, ShieldCheck, Clock, ExternalLink, Zap } from "lucide-react";
import corridorsData from "../data/corridors.json";
import { formatDistance } from "../services/geo";

export default function BerandaView({
  nearbyStops = [],
  onSelectStop = null,
  onSelectRoute = null,
  onPlanTrip = null,
  onSearchOpen = null,
  setActiveTab = null
}) {
  return (
    <div className="flex flex-col gap-6 pb-24 pt-3">
      {/* Search Input Banner */}
      <div className="relative">
        <button
          onClick={onSearchOpen}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-zinc-200/90 rounded-xl shadow-xs hover:border-zinc-300 transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <Search className="size-4.5 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-zinc-800">Mau ke mana hari ini?</span>
              <span className="text-xs text-zinc-600">Cari rute, koridor, atau halte di Jabodetabek</span>
            </div>
          </div>
          <span className="px-2 py-1 rounded bg-zinc-100 text-[11px] font-mono font-medium text-zinc-500 group-hover:bg-zinc-200 transition-colors">
            Cari
          </span>
        </button>
      </div>

      {/* Quick Category Action Grid */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => setActiveTab("jalur")}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-zinc-200/70 hover:border-zinc-300 transition-all text-center group"
        >
          <div className="size-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <span className="font-mono font-bold text-xs">BRT</span>
          </div>
          <span className="text-xs font-medium text-zinc-700 leading-tight">Koridor</span>
        </button>

        <button
          onClick={() => setActiveTab("jalur")}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-zinc-200/70 hover:border-zinc-300 transition-all text-center group"
        >
          <div className="size-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <Bus className="size-4.5" />
          </div>
          <span className="text-xs font-medium text-zinc-700 leading-tight">Feeder</span>
        </button>

        <button
          onClick={() => setActiveTab("lacak")}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-zinc-200/70 hover:border-zinc-300 transition-all text-center group"
        >
          <div className="size-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <Zap className="size-4.5" />
          </div>
          <span className="text-xs font-medium text-zinc-700 leading-tight">Pelacak</span>
        </button>

        <button
          onClick={() => setActiveTab("rute")}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-zinc-200/70 hover:border-zinc-300 transition-all text-center group"
        >
          <div className="size-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
            <MapPin className="size-4.5" />
          </div>
          <span className="text-xs font-medium text-zinc-700 leading-tight">Rencana</span>
        </button>
      </div>

      {/* Network Status Pill */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/60 text-emerald-950 text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-2 bg-emerald-600"></span>
          </span>
          <span className="font-medium">Layanan Normal: 14 Koridor BRT & Mikrotrans Beroperasi Penuh</span>
        </div>
        <span className="font-mono text-[11px] text-emerald-800">Rp 3.500</span>
      </div>

      {/* Nearby Stops Section */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">Halte Terdekat</h3>
            <span className="text-[11px] font-mono text-zinc-600">({nearbyStops.length})</span>
          </div>
          <button
            onClick={() => setActiveTab("halte")}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1 transition-colors"
          >
            Lihat Semua <ArrowRight className="size-3" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {nearbyStops.slice(0, 4).map((stop) => (
            <div
              key={stop.id}
              onClick={() => onSelectStop && onSelectStop(stop)}
              className="flex items-center justify-between p-3 bg-white border border-zinc-200/80 rounded-xl hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className={`mt-0.5 size-7 rounded-lg flex items-center justify-center shrink-0 ${
                  stop.isBRT ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-600"
                }`}>
                  <Bus className="size-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h4 className="text-xs font-semibold text-zinc-900 truncate group-hover:text-zinc-950">
                    {stop.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-[10px] text-zinc-600 uppercase">
                      {stop.isBRT ? "Halte BRT" : "Bus Stop"}
                    </span>
                    <span className="text-zinc-400">•</span>
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
                  <span className="text-[10px] font-mono text-zinc-600">
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
            <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">Koridor Utama Transjakarta</h3>
            <span className="text-[11px] font-mono text-zinc-600">14 Koridor</span>
          </div>
          <button
            onClick={() => setActiveTab("jalur")}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1 transition-colors"
          >
            Semua Jalur <ArrowRight className="size-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {corridorsData.slice(0, 6).map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectRoute && onSelectRoute(c.id)}
              className="flex flex-col p-3 bg-white border border-zinc-200/80 rounded-xl hover:border-zinc-300 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="px-2 py-0.5 rounded text-xs font-mono font-bold text-white"
                  style={{ backgroundColor: c.color }}
                >
                  K{c.number}
                </span>
                <span className="text-[10px] font-mono text-zinc-600">{c.hours.split(" ")[0]}</span>
              </div>
              <h4 className="text-xs font-semibold text-zinc-900 truncate leading-snug">
                {c.name}
              </h4>
              <p className="text-[10px] text-zinc-600 mt-1 line-clamp-1">
                {c.activeStops} Halte • {c.headway}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Integrated Fare and Transit Info */}
      <section className="p-4 bg-zinc-900 text-white rounded-2xl flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
              Integrasi Tarif Jabodetabek
            </h4>
          </div>
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300">
            Resmi
          </span>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed">
          Tarif flat Transjakarta adalah <strong>Rp 3.500</strong> dengan bebas transit antar halte BRT hingga 3 jam. Layanan Mikrotrans (Jaklingko) adalah <strong>Rp 0 (Gratis)</strong> dengan kartu uang elektronik terdaftar.
        </p>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800 text-center">
          <div>
            <div className="font-mono text-xs text-zinc-400">BRT & Feeder</div>
            <div className="font-mono text-sm font-bold text-white">Rp 3.500</div>
          </div>
          <div>
            <div className="font-mono text-xs text-zinc-400">Mikrotrans</div>
            <div className="font-mono text-sm font-bold text-emerald-400">Rp 0</div>
          </div>
          <div>
            <div className="font-mono text-xs text-zinc-400">MRT Jakarta</div>
            <div className="font-mono text-sm font-bold text-blue-400">s/d 14k</div>
          </div>
        </div>
      </section>
    </div>
  );
}
