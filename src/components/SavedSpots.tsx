"use client";

import { useState } from "react";
import { deleteSpot, getSavedSpots, saveSpot, SavedSpot } from "@/lib/storage";
import { fmtHour } from "@/lib/time";

type Props = {
  spot?: { lat: number; lng: number };
  date: string;
  shadedFractionPerHour: { hour: number; fraction: number }[];
  onOpen: (spot: { lat: number; lng: number }) => void;
};

export default function SavedSpots({ spot, date, shadedFractionPerHour, onOpen }: Props) {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<SavedSpot[]>(getSavedSpots);

  function addSpot() {
    if (!spot || !name.trim()) return;
    setSaved(saveSpot({
      id: `${spot.lat.toFixed(5)},${spot.lng.toFixed(5)}`,
      name: name.trim(),
      lat: spot.lat,
      lng: spot.lng,
      savedAt: new Date().toISOString(),
      snapshot: { date, shadedFractionPerHour },
    }));
    setName("");
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Keep your route</p><h2 className="mt-1 text-xl font-bold text-slate-950">Saved spots</h2></div>
        <div className="flex w-full gap-2 sm:w-auto">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name this spot" disabled={!spot} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:bg-slate-100 sm:w-40" />
          <button type="button" onClick={addSpot} disabled={!spot || !name.trim()} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">Save</button>
        </div>
      </div>
      {saved.length === 0 ? <p className="mt-4 text-sm text-slate-500">No saved spots yet. Pick a location and save it for your next route.</p> : (
        <ul className="mt-4 divide-y divide-slate-100">
          {saved.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-1">
              <div className="min-w-0 flex-1"><p className="truncate font-semibold text-slate-900">{item.name}</p><p className="text-xs text-slate-500">{item.lat.toFixed(4)}, {item.lng.toFixed(4)}</p></div>
              <div className="flex h-5 w-20 items-end gap-px" aria-label="Saved shade snapshot">{(item.snapshot?.shadedFractionPerHour ?? []).map((hour) => <i key={hour.hour} title={`${fmtHour(hour.hour)}: ${Math.round(hour.fraction * 100)}% shade`} className="min-w-1 flex-1 rounded-t bg-sky-400" style={{ height: `${Math.max(15, hour.fraction * 100)}%` }} />)}</div>
              <button type="button" onClick={() => onOpen({ lat: item.lat, lng: item.lng })} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-orange-400 hover:text-orange-700">Open</button>
              <button type="button" onClick={() => setSaved(deleteSpot(item.id))} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-700">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
