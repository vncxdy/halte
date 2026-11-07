import React, { useEffect, useRef } from "react";
import L from "leaflet";

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
  const layersRef = useRef({
    stops: L.layerGroup(),
    vehicles: L.layerGroup(),
    routes: L.layerGroup(),
    user: L.layerGroup()
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Prevent double initialization

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false
    });

    // CartoDB Positron tile layer (clean, high-contrast, minimalist)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd"
    }).addTo(map);

    // Zoom controls at bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Add layer groups
    layersRef.current.routes.addTo(map);
    layersRef.current.stops.addTo(map);
    layersRef.current.vehicles.addTo(map);
    layersRef.current.user.addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update center when changed
  useEffect(() => {
    if (!mapInstanceRef.current || !center) return;
    mapInstanceRef.current.setView(center, zoom, { animate: true });
  }, [center?.[0], center?.[1], zoom]);

  // Render User Location
  useEffect(() => {
    const layer = layersRef.current.user;
    layer.clearLayers();
    if (!userLocation) return;

    const userIcon = L.divIcon({
      className: "user-loc-icon",
      html: `
        <div class="relative flex items-center justify-center size-8">
          <div class="absolute size-8 rounded-full bg-blue-500/20 animate-ping"></div>
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

  // Render Active Route Shape Polyline
  useEffect(() => {
    const layer = layersRef.current.routes;
    layer.clearLayers();
    if (!mapInstanceRef.current || !activeShape || activeShape.length === 0) return;

    const color = activeRoute?.color || "#D62126";

    // Casing outline for crisp contrast
    const polylineOutline = L.polyline(activeShape, {
      color: "#000000",
      weight: 6,
      opacity: 0.15,
      lineCap: "round",
      lineJoin: "round"
    });

    // Core route polyline
    const polyline = L.polyline(activeShape, {
      color,
      weight: 4,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round"
    });

    layer.addLayer(polylineOutline);
    layer.addLayer(polyline);

    // Fit map bounds to route
    try {
      const bounds = polyline.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    } catch (e) {
      // Ignore
    }
  }, [activeShape, activeRoute]);

  // Render Stops
  useEffect(() => {
    const layer = layersRef.current.stops;
    layer.clearLayers();
    if (!stops || stops.length === 0) return;

    for (const stop of stops) {
      if (!stop.lat || !stop.lon) continue;

      const isBRT = stop.isBRT || stop.type === "halte";
      const isRail = stop.mode === "mrt" || stop.mode === "lrt" || stop.mode === "krl";

      const bgColor = isRail ? "#003882" : (isBRT ? "#D62126" : "#71717a");

      const icon = L.divIcon({
        className: "stop-icon",
        html: `
          <div class="group flex items-center justify-center size-5 transition-transform hover:scale-125">
            <div class="size-3 rounded-full border-2 border-white shadow-sm" style="background-color: ${bgColor}"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([stop.lat, stop.lon], { icon });

      // Custom sleek popup
      const routesBadges = (stop.routes || []).slice(0, 5).map(r => `
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium" style="background-color: ${r.color || '#e4e4e7'}; color: ${r.color ? '#fff' : '#18181b'}">
          ${r.code}
        </span>
      `).join(" ");

      marker.bindPopup(`
        <div class="p-3 font-sans max-w-[220px]">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="size-2 rounded-full" style="background-color: ${bgColor}"></span>
            <span class="text-[10px] font-mono uppercase tracking-wider text-zinc-500">${isRail ? stop.mode.toUpperCase() : (isBRT ? "Halte BRT" : "Bus Stop")}</span>
          </div>
          <h4 class="font-semibold text-sm text-zinc-900 leading-tight mb-1.5">${stop.name}</h4>
          ${routesBadges ? `<div class="flex flex-wrap gap-1 mt-2">${routesBadges}</div>` : ""}
        </div>
      `);

      if (onStopClick) {
        marker.on("click", () => onStopClick(stop));
      }

      layer.addLayer(marker);
    }
  }, [stops, onStopClick]);

  // Render Vehicles
  useEffect(() => {
    const layer = layersRef.current.vehicles;
    layer.clearLayers();
    if (!vehicles || vehicles.length === 0) return;

    for (const v of vehicles) {
      if (!v.latitude || !v.longitude) continue;

      const bearing = v.bearing || 0;
      const routeColor = v.routeColor || "#0070BA";

      const vehicleIcon = L.divIcon({
        className: "vehicle-icon",
        html: `
          <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
            <!-- Route badge pill -->
            <div class="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold text-white shadow-md mb-0.5 transition-transform group-hover:scale-110 whitespace-nowrap" style="background-color: ${routeColor}">
              ${v.routeCode}
            </div>
            <!-- Arrow vehicle pointer -->
            <div class="size-6 rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center transition-transform" style="transform: rotate(${bearing}deg);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${routeColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
              </svg>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const marker = L.marker([v.latitude, v.longitude], { icon: vehicleIcon });

      if (onVehicleClick) {
        marker.on("click", () => onVehicleClick(v));
      }

      layer.addLayer(marker);
    }
  }, [vehicles, onVehicleClick]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
