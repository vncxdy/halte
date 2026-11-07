import React, { useState, useEffect } from "react";
import { TopNav, BottomNav } from "./components/Navigation";
import BerandaView from "./components/BerandaView";
import JalurView from "./components/JalurView";
import LacakView from "./components/LacakView";
import RuteView from "./components/RuteView";
import HalteView from "./components/HalteView";
import StopDetailModal from "./components/StopDetailModal";
import RouteDetailModal from "./components/RouteDetailModal";
import SearchModal from "./components/SearchModal";
import { getNearbyStops } from "./services/api";
import { JAKARTA_CENTER } from "./services/geo";
import { telemetry } from "./services/telemetry";

export default function App() {
  const [activeTab, setActiveTab] = useState("beranda");
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [nearbyStops, setNearbyStops] = useState([]);

  // Modals & Active selections
  const [selectedStop, setSelectedStop] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState("1");
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Journey planner overrides
  const [journeyOrigin, setJourneyOrigin] = useState(null);
  const [journeyDestination, setJourneyDestination] = useState(null);

  // Load nearby stops around default center or user location
  useEffect(() => {
    const lat = userLocation ? userLocation.lat : JAKARTA_CENTER.lat;
    const lon = userLocation ? userLocation.lon : JAKARTA_CENTER.lon;

    telemetry.setCenter(lat, lon);

    getNearbyStops(lat, lon, 15).then((stops) => {
      setNearbyStops(stops);
    });
  }, [userLocation]);

  // Handle Locate Me GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung geolokasi.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const loc = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          name: "Lokasi Anda (GPS)"
        };
        setUserLocation(loc);
      },
      (err) => {
        setIsLocating(false);
        console.warn("Geolocation error:", err.message);
        // Fallback to Jakarta center
        setUserLocation(JAKARTA_CENTER);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Keyboard shortcut Cmd+K / Ctrl+K to open search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
      {/* Top Navbar */}
      <TopNav
        activeTab={activeTab}
        onSearchOpen={() => setIsSearchOpen(true)}
        onLocateMe={handleLocateMe}
        isLocating={isLocating}
      />

      {/* Main Container - Mobile First Max-W-XL */}
      <main className="mx-auto w-full max-w-xl flex-1 px-4 sm:px-6">
        {activeTab === "beranda" && (
          <BerandaView
            nearbyStops={nearbyStops}
            onSelectStop={(stop) => setSelectedStop(stop)}
            onSelectRoute={(routeId) => {
              setSelectedRouteId(routeId);
              setIsRouteModalOpen(true);
            }}
            onSearchOpen={() => setIsSearchOpen(true)}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "jalur" && (
          <JalurView
            activeRouteId={selectedRouteId}
            onSelectRoute={(routeId) => {
              setSelectedRouteId(routeId);
              setIsRouteModalOpen(true);
            }}
          />
        )}

        {activeTab === "lacak" && (
          <LacakView
            selectedRouteId={selectedRouteId}
            onSelectRoute={(routeId) => setSelectedRouteId(routeId)}
            userLocation={userLocation}
          />
        )}

        {activeTab === "rute" && (
          <RuteView
            userLocation={userLocation}
            onSelectStop={(stop) => setSelectedStop(stop)}
          />
        )}

        {activeTab === "halte" && (
          <HalteView
            userLocation={userLocation}
            onSelectStop={(stop) => setSelectedStop(stop)}
            onSelectRoute={(routeId) => {
              setSelectedRouteId(routeId);
              setIsRouteModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Stop Detail Drawer / Modal */}
      {selectedStop && (
        <StopDetailModal
          stop={selectedStop}
          onClose={() => setSelectedStop(null)}
          onSelectRoute={(rId) => {
            setSelectedRouteId(rId);
            setIsRouteModalOpen(true);
          }}
          onSetOrigin={(s) => {
            setJourneyOrigin(s);
            setActiveTab("rute");
          }}
          onSetDestination={(s) => {
            setJourneyDestination(s);
            setActiveTab("rute");
          }}
        />
      )}

      {/* Route Detail Drawer / Modal */}
      {isRouteModalOpen && (
        <RouteDetailModal
          routeId={selectedRouteId}
          onClose={() => setIsRouteModalOpen(false)}
          onSelectStop={(s) => setSelectedStop(s)}
          onTrackRoute={(rId) => {
            setSelectedRouteId(rId);
            setActiveTab("lacak");
          }}
        />
      )}

      {/* Global Instant Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectRoute={(rId) => {
          setSelectedRouteId(rId);
          setIsRouteModalOpen(true);
        }}
        onSelectStop={(s) => setSelectedStop(s)}
      />
    </div>
  );
}
