import React from "react";
import { Home, Compass, MapPin, Navigation as NavIcon, Bus, Search, Crosshair } from "lucide-react";

export const TABS = [
  { id: "beranda", label: "Beranda", icon: Home },
  { id: "jalur", label: "Jalur", icon: Compass },
  { id: "lacak", label: "Lacak", icon: NavIcon },
  { id: "rute", label: "Rute", icon: MapPin },
  { id: "halte", label: "Halte", icon: Bus }
];

export function TopNav({ activeTab, onSearchOpen, onLocateMe, isLocating }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-zinc-200/80">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-zinc-950 flex items-center justify-center shadow-xs">
            <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
              <circle cx="28" cy="28" r="8" fill="#D62126"/>
              <circle cx="72" cy="72" r="8" fill="#0070BA"/>
              <path d="M28 28V72M72 28V72M28 50H72" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-bold tracking-tight text-zinc-900">HALTE</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 font-medium">JABODETABEK</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Geolocation trigger */}
          <button
            onClick={onLocateMe}
            title="Cari halte di sekitar posisi saya"
            className="flex items-center justify-center size-9 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <Crosshair className={`size-4.5 ${isLocating ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {/* Quick search button */}
          <button
            onClick={onSearchOpen}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-zinc-500 bg-zinc-100/80 hover:bg-zinc-200/80 rounded-md transition-colors font-medium border border-zinc-200/50"
          >
            <Search className="size-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Cari rute atau halte...</span>
            <span className="sm:hidden">Cari</span>
            <kbd className="hidden sm:inline font-mono text-[9px] bg-white px-1 py-0.5 rounded border border-zinc-200 text-zinc-400">⌘K</kbd>
          </button>
        </div>
      </div>
    </header>
  );
}

export function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/80 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-14 max-w-xl items-center justify-around px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all relative ${
                isActive ? "text-zinc-950 font-medium" : "text-zinc-600 hover:text-zinc-800"
              }`}
            >
              <div className="relative">
                <Icon className={`size-5 transition-transform ${isActive ? "scale-105 stroke-[2.3]" : "stroke-[1.7]"}`} />
                {tab.id === "lacak" && (
                  <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
              <span className="text-[11px] font-sans mt-0.5 tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-zinc-900 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
