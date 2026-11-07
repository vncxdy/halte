import React, { useState, useEffect } from "react";
import {
  Navigation, Bus, RefreshCw, Radio, Gauge, Users, Clock,
  Play, Pause, FastForward, Check, ChevronRight, Search, X, MapPin, Eye
} from "lucide-react";
import MapView from "./MapView";
import { telemetry, TelemetrySourceType } from "../services/telemetry";
import { localRoutes, localShapes, localStops } from "../services/api";

export default function LacakView({
  selectedRouteId = "1",
  onSelectRoute = null,
  userLocation = null
}) {
  const [vehicles, setVehicles] = useState([]);
  const [telemetryMeta, setTelemetryMeta] = useState(telemetry.getMeta());
  const [currentRouteId, setCurrentRouteId] = useState(selectedRouteId || "1");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRoutePicker, setShowRoutePicker] = useState(false);
  const [routeSearchQuery, setRouteSearchQuery] = useState("");

  // Sync external route selection
  useEffect(() => {
    if (selectedRouteId && selectedRouteId !== currentRouteId) {
      setCurrentRouteId(selectedRouteId);
      telemetry.setRoute(selectedRouteId);
      setSelectedVehicle(null);
    }
  }, [selectedRouteId]);

  // Subscribe to telemetry stream
  useEffect(() => {
    telemetry.setRoute(currentRouteId);
    const unsubscribe = telemetry.subscribe((fleet, meta) => {
      setVehicles(fleet);
      setTelemetryMeta(meta);

      // If in follow mode, update selectedVehicle reference
      if (selectedVehicle) {
        const updated = fleet.find(v => v.id === selectedVehicle.id);
        if (updated) setSelectedVehicle(updated);
      }
    });
    return () => unsubscribe();
  }, [currentRouteId]);

  // Active route & shape
  const isMulti = currentRouteId === "ALL_BRT" || currentRouteId === "all";
  const activeRoute = isMulti
    ? { id: "ALL_BRT", code: "SEMUA", name: "Semua Koridor BRT (Kota Jakarta)", color: "#D62126" }
    : (localRoutes.find(r => r.id === currentRouteId) || localRoutes[0]);

  const routeShapes = localShapes[activeRoute?.id] || {};
  const shapeKeys = Object.keys(routeShapes);
  const activeShape = shapeKeys.length > 0 ? routeShapes[shapeKeys[0]] : [];

  // Stops for route
  const stopMap = new Map(localStops.map(s => [s.id, s]));
  const routeStops = isMulti
    ? [] // Avoid rendering 8000 stops in multi-corridor view
    : (activeRoute?.outboundStops || []).map(id => stopMap.get(id)).filter(Boolean);

  // Map center calculation
  const mapCenter = selectedVehicle
    ? [selectedVehicle.latitude, selectedVehicle.longitude]
    : (activeShape?.[0] || [-6.1754, 106.8272]);

  // Filter routes for quick picker
  const filteredRoutes = localRoutes.filter(r => {
    if (!routeSearchQuery.trim()) return true;
    const q = routeSearchQuery.toLowerCase().trim();
    return r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q);
  });

  const handleSelectRouteInternal = (rId) => {
    setCurrentRouteId(rId);
    telemetry.setRoute(rId);
    setSelectedVehicle(null);
    setIsFollowing(false);
    setShowRoutePicker(false);
    if (onSelectRoute) onSelectRoute(rId);
  };

  const handleToggleSpeed = () => {
    const next = telemetryMeta.speedMultiplier === 1 ? 2 : (telemetryMeta.speedMultiplier === 2 ? 0 : 1);
    telemetry.setSpeed(next);
  };

  return (
    <div className="flex flex-col gap-3 pb-24 pt-2 h-[calc(100vh-125px)] min-h-[520px]">
      <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] leading-relaxed ${
        telemetryMeta.mode === TelemetrySourceType.SIMULATION
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : telemetryMeta.mode === TelemetrySourceType.LIVE_REST
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-zinc-200 bg-white text-zinc-700"
      }`}>
        <Radio className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {telemetryMeta.mode === TelemetrySourceType.SIMULATION
            ? "Mode demo: posisi, kecepatan, okupansi, dan ETA pada peta disimulasikan dari jalur GTFS dan bukan GPS armada langsung."
            : telemetryMeta.mode === TelemetrySourceType.LIVE_REST
              ? "Sumber: polling REST TiJe. Jika tidak ada respons armada yang valid, kendaraan tidak ditampilkan."
              : "Telemetri langsung belum tersedia melalui sumber yang terotorisasi."}
        </span>
      </div>

      {/* Top Header: Route Switcher & Live Controls */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Active Route Pill / Selector Button */}
          <button
            onClick={() => setShowRoutePicker(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200/90 rounded-xl shadow-xs hover:border-zinc-300 transition-all flex-1 min-w-0 text-left group"
          >
            <div
              className="size-6 rounded-md flex items-center justify-center shrink-0 font-mono font-bold text-xs text-white"
              style={{ backgroundColor: activeRoute?.color || "#0070BA" }}
            >
              {activeRoute?.code}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-zinc-900 truncate">
                {activeRoute?.name}
              </span>
              <span className="text-[10px] text-zinc-500 font-medium">Klik untuk ganti rute / jalur</span>
            </div>
            <Search className="size-3.5 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
          </button>

          {/* Speed Simulation Control Button */}
          {telemetryMeta.mode === TelemetrySourceType.SIMULATION && (
            <button
              onClick={handleToggleSpeed}
              title="Kecepatan Simulasi Bergerak"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-zinc-200/90 hover:bg-zinc-50 text-xs font-mono font-semibold text-zinc-800 shrink-0 shadow-xs transition-colors"
            >
              {telemetryMeta.speedMultiplier === 0 ? (
                <>
                  <Play className="size-3 text-amber-500 fill-amber-500" />
                  <span>Jeda</span>
                </>
              ) : telemetryMeta.speedMultiplier === 2 ? (
                <>
                  <FastForward className="size-3 text-emerald-600 fill-emerald-600" />
                  <span>2x</span>
                </>
              ) : (
                <>
                  <Play className="size-3 text-blue-600 fill-blue-600" />
                  <span>1x</span>
                </>
              )}
            </button>
          )}

          {/* Data Source Transparency Pill */}
          <button
            onClick={() => setShowStatusModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-zinc-200/90 hover:bg-zinc-50 text-xs font-mono font-medium text-zinc-700 shrink-0 shadow-xs transition-colors"
          >
            <span className="relative flex size-2">
              <span className={`relative inline-flex rounded-full size-2 ${
                telemetryMeta.mode === TelemetrySourceType.LIVE_REST ? "bg-emerald-500" : "bg-amber-500"
              }`}></span>
            </span>
            <span>{vehicles.length} Bus · {telemetryMeta.mode === TelemetrySourceType.SIMULATION ? "Demo" : "REST"}</span>
          </button>
        </div>

        {/* Quick Corridor Filter Shortcuts */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => handleSelectRouteInternal("ALL_BRT")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              currentRouteId === "ALL_BRT"
                ? "bg-zinc-900 text-white font-semibold shadow-xs"
                : "bg-white text-zinc-600 border border-zinc-200/80 hover:bg-zinc-50"
            }`}
          >
            Semua Koridor BRT (Kota)
          </button>
          {["1", "2", "3", "6", "8", "9", "13", "14"].map((cNum) => {
            const isCur = currentRouteId === cNum;
            return (
              <button
                key={cNum}
                onClick={() => handleSelectRouteInternal(cNum)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
                  isCur
                    ? "bg-zinc-900 text-white font-bold shadow-xs"
                    : "bg-white text-zinc-600 border border-zinc-200/80 hover:bg-zinc-50"
                }`}
              >
                K{cNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative flex-1 rounded-2xl overflow-hidden border border-zinc-200/90 shadow-sm bg-zinc-100 min-h-[300px]">
        <MapView
          center={mapCenter}
          zoom={isMulti ? 11 : 13}
          stops={routeStops}
          vehicles={vehicles}
          activeRoute={activeRoute}
          activeShape={activeShape}
          userLocation={userLocation}
          onVehicleClick={(v) => {
            setSelectedVehicle(v);
            setIsFollowing(true);
          }}
          className="w-full h-full"
        />

        {/* Floating Follow Mode Banner */}
        {selectedVehicle && (
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
            <button
              onClick={() => setIsFollowing(!isFollowing)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium shadow-md border flex items-center gap-1.5 transition-all ${
                isFollowing
                  ? "bg-emerald-600 text-white border-emerald-500 font-semibold"
                  : "bg-white/95 text-zinc-700 border-zinc-200 hover:bg-white"
              }`}
            >
              <Eye className="size-3.5" />
              <span>{isFollowing ? "Mengikuti Bus" : "Ikuti Kamera"}</span>
            </button>
          </div>
        )}

        {/* Selected Vehicle Card Drawer */}
        {selectedVehicle && (
          <div className="absolute bottom-3 left-3 right-3 z-30 p-4 bg-white/98 backdrop-blur-md border border-zinc-200 rounded-2xl shadow-xl animate-in slide-in-from-bottom-3 duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded text-xs font-mono font-bold text-white shadow-xs"
                  style={{ backgroundColor: selectedVehicle.routeColor }}
                >
                  {selectedVehicle.routeCode}
                </span>
                <span className="font-mono text-sm font-bold text-zinc-950">
                  {selectedVehicle.busBodyNo}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-medium">
                  {selectedVehicle.busType}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedVehicle(null);
                  setIsFollowing(false);
                }}
                className="size-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 py-3 text-center border-b border-zinc-100">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                  <Gauge className="size-3" /> Kecepatan
                </div>
                <div className="font-mono text-sm font-bold text-zinc-900 mt-0.5">
                  {selectedVehicle.speed} km/j
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                  <Clock className="size-3" /> ETA Halte
                </div>
                <div className="font-mono text-sm font-bold text-emerald-600 mt-0.5">
                  ~{Math.round(selectedVehicle.etaNextStopSeconds / 60)} menit
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                  <Users className="size-3" /> Penumpang
                </div>
                <div className="font-mono text-xs font-bold text-zinc-800 mt-0.5">
                  {selectedVehicle.passengerStatus}
                </div>
              </div>
            </div>

            {/* Upcoming Halte Countdown List */}
            {selectedVehicle.upcomingStops && selectedVehicle.upcomingStops.length > 0 && (
              <div className="pt-2.5 flex flex-col gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                  PEMBERHENTIAN BERIKUTNYA
                </span>
                <div className="flex items-center justify-between text-xs font-medium text-zinc-800">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="truncate">{selectedVehicle.upcomingStops[0].name}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-zinc-900 shrink-0 ml-2">
                    {selectedVehicle.upcomingStops[0].etaMinutes} mnt ({selectedVehicle.upcomingStops[0].distanceMeters} m)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fleet Bottom Carousel */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between text-xs text-zinc-600 px-1">
          <span>Armada Aktif di {activeRoute?.code} ({vehicles.length} bus)</span>
          <span className="font-mono text-[10px] text-zinc-500">Klik armada untuk memantau</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {vehicles.map((v) => {
            const isChosen = selectedVehicle?.id === v.id;
            return (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVehicle(v);
                  setIsFollowing(true);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left shrink-0 transition-all border ${
                  isChosen
                    ? "bg-zinc-950 text-white border-zinc-950 shadow-md ring-2 ring-zinc-900/10 scale-102"
                    : "bg-white text-zinc-800 border-zinc-200/90 hover:border-zinc-300"
                }`}
              >
                <div
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: v.routeColor }}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold leading-tight">
                      {v.busBodyNo}
                    </span>
                    <span className="text-[9px] font-mono px-1 rounded bg-zinc-100 text-zinc-700">
                      {v.routeCode}
                    </span>
                  </div>
                  <span className={`text-[10px] leading-tight mt-0.5 ${isChosen ? "text-zinc-300" : "text-zinc-500"}`}>
                    {v.speed} km/j • {v.nextStop.split(" ")[0]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Route Search & Picker Modal */}
      {showRoutePicker && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-3 border-b border-zinc-100 flex items-center justify-between">
              <span className="font-bold text-sm text-zinc-900">Pilih Rute Pelacak</span>
              <button
                onClick={() => setShowRoutePicker(false)}
                className="size-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-3 border-b border-zinc-100">
              <div className="relative">
                <Search className="size-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={routeSearchQuery}
                  onChange={(e) => setRouteSearchQuery(e.target.value)}
                  placeholder="Ketik kode atau nama rute..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-hidden"
                />
              </div>
            </div>

            <div className="p-2 overflow-y-auto flex flex-col gap-1">
              <div
                onClick={() => handleSelectRouteInternal("ALL_BRT")}
                className="p-2.5 rounded-xl hover:bg-zinc-100 cursor-pointer flex items-center justify-between border border-transparent hover:border-zinc-200"
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-zinc-900 text-white font-mono font-bold text-xs">
                    KOTA
                  </span>
                  <span className="text-xs font-semibold text-zinc-900">
                    Semua Koridor BRT (Kota Jakarta)
                  </span>
                </div>
                <ChevronRight className="size-4 text-zinc-400" />
              </div>

              {filteredRoutes.slice(0, 35).map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleSelectRouteInternal(r.id)}
                  className="p-2.5 rounded-xl hover:bg-zinc-100 cursor-pointer flex items-center justify-between border border-transparent hover:border-zinc-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-mono font-bold text-white shrink-0"
                      style={{ backgroundColor: r.color || "#0070BA" }}
                    >
                      {r.code}
                    </span>
                    <span className="text-xs font-semibold text-zinc-800 truncate">
                      {r.name}
                    </span>
                  </div>
                  <ChevronRight className="size-4 text-zinc-400 shrink-0 ml-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Telemetry Status & Live Probe Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-emerald-500" />
                <h3 className="font-bold text-sm text-zinc-900">Status Sumber Telemetri</h3>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="size-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Broker Resmi:</span>
                <code className="font-mono text-[11px] text-zinc-800 font-bold">wss://mqtt.tj.co.id:8084/mqtt</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Port Handshake:</span>
                <span className="font-mono text-zinc-800">8084 (WSS / TLS)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Sertifikat SSL:</span>
                <span className="text-emerald-700 font-medium">Valid (*.tj.co.id s/d Mar 2027)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Akses MQTT Publik:</span>
                <span className="text-amber-700 font-semibold">Memerlukan Hak Operator</span>
              </div>
            </div>

            <div className="text-xs text-zinc-600 leading-relaxed space-y-1">
              <p>• <strong>Telemetri Halte:</strong> Menampilkan armada busway aktif yang bergerak berdasarkan koordinat jalan GTFS resmi dengan nomor bodi nyata, kompas bearing, dan kalkulasi jarak halte.</p>
              <p>• <strong>Uji Koneksi WSS:</strong> Anda dapat menguji WebSocket ke broker MQTT Transjakarta secara langsung:</p>
            </div>

            <div className="p-2.5 bg-zinc-900 text-white rounded-xl text-xs font-mono">
              <div className="text-zinc-400 text-[10px]">LOG KONEKSI LIVE:</div>
              <div className="mt-1 text-emerald-400">{telemetryMeta.mqttStatus}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => telemetry.probeMqttConnection()}
                className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw className="size-3.5" />
                <span>Uji Koneksi WSS Sekarang</span>
              </button>
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
