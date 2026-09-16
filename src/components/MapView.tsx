"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Building } from "@/lib/buildings";

type Spot = { lat: number; lng: number };
type SearchResult = { label: string; lat: number; lng: number };

type Props = {
  spot?: Spot;
  buildings: Building[];
  highlightedBlockerId?: string;
  onSpotChange: (spot: Spot) => void;
};

const DEMO_CENTER = { lat: 40.742, lng: -73.9897 };

export default function MapView({
  spot,
  buildings,
  highlightedBlockerId,
  onSpotChange,
}: Props) {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeResult, setActiveResult] = useState(0);

  useEffect(() => {
    let disposed = false;
    async function initialize() {
      if (!mapNode.current || mapRef.current) return;
      const maplibregl = await import("maplibre-gl");
      if (disposed || !mapNode.current) return;
      const map = new maplibregl.Map({
        container: mapNode.current,
        center: [DEMO_CENTER.lng, DEMO_CENTER.lat],
        zoom: 15,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
      });
      map.on("load", () => {
        map.addSource("buildings", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "building-fills",
          type: "fill",
          source: "buildings",
          paint: {
            "fill-color": [
              "step",
              ["get", "height"],
              "#b8c8d8",
              12,
              "#8198ad",
              25,
              "#536b82",
            ],
            "fill-opacity": 0.68,
            "fill-outline-color": "#395267",
          },
        });
        map.addSource("highlighted-building", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "highlighted-building-fill",
          type: "fill",
          source: "highlighted-building",
          paint: {
            "fill-color": "#f97316",
            "fill-opacity": 0.78,
            "fill-outline-color": "#9a3412",
          },
        });
        map.on("click", (event) => {
          if (!event.originalEvent?.isTrusted) return;
          onSpotChange({ lat: event.lngLat.lat, lng: event.lngLat.lng });
        });
      });
      mapRef.current = map;
    }
    void initialize();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onSpotChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const source = map.getSource("buildings") as import("maplibre-gl").GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: buildings.map((building) => ({
          type: "Feature",
          id: building.id,
          properties: { height: building.height, name: building.name ?? "" },
          geometry: { type: "Polygon", coordinates: [building.footprint] },
        })),
      });
    }
    const highlighted = buildings.find((building) => building.id === highlightedBlockerId);
    const highlightSource = map.getSource("highlighted-building") as import("maplibre-gl").GeoJSONSource | undefined;
    if (highlightSource) {
      highlightSource.setData({
        type: "FeatureCollection",
        features: highlighted
          ? [{
              type: "Feature",
              properties: { height: highlighted.height },
              geometry: { type: "Polygon", coordinates: [highlighted.footprint] },
            }]
          : [],
      });
    }
  }, [buildings, highlightedBlockerId]);

  useEffect(() => {
    if (!spot || !mapRef.current) return;
    const map = mapRef.current;
    map.flyTo({ center: [spot.lng, spot.lat], zoom: Math.max(map.getZoom(), 15), duration: 500 });
    if (markerRef.current) markerRef.current.setLngLat([spot.lng, spot.lat]);
    else {
      import("maplibre-gl").then((maplibregl) => {
        if (!mapRef.current) return;
        markerRef.current = new maplibregl.Marker({ color: "#f97316" })
          .setLngLat([spot.lng, spot.lat])
          .addTo(mapRef.current);
      });
    }
  }, [spot]);

  async function searchPlaces() {
    if (search.trim().length < 3) return;
    setSearching(true);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(search.trim())}`);
      const nextResults = response.ok ? ((await response.json()) as SearchResult[]) : [];
      setResults(nextResults);
      setActiveResult(0);
    } finally {
      setSearching(false);
    }
  }

  function chooseResult(result: SearchResult) {
    onSpotChange({ lat: result.lat, lng: result.lng });
    setSearch(result.label);
    setResults([]);
  }

  return (
    <section className="relative h-full min-h-[360px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
      <div ref={mapNode} className="absolute inset-0" aria-label="Map for choosing a curbside spot" />
      <div className="absolute left-4 right-4 top-4 z-10 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <div className="flex rounded-xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveResult((index) => Math.min(index + 1, results.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveResult((index) => Math.max(index - 1, 0));
                } else if (event.key === "Enter" && results[activeResult]) {
                  event.preventDefault();
                  chooseResult(results[activeResult]);
                } else if (event.key === "Enter") {
                  void searchPlaces();
                } else if (event.key === "Escape") {
                  setResults([]);
                }
              }}
              placeholder="Search an address"
              className="min-w-0 flex-1 rounded-l-xl bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500"
              aria-label="Search an address"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="address-results"
              aria-activedescendant={results[activeResult] ? `address-result-${activeResult}` : undefined}
            />
            <button type="button" onClick={() => void searchPlaces()} className="rounded-r-xl px-3 text-sm font-bold text-orange-600 hover:bg-orange-50" aria-label="Search">
              {searching ? "…" : "Go"}
            </button>
          </div>
          {results.length > 0 && (
            <ul id="address-results" role="listbox" className="absolute left-0 right-0 top-12 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {results.map((result, index) => (
                <li key={`${result.lat}-${result.lng}`} id={`address-result-${index}`} role="option" aria-selected={index === activeResult}>
                  <button type="button" onClick={() => chooseResult(result)} className={`w-full px-3 py-2 text-left text-xs hover:bg-orange-50 ${index === activeResult ? "bg-orange-50" : ""}`}>
                    {result.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" onClick={() => navigator.geolocation?.getCurrentPosition((position) => onSpotChange({ lat: position.coords.latitude, lng: position.coords.longitude }))} className="shrink-0 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-sm font-semibold text-slate-700 shadow-lg backdrop-blur hover:bg-white">
          <span className="hidden sm:inline">◎ </span>My location
        </button>
      </div>
      <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg backdrop-blur">
        <div className="mb-1 font-bold text-slate-900">Map legend</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#b8c8d8]" /> Under 12 m</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#8198ad]" /> 12–25 m</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#536b82]" /> Over 25 m</div>
        <div className="mt-1 flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-orange-500" /> Current shade blocker</div>
      </div>
    </section>
  );
}
