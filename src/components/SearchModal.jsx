import React, { useState, useEffect } from "react";
import { Search, X, Bus, Compass, Clock, ArrowRight } from "lucide-react";
import { searchTransportation } from "../services/api";

export default function SearchModal({
  isOpen = false,
  onClose = null,
  onSelectRoute = null,
  onSelectStop = null
}) {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("halte_recent_searches");
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (e) {}
  }, [isOpen]);

  const saveRecent = (term) => {
    if (!term || !term.trim()) return;
    const clean = term.trim();
    const updated = [clean, ...recentSearches.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem("halte_recent_searches", JSON.stringify(updated));
    } catch (e) {}
  };

  const results = query.trim() ? searchTransportation(query) : { routes: [], stops: [] };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Search Header Input */}
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          <Search className="size-4 text-zinc-400 shrink-0 ml-1" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                saveRecent(query.trim());
              }
            }}
            placeholder="Cari rute, halte, operator, atau moda..."
            className="flex-1 bg-transparent py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="size-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-600"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline font-mono text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-200">ESC</kbd>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-800 font-medium ml-1"
          >
            Batal
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex flex-col gap-4">
          {/* If no query, show Recent searches and Popular searches */}
          {!query.trim() ? (
            <>
              {recentSearches.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-mono uppercase text-[10px] tracking-wider">Pencarian Terakhir</span>
                    <button
                      onClick={() => {
                        setRecentSearches([]);
                        localStorage.removeItem("halte_recent_searches");
                      }}
                      className="text-[10px] hover:text-zinc-600"
                    >
                      Hapus
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(term)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-xs text-zinc-700 flex items-center gap-1.5 transition-colors"
                      >
                        <Clock className="size-3 text-zinc-400" />
                        <span>{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular recommendations */}
              <div className="flex flex-col gap-2">
                <span className="font-mono uppercase text-[10px] tracking-wider text-zinc-400">Pencarian Populer</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {["Koridor 1", "Halte Monas", "Blok M", "Harmoni", "Bundaran HI", "JAK.79", "Koridor 13", "Stasiun Manggarai"].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(item)}
                      className="px-3 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-left text-zinc-700 font-medium transition-colors border border-zinc-100"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Matching Routes */}
              {results.routes.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="font-mono uppercase text-[10px] tracking-wider text-zinc-400">
                    Jalur / Rute ({results.routes.length})
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {results.routes.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => {
                          saveRecent(r.code);
                          if (onSelectRoute) onSelectRoute(r.id);
                          if (onClose) onClose();
                        }}
                        className="flex items-center justify-between p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 rounded-xl cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-mono font-bold text-white shadow-2xs"
                            style={{ backgroundColor: r.color || "#0070BA" }}
                          >
                            {r.code}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-zinc-900 truncate">
                              {r.name}
                            </span>
                            <span className="text-[10px] text-zinc-400">{r.modeLabel}</span>
                          </div>
                        </div>
                        <ArrowRight className="size-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Stops */}
              {results.stops.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="font-mono uppercase text-[10px] tracking-wider text-zinc-400">
                    Halte / Titik Pemberhentian ({results.stops.length})
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {results.stops.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          saveRecent(s.name);
                          if (onSelectStop) onSelectStop(s);
                          if (onClose) onClose();
                        }}
                        className="flex items-center justify-between p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 rounded-xl cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-6 rounded-md bg-zinc-200 text-zinc-600 flex items-center justify-center shrink-0">
                            <Bus className="size-3" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-zinc-900 truncate">
                              {s.name}
                            </span>
                            <span className="text-[10px] text-zinc-400 uppercase font-mono">
                              {s.operator || "Transjakarta"} · {s.modeLabel || (s.isBRT ? "Halte BRT" : "Bus stop")}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="size-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {results.routes.length === 0 && results.stops.length === 0 && (
                <div className="p-8 text-center text-xs text-zinc-500">
                  Tidak ada rute atau halte yang sesuai dengan "{query}".
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
