import React, { useState, useMemo, useEffect } from "react";
import { Search, ChevronRight, Bus, Train, Compass } from "lucide-react";
import { localRoutes } from "../services/api";

export default function JalurView({
  onSelectRoute = null,
  activeRouteId = null,
  initialCategory = "all"
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || "all");

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  const categories = [
    { id: "all", label: "Semua" },
    { id: "brt", label: "BRT Koridor" },
    { id: "feeder", label: "Metrotrans" },
    { id: "mikrotrans", label: "Mikrotrans" },
    { id: "rail", label: "MRT / LRT / KRL" }
  ];

  const filteredRoutes = useMemo(() => {
    return localRoutes.filter((route) => {
      // Category filter
      if (selectedCategory === "brt" && route.category !== "brt") return false;
      if (selectedCategory === "feeder" && route.category !== "feeder" && route.category !== "transjabodetabek") return false;
      if (selectedCategory === "mikrotrans" && route.category !== "mikrotrans") return false;
      if (selectedCategory === "rail" && route.category !== "mrt" && route.category !== "lrt" && route.category !== "krl") return false;

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = route.code.toLowerCase().includes(q);
        const matchName = route.name.toLowerCase().includes(q);
        const matchDesc = (route.description || "").toLowerCase().includes(q);
        return matchCode || matchName || matchDesc;
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col gap-4 pb-24 pt-3">
      {/* Header text */}
      <div>
        <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Daftar Jalur & Rute</h2>
        <p className="text-xs text-zinc-600 mt-0.5">
          Jelajahi {localRoutes.length} rute busway, angkutan umum integrasi, mikrotrans, dan rel.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200/80"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Search Input within Jalur */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari kode rute (cth: 1, 6A, 1A, JAK.79, M1)..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
          >
            Hapus
          </button>
        )}
      </div>

      {/* Route List Count */}
      <div className="flex items-center justify-between text-xs text-zinc-600 px-1">
        <span>Menampilkan <strong>{filteredRoutes.length}</strong> jalur</span>
        <span className="font-mono text-[11px]">Tarif Integrasi</span>
      </div>

      {/* Route Cards */}
      <div className="flex flex-col gap-2">
        {filteredRoutes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-white border border-zinc-200 rounded-2xl text-center">
            <Compass className="size-8 text-zinc-300 mb-2" />
            <p className="text-sm font-semibold text-zinc-700">Rute tidak ditemukan</p>
            <p className="text-xs text-zinc-600 mt-1">Coba kata kunci pencarian yang lain.</p>
          </div>
        ) : (
          filteredRoutes.map((route) => {
            const isSelected = activeRouteId === route.id;
            return (
              <div
                key={route.id}
                onClick={() => onSelectRoute && onSelectRoute(route.id)}
                className={`flex items-center justify-between p-3.5 bg-white border rounded-xl hover:shadow-xs transition-all cursor-pointer group ${
                  isSelected ? "border-zinc-900 ring-2 ring-zinc-900/10" : "border-zinc-200/80 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Route Badge */}
                  <div
                    className="size-10 rounded-lg flex items-center justify-center shrink-0 font-mono font-bold text-xs text-white shadow-2xs group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: route.color || "#0070BA" }}
                  >
                    {route.code}
                  </div>

                  {/* Route Details */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-zinc-900 truncate group-hover:text-zinc-950">
                        {route.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-600">
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600">
                        {route.modeLabel}
                      </span>
                      <span>•</span>
                      <span>{route.stopCount} Halte</span>
                      <span>•</span>
                       <span className="font-mono">{route.operatingHours || "Jadwal tidak tersedia"}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action */}
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-xs font-semibold text-zinc-900">
                      {route.fare === 0 ? "Gratis" : (typeof route.fare === "number" ? `Rp ${route.fare.toLocaleString("id-ID")}` : "Tarif tidak tersedia")}
                    </span>
                    <span className="text-[10px] text-zinc-600">{route.headwayMinutes || "Headway tidak tersedia"}</span>
                  </div>
                  <ChevronRight className="size-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
