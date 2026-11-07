import React, { useEffect, useMemo, useState } from "react";
import { Bus, Layers, LocateFixed, Route, Search, X } from "lucide-react";
import MapView from "./MapView";
import { localRoutes, localShapes, localStops } from "../services/api";
import { getDistanceKm } from "../services/geo";
import { telemetry } from "../services/telemetry";
import { getVehicleStatus } from "../services/vehicleStatus";

export default function MapHome({ userLocation, onLocateMe, isLocating, onSelectStop, onSelectRoute, onSearchOpen }) {
  const [vehicles, setVehicles] = useState([]);
  const [meta, setMeta] = useState(telemetry.getMeta());
  const [routeId, setRouteId] = useState(null);
  const [showStops, setShowStops] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);

  useEffect(() => telemetry.subscribe((fleet, nextMeta) => {
    setVehicles(fleet);
    setMeta(nextMeta);
  }), []);

  const center = userLocation ? [userLocation.lat, userLocation.lon] : [-6.1754, 106.8272];
  const route = localRoutes.find((item) => item.id === routeId);
  const shapeSet = route ? localShapes[route.id] || {} : {};
  const activeShape = Object.values(shapeSet)[0] || null;
  const visibleStops = useMemo(() => {
    const candidates = route?.outboundStops?.length
      ? route.outboundStops.map((id) => localStops.find((stop) => stop.id === id)).filter(Boolean)
      : localStops.filter((stop) => getDistanceKm(center[0], center[1], stop.lat, stop.lon) <= 4);
    return candidates.slice(0, route ? 300 : 450);
  }, [route, center[0], center[1]]);
  const status = getVehicleStatus(meta);
  const displayedVehicles = showVehicles ? vehicles : [];

  return (
    <section className="relative h-full min-h-[calc(100svh-7.5rem)] overflow-hidden rounded-[1.5rem] bg-zinc-200 shadow-sm ring-1 ring-black/5">
      <MapView
        center={center}
        zoom={route ? 13 : 12}
        stops={showStops ? visibleStops : []}
        vehicles={displayedVehicles}
        activeRoute={route}
        activeShape={activeShape}
        userLocation={userLocation}
        onStopClick={onSelectStop}
        onVehicleClick={(vehicle) => window.dispatchEvent(new CustomEvent("halte:vehicle", { detail: vehicle }))}
        className="absolute inset-0"
      />

      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2 sm:inset-x-5 sm:top-5">
        <div className="pointer-events-auto flex max-w-[min(70vw,22rem)] items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur-xl dark:bg-zinc-900/90 dark:ring-white/10">
          <Bus className="size-4 text-red-600" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">{route ? route.code : "Jakarta & Jabodetabek"}</p>
            <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{status.label} · {status.detail}</p>
          </div>
          {route && <button onClick={() => { setRouteId(null); onSelectRoute?.(null); }} className="ml-auto rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="size-3.5" /></button>}
        </div>
        <div className="pointer-events-auto flex gap-1.5">
          <button onClick={onLocateMe} title="Lokasi saya" className="rounded-xl bg-white/90 p-2.5 text-zinc-700 shadow-lg ring-1 ring-black/5 backdrop-blur-xl dark:bg-zinc-900/90 dark:text-zinc-200 dark:ring-white/10"><LocateFixed className={isLocating ? "size-4 animate-spin" : "size-4"} /></button>
          <button onClick={onSearchOpen} title="Cari" className="rounded-xl bg-white/90 p-2.5 text-zinc-700 shadow-lg ring-1 ring-black/5 backdrop-blur-xl dark:bg-zinc-900/90 dark:text-zinc-200 dark:ring-white/10"><Search className="size-4" /></button>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5 sm:bottom-5 sm:left-5">
        <button onClick={() => setShowVehicles((value) => !value)} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold shadow-lg backdrop-blur-xl ${showVehicles ? "bg-zinc-950 text-white" : "bg-white/90 text-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-300"}`}><Bus className="size-3.5" /> Kendaraan {status.label}</button>
        <button onClick={() => setShowStops((value) => !value)} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold shadow-lg backdrop-blur-xl ${showStops ? "bg-white/90 text-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-200" : "bg-zinc-200/90 text-zinc-500"}`}><Layers className="size-3.5" /> Halte</button>
        <select value={routeId || ""} onChange={(event) => { const value = event.target.value || null; setRouteId(value); onSelectRoute?.(value); }} className="max-w-40 appearance-none rounded-full bg-white/90 px-3 py-2 text-[11px] font-semibold text-zinc-700 shadow-lg outline-none backdrop-blur-xl dark:bg-zinc-900/90 dark:text-zinc-200">
          <option value="">Semua rute</option>
          {localRoutes.slice(0, 80).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
        </select>
      </div>
    </section>
  );
}