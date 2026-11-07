import React, { useEffect, useState } from "react";
import { Settings, X } from "lucide-react";
import { TopNav, BottomNav } from "./components/Navigation";
import MapHome from "./components/MapHome";
import FavoritesView from "./components/FavoritesView";
import RuteView from "./components/RuteView";
import HalteView from "./components/HalteView";
import StopDetailModal from "./components/StopDetailModal";
import RouteDetailModal from "./components/RouteDetailModal";
import SearchModal from "./components/SearchModal";
import VehicleSheet from "./components/VehicleSheet";
import { getNearbyStops } from "./services/api";
import { JAKARTA_CENTER } from "./services/geo";
import { telemetry } from "./services/telemetry";
import { readFavorites, toggleFavorite, writeFavorites } from "./services/favorites";
import { readTheme, resolveTheme, writeTheme } from "./services/theme";

export default function App() {
  const [activeTab, setActiveTab] = useState("peta");
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedStop, setSelectedStop] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [journeyOrigin, setJourneyOrigin] = useState(null);
  const [journeyDestination, setJourneyDestination] = useState(null);
  const [favorites, setFavorites] = useState(() => readFavorites());
  const [theme, setTheme] = useState(() => readTheme());
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const effectiveTheme = resolveTheme(theme, window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", effectiveTheme === "dark");
    document.body.classList.toggle("dark", effectiveTheme === "dark");
  }, [effectiveTheme]);

  useEffect(() => {
    if (theme !== "system") return undefined;
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const update = () => {
      const dark = media?.matches;
      document.documentElement.classList.toggle("dark", dark);
      document.body.classList.toggle("dark", dark);
    };
    media?.addEventListener?.("change", update);
    return () => media?.removeEventListener?.("change", update);
  }, [theme]);

  useEffect(() => {
    const lat = userLocation?.lat ?? JAKARTA_CENTER.lat;
    const lon = userLocation?.lon ?? JAKARTA_CENTER.lon;
    telemetry.setCenter(lat, lon);
    getNearbyStops(lat, lon, 15).catch(() => {});
  }, [userLocation]);

  useEffect(() => {
    const handleVehicle = (event) => setSelectedVehicle(event.detail || null);
    window.addEventListener("halte:vehicle", handleVehicle);
    return () => window.removeEventListener("halte:vehicle", handleVehicle);
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => { setUserLocation({ lat: position.coords.latitude, lon: position.coords.longitude, name: "Lokasi Anda (GPS)" }); setIsLocating(false); },
      () => { setUserLocation(JAKARTA_CENTER); setIsLocating(false); },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const saveFavorite = (item) => setFavorites((current) => { const next = toggleFavorite(current, item); writeFavorites(next); return next; });
  const saveStopFavorite = (stop) => saveFavorite({ kind: "stop", id: stop.id, name: stop.name, value: stop });
  const saveRouteFavorite = (route) => saveFavorite({ kind: "route", id: route.id, name: route.name || route.code, value: route });
  const selectRoute = (routeId) => { if (!routeId) return; setSelectedRouteId(routeId); setIsRouteModalOpen(true); setActiveTab("peta"); };
  const selectStop = (stop) => {
    setSelectedStop(stop);
    setActiveTab("peta");
    const point = stop?.variants?.[0] || stop;
    if (point?.lat != null && point?.lon != null) window.dispatchEvent(new CustomEvent("halte:focus", { detail: point }));
  };
  const setOrigin = (stop) => { setJourneyOrigin(stop); setActiveTab("rute"); };
  const setDestination = (stop) => { setJourneyDestination(stop); setActiveTab("rute"); };

  return (
    <div className="min-h-[100svh] bg-[#f4f4f5] font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <TopNav onSearchOpen={() => setIsSearchOpen(true)} onLocateMe={handleLocateMe} isLocating={isLocating} onProfile={() => setProfileOpen(true)} />
      <main className={activeTab === "peta" ? "h-[100svh] p-0 sm:p-3" : "min-h-[100svh] pt-2 sm:pt-4"}>
        {activeTab === "peta" && <MapHome userLocation={userLocation} onLocateMe={handleLocateMe} isLocating={isLocating} onSelectStop={selectStop} onSelectRoute={setSelectedRouteId} onSearchOpen={() => setIsSearchOpen(true)} />}
        {activeTab === "rute" && <RuteView userLocation={userLocation} originOverride={journeyOrigin} destinationOverride={journeyDestination} onSelectStop={selectStop} />}
        {activeTab === "favorit" && <FavoritesView items={favorites} onRemove={saveFavorite} onSelectRoute={selectRoute} onSelectStop={selectStop} />}
        {activeTab === "halte" && <HalteView userLocation={userLocation} onSelectStop={selectStop} onSelectRoute={selectRoute} />}
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      {selectedStop && <StopDetailModal stop={selectedStop} onClose={() => setSelectedStop(null)} onSelectRoute={selectRoute} onSetOrigin={setOrigin} onSetDestination={setDestination} isFavorite={favorites.some((item) => item.kind === "stop" && item.id === (selectedStop.variants?.[0]?.id || selectedStop.id))} onToggleFavorite={saveStopFavorite} />}
      {isRouteModalOpen && selectedRouteId && <RouteDetailModal routeId={selectedRouteId} onClose={() => setIsRouteModalOpen(false)} onSelectStop={selectStop} onTrackRoute={(id) => { setSelectedRouteId(id); setIsRouteModalOpen(false); setActiveTab("peta"); }} isFavorite={favorites.some((item) => item.kind === "route" && item.id === selectedRouteId)} onToggleFavorite={saveRouteFavorite} />}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelectRoute={selectRoute} onSelectStop={setSelectedStop} />
      <VehicleSheet vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
      {profileOpen && <div className="fixed inset-0 z-[70] bg-black/30 p-3 backdrop-blur-sm" onClick={() => setProfileOpen(false)}><aside className="ml-auto flex h-full w-full max-w-sm flex-col rounded-3xl bg-white p-5 shadow-2xl dark:bg-zinc-900" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-zinc-500">Halte</p><h2 className="text-lg font-bold">Pengaturan</h2></div><button onClick={() => setProfileOpen(false)} className="rounded-full bg-zinc-100 p-2 dark:bg-zinc-800"><X className="size-4" /></button></div><div className="mt-6 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800"><div className="flex items-center gap-3"><Settings className="size-5 text-zinc-500" /><div><p className="text-sm font-semibold">Akun</p><p className="text-xs text-zinc-500">Fitur akun dan sinkronisasi akan hadir nanti.</p></div></div></div><div className="mt-5"><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">Tema</p><div className="grid grid-cols-3 gap-2">{["light", "dark", "system"].map((item) => <button key={item} onClick={() => setTheme(writeTheme(item))} className={`rounded-xl px-2 py-2 text-xs font-semibold capitalize ${theme === item ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}>{item}</button>)}</div></div><p className="mt-auto text-xs text-zinc-500">Mode kendaraan dibedakan sebagai Live, Demo, atau Tidak tersedia. Tidak ada akun palsu.</p></aside></div>}
    </div>
  );
}