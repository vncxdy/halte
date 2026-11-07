import React, { useEffect, useState } from "react";
import { X, MapPin, Bus, Accessibility, Navigation, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import { formatDistance } from "../services/geo";
import MapView from "./MapView";

export default function StopDetailModal({
  stop = null,
  onClose = null,
  onSelectRoute = null,
  onSetOrigin = null,
  onSetDestination = null,
  onTrackHere = null,
  isFavorite = false,
  onToggleFavorite = null
}) {
  const [selectedVariantId, setSelectedVariantId] = useState(() => stop?.variants?.[0]?.id || stop?.id || null);
  const variants = stop?.variants || (stop ? [stop] : []);
  useEffect(() => {
    setSelectedVariantId(variants[0]?.id || null);
  }, [stop?.id]);

  if (!stop) return null;

  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || variants[0];
  const isRail = selectedVariant.mode === "mrt" || selectedVariant.mode === "lrt" || selectedVariant.mode === "krl";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl border border-zinc-200">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-5 py-4 border-b border-zinc-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: isRail ? "#003882" : (stop.isBRT ? "#D62126" : "#71717a") }} />
            <span className="text-xs font-mono font-semibold uppercase text-zinc-500">
              {isRail ? selectedVariant.mode.toUpperCase() : (selectedVariant.isBRT ? "Halte BRT Transjakarta" : "Plang Bus Stop")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-5">
          {/* Title & Distance */}
          <div>
            <h3 className="text-xl font-bold text-zinc-900 tracking-tight leading-tight">
              {stop.name}
            </h3>
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(selectedVariant)}
                className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${isFavorite ? "bg-red-50 text-red-700" : "bg-zinc-100 text-zinc-600"}`}
              >
                {isFavorite ? "Tersimpan di favorit" : "Simpan favorit"}
              </button>
            )}
            <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
              <span className="font-mono text-zinc-600 font-medium">ID: {selectedVariant.id}</span>
              {selectedVariant.code && <span className="font-mono text-zinc-600 font-medium">Kode: {selectedVariant.code}</span>}
              {stop.distance != null && (
                <>
                  <span>•</span>
                  <span className="font-mono text-zinc-700 font-semibold">{formatDistance(stop.distance)} dari posisi Anda</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (onSetOrigin) onSetOrigin(selectedVariant);
                if (onClose) onClose();
              }}
              className="px-3 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-800 flex items-center justify-center gap-1.5 transition-colors"
            >
              <MapPin className="size-3.5 text-emerald-600" />
              <span>Dari Sini (Asal)</span>
            </button>
            <button
              onClick={() => {
                if (onSetDestination) onSetDestination(selectedVariant);
                if (onClose) onClose();
              }}
              className="px-3 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-800 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Navigation className="size-3.5 text-red-600" />
              <span>Ke Sini (Tujuan)</span>
            </button>
          </div>

          {variants.length > 1 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">VARIAN STOP ({variants.length})</h4>
                <span className="text-[10px] text-zinc-400">Pilih titik spesifik</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-left transition-colors ${selectedVariant.id === variant.id ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:bg-zinc-50"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-zinc-900">{variant.name}</span>
                      <span className="block font-mono text-[10px] text-zinc-500">{variant.id} · {variant.lat.toFixed(5)}, {variant.lon.toFixed(5)}</span>
                    </span>
                    <span className="ml-2 text-[10px] text-zinc-500">{variant.routes?.length || 0} rute</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="h-40 overflow-hidden rounded-xl border border-zinc-200">
            <MapView
              center={[selectedVariant.lat, selectedVariant.lon]}
              zoom={16}
              stops={variants}
              className="h-full w-full"
              onStopClick={(variant) => setSelectedVariantId(variant.id)}
            />
          </div>

          {/* Serving Routes */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">
                Rute yang Melayani ({stop.routes?.length || 0})
              </h4>
              <span className="text-[11px] font-mono text-zinc-400">Klik rute</span>
            </div>

          {(!selectedVariant.routes || selectedVariant.routes.length === 0) ? (
              <p className="text-xs text-zinc-500 italic p-3 bg-zinc-50 rounded-xl">
                Tidak ada rute langsung yang terdata untuk plang halte ini.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-1.5">
                {selectedVariant.routes.map((r) => (
                  <div
                    key={r.id || r.code}
                    onClick={() => {
                      if (onSelectRoute) onSelectRoute(r.id);
                      if (onClose) onClose();
                    }}
                    className="flex items-center justify-between p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/60 rounded-xl cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-mono font-bold text-white shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                        style={{ backgroundColor: r.color || "#0070BA" }}
                      >
                        {r.code}
                      </span>
                      <span className="text-xs font-semibold text-zinc-800 truncate">
                        {r.name}
                      </span>
                    </div>
                    <ArrowRight className="size-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Facilities */}
          {selectedVariant.facilities && selectedVariant.facilities.length > 0 && (
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">
                Fasilitas Halte
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedVariant.facilities.map((f, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-medium capitalize"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Location Coordinates */}
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>Koordinat GPS: {selectedVariant.lat?.toFixed(5)}, {selectedVariant.lon?.toFixed(5)}</span>
            <span>Sumber: {selectedVariant.source || "Transjakarta GTFS"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
