"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import SavedSpots from "@/components/SavedSpots";
import ShadeTimeline from "@/components/ShadeTimeline";
import { Building } from "@/lib/buildings";
import { DEMO_SPOT, SAMPLE_BUILDINGS } from "@/lib/sampleData";
import { computeShade, isInsideBuilding, ShadeSample, ShadeSummary, summarize } from "@/lib/shade";
import { getSunSamples } from "@/lib/sun";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type Spot = { lat: number; lng: number };
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function Home() {
  const [spot, setSpot] = useState<Spot>();
  const [date, setDate] = useState(today);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const samples = useMemo<ShadeSample[]>(() => {
    if (!spot) return [];
    return computeShade(spot, buildings, getSunSamples(new Date(`${date}T12:00:00`), spot.lat, spot.lng));
  }, [spot, date, buildings]);
  const summary = useMemo<ShadeSummary>(() => summarize(samples), [samples]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [usingSample, setUsingSample] = useState(false);
  const [highlightedBlockerId, setHighlightedBlockerId] = useState<string>();
  const [initializing, setInitializing] = useState(true);

  const selectSpot = useCallback((nextSpot: Spot) => {
    setSpot(nextSpot);
    setUsingSample(false);
    setStatus("idle");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const latParam = params.get("lat");
    const lngParam = params.get("lng");
    const lat = Number(latParam);
    const lng = Number(lngParam);
    queueMicrotask(() => {
      if (latParam && lngParam && Number.isFinite(lat) && Number.isFinite(lng)) setSpot({ lat, lng });
      if (params.get("date")) setDate(params.get("date")!);
      setInitializing(false);
    });
  }, []);

  useEffect(() => {
    if (initializing) return;
    const url = new URL(window.location.href);
    if (spot) {
      url.searchParams.set("lat", spot.lat.toFixed(5));
      url.searchParams.set("lng", spot.lng.toFixed(5));
    } else {
      url.searchParams.delete("lat");
      url.searchParams.delete("lng");
    }
    url.searchParams.set("date", date);
    window.history.replaceState({}, "", url);
  }, [spot, date, initializing]);

  useEffect(() => {
    if (!spot || initializing || usingSample) return;
    let cancelled = false;
    fetch(`/api/buildings?lat=${spot.lat}&lng=${spot.lng}&radius=250`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error ?? "Building data unavailable");
        return response.json() as Promise<{ buildings: Building[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setBuildings(data.buildings);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setBuildings([]);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [spot, initializing, usingSample]);

  function useDemo() {
    setSpot(DEMO_SPOT);
    setBuildings(SAMPLE_BUILDINGS);
    setUsingSample(true);
    setStatus("ready");
  }

  function useSamples() {
    if (!spot) return;
    setBuildings(SAMPLE_BUILDINGS);
    setUsingSample(true);
    setStatus("ready");
  }

  const insideBuilding = Boolean(spot && buildings.length && isInsideBuilding(spot, buildings));
  const loading = Boolean(spot && !usingSample && status !== "ready" && status !== "error");
  const daylightMinutes = useMemo(() => {
    if (samples.length < 2) return 0;
    return Math.round((samples.at(-1)!.time.getTime() - samples[0].time.getTime()) / 60_000);
  }, [samples]);

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-slate-950">
      <header className="border-b border-slate-200/80 bg-[#fffdf9]">
        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-xl shadow-sm">🍦</span><span className="text-xs font-black uppercase tracking-[0.22em] text-orange-700">Curbside tools</span></div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Curbside Shade Mapper</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 sm:text-base">Find the cooler corner for your ice cream cart, hour by hour.</p>
            </div>
            <p className="max-w-xs text-right text-xs font-semibold leading-relaxed text-slate-500">Buildings only — trees aren&apos;t included yet.</p>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] lg:px-8">
        <div className="h-[45vh] min-h-[390px] lg:sticky lg:top-5 lg:h-[calc(100vh-40px)]">
          <MapView spot={spot} buildings={buildings} highlightedBlockerId={highlightedBlockerId} onSpotChange={selectSpot} />
        </div>
        <div className="space-y-5">
          {!spot && (
            <section className="rounded-3xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-700">Pick a place to begin</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Where should your cart catch a breeze?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">Tap the map or search an address. We&apos;ll compare the sun path with nearby building footprints and show the best shady hours.</p>
              <button type="button" onClick={useDemo} className="mt-5 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500">Try a demo spot</button>
            </section>
          )}
          {loading && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-700">Checking nearby building footprints…</p><div className="mt-4 h-12 animate-pulse rounded-xl bg-slate-100" /></section>}
          {spot && status === "error" && <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm"><p className="font-bold text-amber-950">Live building data unavailable.</p><p className="mt-1 text-sm text-amber-900">You can retry, or explore this spot with our clearly-labelled sample buildings.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => { setUsingSample(false); setStatus("idle"); }} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-950">Retry</button><button type="button" onClick={useSamples} className="rounded-lg bg-amber-800 px-3 py-2 text-sm font-bold text-white">Use sample buildings</button></div></section>}
          {spot && usingSample && <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900">Live building data unavailable — showing sample buildings.</div>}
          {spot && status === "ready" && buildings.length === 0 && <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">No buildings within 250 m in OpenStreetMap — this spot is in full sun all day (trees not counted).</div>}
          {insideBuilding && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">This point is inside a building — tap the street instead.</div>}
          {spot && samples.length > 0 && <ShadeTimeline samples={samples} summary={summary} date={date} onDateChange={setDate} onHighlight={setHighlightedBlockerId} />}
          {spot && status === "ready" && samples.length > 0 && <p className="px-1 text-xs text-slate-500">Timeline covers {Math.floor(daylightMinutes / 60)}h {daylightMinutes % 60}m of daylight. Calculations use building footprints and estimated heights; terrain and trees are not counted.</p>}
          <SavedSpots spot={spot} date={date} shadedFractionPerHour={summary.shadedFractionPerHour} onOpen={selectSpot} />
        </div>
      </div>
      <footer className="mx-auto max-w-[1500px] px-4 pb-8 text-xs text-slate-500 sm:px-6 lg:px-8">OpenStreetMap building data · Sun position calculated in your browser · Built for mobile vendors</footer>
    </main>
  );
}
