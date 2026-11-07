import React from "react";
import { Map, MapPin, Bus, Search, Crosshair, UserRound, Heart } from "lucide-react";

export const TABS = [
  { id: "peta", label: "Peta", icon: Map },
  { id: "rute", label: "Rute", icon: MapPin },
  { id: "favorit", label: "Favorit", icon: Heart },
  { id: "halte", label: "Halte", icon: Bus }
];

export function TopNav({ onSearchOpen, onLocateMe, isLocating, onProfile }) {
  return (
    <header className="absolute left-0 right-0 top-0 z-40 w-full pointer-events-none">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 pt-3 sm:px-6 sm:pt-5">
        {/* Brand */}
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-white/90 px-3 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur-xl dark:bg-zinc-900/90 dark:ring-white/10">
          <div className="size-7 rounded-lg bg-zinc-950 flex items-center justify-center shadow-xs">
            <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
              <circle cx="28" cy="28" r="8" fill="#D62126"/>
              <circle cx="72" cy="72" r="8" fill="#0070BA"/>
              <path d="M28 28V72M72 28V72M28 50H72" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">HALTE</span>
              <span className="hidden text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 font-medium dark:bg-zinc-800 dark:text-zinc-300 sm:inline">JABODETABEK</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Geolocation trigger */}
          <button
            onClick={onLocateMe}
            title="Cari halte di sekitar posisi saya"
            className="flex items-center justify-center size-10 rounded-xl bg-white/90 text-zinc-600 shadow-lg ring-1 ring-black/5 backdrop-blur-xl hover:text-zinc-900 hover:bg-white transition-colors dark:bg-zinc-900/90 dark:text-zinc-300 dark:ring-white/10"
          >
            <Crosshair className={`size-4.5 ${isLocating ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {/* Quick search button */}
          <button
            onClick={onSearchOpen}
            className="flex h-10 items-center gap-2 rounded-xl bg-white/90 px-3 text-xs text-zinc-500 shadow-lg ring-1 ring-black/5 backdrop-blur-xl hover:bg-white transition-colors font-medium dark:bg-zinc-900/90 dark:text-zinc-300 dark:ring-white/10 sm:min-w-64"
          >
            <Search className="size-3.5 text-zinc-400" />
            <span>Cari rute atau halte...</span>
            <kbd className="hidden sm:inline font-mono text-[9px] bg-white px-1 py-0.5 rounded border border-zinc-200 text-zinc-400">⌘K</kbd>
          </button>
          <button onClick={onProfile} title="Profil dan pengaturan" className="flex size-10 items-center justify-center rounded-xl bg-white/90 text-zinc-600 shadow-lg ring-1 ring-black/5 backdrop-blur-xl hover:text-zinc-900 dark:bg-zinc-900/90 dark:text-zinc-300 dark:ring-white/10"><UserRound className="size-4" /></button>
        </div>
      </div>
    </header>
  );
}

export function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200/70 bg-white/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] dark:border-white/10 dark:bg-zinc-950/90">
      <div className="mx-auto flex h-16 max-w-xl items-center justify-around px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all relative ${
                isActive ? "text-zinc-950 font-medium dark:text-white" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
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
                <span className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-red-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
