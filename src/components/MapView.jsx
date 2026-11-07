import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Layers, Crosshair, Maximize2, Fullscreen, AlertTriangle } from "lucide-react";

export default function MapView({
  center = [-6.1754, 106.8272],
  zoom = 13,
  stops = [],
  vehicles = [],
  activeRoute = null,
  activeShape = null,
  userLocation = null,
  onStopClick = null,
  onVehicleClick = null,
  className = "w-full h-full"
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const vehicleMarkersRef = useRef(new Map()); // id -> L.marker
  const [mapStyle, setMapStyle] = useState("openstreetmap");
  const [tileError, setTileError] = useState(false);
  const [tileLoading, setTileLoading] = useState(true);

  const layersRef = useRef({
    routes: L.layerGroup(),
    stops: L.layerGroup(),
    vehicles: L.layerGroup(),
    user: L.layerGroup()
  });

  const getTileUrl = (style) => {
    if (style === "openstreetmap") return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: true
    });

    // Basemap Layer
    const tileLayer = L.tileLayer(getTileUrl(mapStyle), {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    tileLayer.on("loading", () => { setTileLoading(true); setTileError(false); });
    tileLayer.on("load", () => { setTileLoading(false); setTileError(false); });
    tileLayer.on("tileerror", () => { setTileLoading(false); setTileError(true); });
    tileLayerRef.current = tileLayer;

    // Zoom control
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Add layer groups in order
    layersRef.current.routes.addTo(map);
    layersRef.current.stops.addTo(map);
    layersRef.current.vehicles.addTo(map);
    layersRef.current.user.addTo(map);

    mapInstanceRef.current = map;

    // Invalidate size immediately and after layout settle
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize({ pan: false }), 500);
    const onResize = () => map.invalidateSize({ pan: false });
    const onVisibility = () => { if (!document.hidden) window.setTimeout(onResize, 50); };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Observe Container Resize to always keep map valid
  useEffect(() => {
    if (!mapContainerRef.current || !mapInstanceRef.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const handleFocus = (event) => {
      const point = event.detail;
      if (!mapInstanceRef.current || point?.lat == null || point?.lon == null) return;
      mapInstanceRef.current.setView([point.lat, point.lon], Math.max(mapInstanceRef.current.getZoom(), 15), { animate: true });
    };
    window.addEventListener("halte:map-view", handleFocus);
    return () => window.removeEventListener("halte:map-view", handleFocus);
  }, []);

  // 3. Update Basemap Style
  useEffect(() => {
    if (!tileLayerRef.current) return;
    tileLayerRef.current.setUrl(getTileUrl(mapStyle));
  }, [mapStyle]);

  // 4. Update Map Center & Zoom
  useEffect(() => {
    if (!mapInstanceRef.current || !center || center.length < 2) return;
    mapInstanceRef.current.setView(center, zoom, { animate: true, duration: 0.8 });
  }, [center?.[0], center?.[1], zoom]);

  // 5. User Location Beacon
  useEffect(() => {
    const layer = layersRef.current.user;
    layer.clearLayers();
    if (!userLocation || !userLocation.lat || !userLocation.lon) return;

    const userIcon = L.divIcon({
      className: "user-beacon",
      html: `
        <div class="relative flex items-center justify-center size-8">
          <div class="absolute size-8 rounded-full bg-blue-500/25 animate-ping"></div>
          <div class="size-4 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    L.marker([userLocation.lat, userLocation.lon], { icon: userIcon })
      .bindTooltip("Posisi Anda", { direction: "top", offset: [0, -10] })
      .addTo(layer);
  }, [userLocation]);

  // 6. Active Route Shape Polyline & Auto-Fit
  useEffect(() => {
    const layer = layersRef.current.routes;
    layer.clearLayers();
    if (!mapInstanceRef.current || !activeShape || activeShape.length === 0) return;

    const color = activeRoute?.color || "#D62126";

    // Polyline shadow casing
    const polylineOutline = L.polyline(activeShape, {
      color: "#000000",
      weight: 6,
      opacity: 0.18,
      lineCap: "round",
      lineJoin: "round"
    });

    // Core colored polyline
    const polyline = L.polyline(activeShape, {
      color,
      weight: 4,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round"
    });

    layer.addLayer(polylineOutline);
    layer.addLayer(polyline);

    try {
      const bounds = polyline.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 });
      }
    } catch (e) {}
  }, [activeShape, activeRoute]);

  // 7. Route Stops
  useEffect(() => {
    const layer = layersRef.current.stops;
    layer.clearLayers();
    if (!stops || stops.length === 0) return;

    for (const stop of stops) {
      if (!stop.lat || !stop.lon) continue;

      const isBRT = stop.isBRT || stop.type === "halte";
      const isRail = stop.mode === "mrt" || stop.mode === "lrt" || stop.mode === "krl";
      const dotColor = isRail ? "#003882" : (isBRT ? (activeRoute?.color || "#D62126") : "#52525b");

      const icon = L.divIcon({
        className: "stop-marker-icon",
        html: `
          <div class="flex items-center justify-center size-5 transition-transform hover:scale-135 cursor-pointer">
            <div class="size-3 rounded-full border-2 border-white shadow-sm" style="background-color: ${dotColor}"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([stop.lat, stop.lon], { icon });

      const routesBadges = (stop.routes || []).slice(0, 6).map(r => `
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold" style="background-color: ${r.color || '#e4e4e7'}; color: ${r.color ? '#fff' : '#18181b'}">
          ${r.code}
        </span>
      `).join(" ");

      marker.bindPopup(`
        <div class="p-3 font-sans max-w-[240px]">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="size-2 rounded-full" style="background-color: ${dotColor}"></span>
            <span class="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
              ${isRail ? stop.mode.toUpperCase() : (isBRT ? "Halte BRT" : "Bus Stop")}
            </span>
          </div>
          <h4 class="font-bold text-sm text-zinc-900 leading-tight mb-1">${stop.name}</h4>
          ${routesBadges ? `<div class="flex flex-wrap gap-1 mt-2 pt-2 border-t border-zinc-100">${routesBadges}</div>` : ""}
        </div>
      `);

      if (onStopClick) {
        marker.on("click", () => onStopClick(stop));
      }

      layer.addLayer(marker);
    }
  }, [stops, activeRoute, onStopClick]);

  // 8. Vehicles (Smooth Marker Updating without flickering)
  useEffect(() => {
    const layer = layersRef.current.vehicles;
    const markersMap = vehicleMarkersRef.current;
    const currentIds = new Set();

    for (const v of vehicles) {
      if (!v.latitude || !v.longitude) continue;
      currentIds.add(v.id);

      const bearing = v.bearing || 0;
      const routeColor = v.routeColor || "#0070BA";

      const html = `
        <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
          <div class="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold text-white shadow-md mb-0.5 whitespace-nowrap transition-transform group-hover:scale-110" style="background-color: ${routeColor}">
            ${v.routeCode}
          </div>
          <div class="size-6 rounded-full bg-white border border-zinc-300 shadow-md flex items-center justify-center transition-transform" style="transform: rotate(${bearing}deg);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${routeColor}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        </div>
      `;

      if (markersMap.has(v.id)) {
        // Update existing marker smoothly
        const marker = markersMap.get(v.id);
        marker.setLatLng([v.latitude, v.longitude]);
        const el = marker.getElement();
        if (el) {
          el.innerHTML = html;
        }
      } else {
        // Create new marker
        const vehicleIcon = L.divIcon({
          className: "vehicle-custom-icon",
          html,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const marker = L.marker([v.latitude, v.longitude], { icon: vehicleIcon });
        marker.on("click", () => {
          if (onVehicleClick) onVehicleClick(v);
        });

        layer.addLayer(marker);
        markersMap.set(v.id, marker);
      }
    }

    // Clean up markers that are no longer active
    for (const [id, marker] of markersMap.entries()) {
      if (!currentIds.has(id)) {
        layer.removeLayer(marker);
        markersMap.delete(id);
      }
    }
  }, [vehicles, onVehicleClick]);

  // Fit bounds helper button
  const handleFitBounds = () => {
    if (!mapInstanceRef.current) return;
    if (activeShape && activeShape.length > 0) {
      const bounds = L.polyline(activeShape).getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [35, 35] });
      }
    } else if (stops.length > 0) {
      const group = L.featureGroup(stops.map(s => L.marker([s.lat, s.lon])));
      mapInstanceRef.current.fitBounds(group.getBounds(), { padding: [35, 35] });
    }
  };

  const handleCenterUser = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lon], 15, { animate: true });
    }
  };

  const toggleBasemap = () => {
    setMapStyle("openstreetmap");
  };

  const handleFullscreen = () => {
    const container = mapContainerRef.current?.parentElement;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      container.requestFullscreen?.();
    }
    window.setTimeout(() => mapInstanceRef.current?.invalidateSize(), 250);
  };

  return (
    <div className={`relative min-h-[360px] overflow-hidden ${className}`}>
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />

      {tileLoading && !tileError && (
        <div className="pointer-events-none absolute left-3 top-3 z-30 rounded-lg bg-white/90 px-3 py-2 text-[11px] text-zinc-600 shadow-sm backdrop-blur dark:bg-zinc-900/90 dark:text-zinc-300">
          Memuat peta Jakarta…
        </div>
      )}

      {tileError && (
        <div className="absolute left-3 bottom-3 z-30 max-w-xs rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] text-amber-900 shadow-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>Peta dasar gagal memuat. Periksa koneksi internet untuk melihat jalan dan nama tempat.</span>
          </div>
        </div>
      )}

      {/* Floating Map Utility Buttons */}
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1.5">
        <button
          onClick={handleFitBounds}
          title="Fokus Rute Lengkap"
          className="size-8 rounded-lg bg-white/95 backdrop-blur-md border border-zinc-200/90 shadow-sm flex items-center justify-center text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
        >
          <Maximize2 className="size-4" />
        </button>

        <button
          onClick={handleFullscreen}
          title="Layar penuh"
          className="size-8 rounded-lg bg-white/95 backdrop-blur-md border border-zinc-200/90 shadow-sm flex items-center justify-center text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
        >
          <Fullscreen className="size-4" />
        </button>

        {userLocation && (
          <button
            onClick={handleCenterUser}
            title="Ke Lokasi Saya"
            className="size-8 rounded-lg bg-white/95 backdrop-blur-md border border-zinc-200/90 shadow-sm flex items-center justify-center text-blue-600 hover:bg-zinc-100 transition-colors"
          >
            <Crosshair className="size-4" />
          </button>
        )}

        <button
          onClick={toggleBasemap}
          title="Peta OpenStreetMap"
          className="size-8 rounded-lg bg-white/95 backdrop-blur-md border border-zinc-200/90 shadow-sm flex items-center justify-center text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
        >
          <Layers className="size-4" />
        </button>
      </div>
    </div>
  );
}
