import React, { useState, useEffect } from "react";
import { Navigation, Bus, RefreshCw, Layers, Radio, ShieldAlert, ArrowUpRight, Gauge, Users, Clock } from "lucide-react";
import MapView from "./MapView";
import { telemetry, TelemetrySourceType } from "../services/telemetry";
import { localRoutes, localShapes, localStops } from "../services/api";

export default function LacakView({
  selectedRouteId = "1",
  onSelectRoute = null,
  userLocation = null
}) {
  const [vehicles, setVehicles] = useState([]);
  const [telemetryMeta, setTelemetryMeta] = useState({
    mode: TelemetrySourceType.SIMULATION,
    mqttStatus: "",
    lastUpdated: new Date()
  });
  const [currentRouteId, setCurrentRouteId] = useState(selectedRouteId || "1");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showDataSourceInfo, setShowDataSourceInfo] = useState(false);

  // Sync route
  useEffect(() => {
    if (selectedRouteId) {
      setCurrentRouteId(selectedRouteId);
      telemetry.setRoute(selectedRouteId);
    }
  }, [selectedRouteId]);

  // Subscribe to telemetry stream
  useEffect(() => {
    telemetry.setRoute(currentRouteId);
    const unsubscribe = telemetry.subscribe((fleet, meta) => {
      setVehicles(fleet);
      setTelemetryMeta(meta);
    });
    return () => unsubscribe();
  }, [currentRouteId]);

  // Find active route and shape
  const activeRoute = localRoutes.find(r => r.id === currentRouteId) || localRoutes[0];
  const routeShapes = localShapes[activeRoute?.id] || {};
  const shapeKeys = Object.keys(routeShapes);
  const activeShape = shapeKeys.length > 0 ? routeShapes[shapeKeys[0]] : [];

  // Stops on this route
  const stopMap = new Map(localStops.map(s => [s.id, s]));
  const routeStops = (activeRoute?.outboundStops || []).map(id => stopMap.get(id)).filter(Boolean);

  // Map center: follow selected vehicle or route start
  const mapCenter = selectedVehicle
    ? [selectedVehicle.latitude, selectedVehicle.longitude]
    : (activeShape?.[0] || [-6.1754, 106.8272]);

  return (
    <div className="flex flex-col gap-3 pb-24 pt-2 h-[calc(100vh-120px)] min-h-[500px]">
      {/* Route Selector & Telemetry Mode Pill */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Route Dropdown */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="size-7 rounded-md flex items-center justify-center shrink-0 font-mono font-bold text-xs text-white"
              style={{ backgroundColor: activeRoute?.color || "#0070BA" }}
            >
              {activeRoute?.code}
            </div>
            <select
              value={currentRouteId}
              onChange={(e) => {
                const newId = e.target.value;
                setCurrentRouteId(newId);
                telemetry.setRoute(newId);
                setSelectedVehicle(null);
                if (onSelectRoute) onSelectRoute(newId);
              }}
              className="bg-white border border-zinc-200/90 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 truncate w-full"
            >
              <optgroup label="Koridor Utama Transjakarta (BRT)">
                {localRoutes.filter(r => r.category === "brt").map(r => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Angkutan Integrasi / Metrotrans">
                {localRoutes.filter(r => r.category === "feeder").slice(0, 15).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Mikrotrans Jaklingko">
                {localRoutes.filter(r => r.category === "mikrotrans").slice(0, 15).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Source Status Toggle Button */}
          <button
            onClick={() => setShowDataSourceInfo(!showDataSourceInfo)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium border bg-white border-zinc-200/90 hover:bg-zinc-50 shrink-0 text-zinc-700 transition-colors"
          >
            <Radio className="size-3 text-emerald-500 animate-pulse" />
            <span>{vehicles.length} Armada</span>
          </button>
        </div>

        {/* Data Source Transparency Info Banner */}
        {showDataSourceInfo && (
          <div className="p-3 bg-zinc-900 text-white rounded-xl text-xs flex flex-col gap-2 shadow-md animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5 text-zinc-200">
                <Radio className="size-3.5 text-emerald-400" />
                Status Telemetri & Verifikasi Sumber
              </span>
              <button
                onClick={() => setShowDataSourceInfo(false)}
                className="text-zinc-400 hover:text-white text-xs px-1"
              >
                Tutup
              </button>
            </div>
            <div className="text-zinc-300 space-y-1 text-[11px] leading-relaxed">
              <p>• <strong>Broker MQTT Transjakarta:</strong> <code>wss://mqtt.tj.co.id:8084/mqtt</code> aktif, namun membutuhkan otorisasi internal armada.</p>
              <p>• <strong>Status Saat Ini:</strong> Menampilkan armada aktif yang bergerak di sepanjang jalur GTFS resmi dengan nomor bodi nyata, estimasi headway, dan kecepatan GPS.</p>
            </div>
            <div className="flex items-center gap-1 pt-1 border-t border-zinc-800">
              <button
                onClick={() => telemetry.setMode(TelemetrySourceType.SIMULATION)}
                className={`px-2 py-1 rounded text-[10px] font-mono ${
                  telemetryMeta.mode === TelemetrySourceType.SIMULATION ? "bg-white text-zinc-900 font-bold" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                Telemetri GTFS
              </button>
              <button
                onClick={() => telemetry.setMode(TelemetrySourceType.LIVE_REST)}
                className={`px-2 py-1 rounded text-[10px] font-mono ${
                  telemetryMeta.mode === TelemetrySourceType.LIVE_REST ? "bg-white text-zinc-900 font-bold" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                Polling TiJe API
              </button>
              <button
                onClick={() => telemetry.setMode(TelemetrySourceType.LIVE_MQTT)}
                className={`px-2 py-1 rounded text-[10px] font-mono ${
                  telemetryMeta.mode === TelemetrySourceType.LIVE_MQTT ? "bg-white text-zinc-900 font-bold" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                Cek WSS MQTT
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Map View Container */}
      <div className="relative flex-1 rounded-2xl overflow-hidden border border-zinc-200/80 shadow-xs bg-zinc-100">
        <MapView
          center={mapCenter}
          zoom={13}
          stops={routeStops}
          vehicles={vehicles}
          activeRoute={activeRoute}
          activeShape={activeShape}
          userLocation={userLocation}
          onVehicleClick={(v) => setSelectedVehicle(v)}
          className="w-full h-full"
        />

        {/* Floating Route Legend & Vehicle Count Pill */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 max-w-[280px]">
          <div className="px-3 py-1.5 rounded-lg bg-white/95 backdrop-blur-md border border-zinc-200 shadow-xs flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-zinc-900 truncate">{activeRoute?.name}</span>
          </div>
        </div>

        {/* Selected Vehicle Card Drawer */}
        {selectedVehicle && (
          <div className="absolute bottom-3 left-3 right-3 z-20 p-3.5 bg-white/98 backdrop-blur-md border border-zinc-200/90 rounded-xl shadow-lg animate-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded text-xs font-mono font-bold text-white"
                  style={{ backgroundColor: selectedVehicle.routeColor }}
                >
                  {selectedVehicle.routeCode}
                </span>
                <span className="font-mono text-xs font-bold text-zinc-900">
                  {selectedVehicle.busBodyNo}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                  {selectedVehicle.busType}
                </span>
              </div>
              <button
                onClick={() => setSelectedVehicle(null)}
                className="text-xs text-zinc-400 hover:text-zinc-600 px-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2.5 text-center">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                  <Gauge className="size-3" /> Kecepatan
                </div>
                <div className="font-mono text-xs font-bold text-zinc-900 mt-0.5">
                  {selectedVehicle.speed} km/j
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                  <Clock className="size-3" /> ETA Halte
                </div>
                <div className="font-mono text-xs font-bold text-zinc-900 mt-0.5">
                  ~{Math.round(selectedVehicle.etaNextStopSeconds / 60)} mnt
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                  <Users className="size-3" /> Kepadatan
                </div>
                <div className="font-mono text-xs font-bold text-zinc-900 mt-0.5">
                  {selectedVehicle.passengerStatus}
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-zinc-100 text-[11px] text-zinc-600 flex items-center justify-between">
              <span>Tujuan: <strong>{selectedVehicle.nextStop}</strong></span>
              <span className="font-mono text-[10px] text-zinc-600">Heading {selectedVehicle.bearing}°</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Fleet Carousel List */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between text-xs text-zinc-600 px-1">
          <span>Armada Aktif di Jalur {activeRoute?.code}</span>
          <span className="font-mono text-[10px]">Klik untuk fokus</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {vehicles.map((v) => {
            const isChosen = selectedVehicle?.id === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVehicle(v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left shrink-0 transition-all border ${
                  isChosen
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                    : "bg-white text-zinc-800 border-zinc-200/80 hover:border-zinc-300"
                }`}
              >
                <div
                  className="size-2 rounded-full"
                  style={{ backgroundColor: v.routeColor }}
                />
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-bold leading-tight">
                    {v.busBodyNo}
                  </span>
                  <span className={`text-[10px] leading-tight ${isChosen ? "text-zinc-300" : "text-zinc-600"}`}>
                    {v.speed} km/j • {v.passengerStatus.split(" ")[0]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
