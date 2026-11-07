import React from "react";
import { Bus, X } from "lucide-react";
import { getVehicleStatus } from "../services/vehicleStatus";

export default function VehicleSheet({ vehicle, onClose }) {
  if (!vehicle) return null;
  const status = getVehicleStatus({ mode: vehicle.dataSource });
  const updated = vehicle.lastUpdate ? new Date(vehicle.lastUpdate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";
  return (
    <div className="fixed inset-x-3 bottom-20 z-[55] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-80">
      <section className="rounded-3xl bg-white/95 p-4 shadow-2xl ring-1 ring-black/10 backdrop-blur-xl dark:bg-zinc-900/95 dark:ring-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5"><div className="flex size-9 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50"><Bus className="size-4" /></div><div><p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{vehicle.busBodyNo || vehicle.id}</p><p className="text-[11px] text-zinc-500">{vehicle.routeCode || "Rute tidak tersedia"} · {status.label}</p></div></div>
          <button onClick={onClose} className="rounded-full bg-zinc-100 p-1.5 text-zinc-500 dark:bg-zinc-800"><X className="size-3.5" /></button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-800"><span className="block text-[10px] uppercase text-zinc-500">Kecepatan</span><strong>{vehicle.speed != null ? `${vehicle.speed} km/jam` : "Tidak tersedia"}</strong></div><div className="rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-800"><span className="block text-[10px] uppercase text-zinc-500">Diperbarui</span><strong>{updated}</strong></div></div>
        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">{status.detail}. Sumber: {vehicle.dataSource || "Tidak tersedia"}.</p>
        {vehicle.nextStop && <p className="mt-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">Berikutnya: {vehicle.nextStop}</p>}
      </section>
    </div>
  );
}