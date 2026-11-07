import React from "react";
import { Bus, MapPin, Trash2 } from "lucide-react";

export default function FavoritesView({ items = [], onRemove, onSelectRoute, onSelectStop }) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-28 pt-6 sm:px-6">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Favorit</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Tempat yang sering Anda gunakan</h1></div>
      {items.length === 0 ? <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-zinc-200/70 dark:bg-zinc-900 dark:ring-white/10"><MapPin className="mx-auto size-8 text-zinc-300" /><p className="mt-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">Belum ada favorit</p><p className="mt-1 text-xs text-zinc-500">Simpan halte, lokasi fisik, atau rute untuk akses cepat.</p></div> : <div className="grid gap-2">{items.map((item) => <div key={item.key || `${item.kind}:${item.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200/70 dark:bg-zinc-900 dark:ring-white/10"><div className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{item.kind === "route" ? <Bus className="size-4" /> : <MapPin className="size-4" />}</div><button className="min-w-0 flex-1 text-left" onClick={() => item.kind === "route" ? onSelectRoute?.(item.id) : onSelectStop?.(item.value)}><p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</p><p className="text-[11px] uppercase text-zinc-500">{item.kind === "route" ? "Rute" : "Lokasi halte"}</p></button><button onClick={() => onRemove(item)} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button></div>)}</div>}
    </section>
  );
}