"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Building } from "@/lib/buildings";
import type { Feature, FeatureCollection, Polygon } from "geojson";

type Spot = { lat: number; lng: number };
type SearchResult = { label: string; lat: number; lng: number };

type Props = {
  spot?: Spot;
  buildings: Building[];
  highlightedBlockerId?: string;
  onSpotChange: (spot: Spot) => void;
};

const DEMO_CENTER = { lat: 40.742, lng: -73.9897 };

const buildingStyle = (height: number) => ({
  color: height > 25 ? "#395267" : height >= 12 ? "#526b82" : "#8198ad",
  weight: 1,
  fillColor: height > 25 ? "#536b82" : height >= 12 ? "#8198ad" : "#b8c8d8",
  fillOpacity: 0.68,
});

export default function MapView({
  spot,
  buildings,
  highlightedBlockerId,
  onSpotChange,
}: Props) {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const buildingLayerRef = useRef<import("leaflet").GeoJSON | null>(null);
  const highlightLayerRef = useRef<import("leaflet").GeoJSON | null>(null);
  const spotRef = useRef(spot);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeResult, setActiveResult] = useState(0);
  const [mapMessage, setMapMessage] = useState<string>();

  function syncMarker(
    L: typeof import("leaflet"),
    map: import("leaflet").Map,
    nextSpot: Spot,
  ) {
    map.flyTo([nextSpot.lat, nextSpot.lng], Math.max(map.getZoom(), 15), { duration: 0.5 });
    if (markerRef.current) {
      markerRef.current.setLatLng([nextSpot.lat, nextSpot.lng]);
      return;
    }
    const icon = L.divIcon({
      className: "",
      html: '<div style="width:18px;height:18px;border:3px solid white;border-radius:9999px;background:#f97316;box-shadow:0 1px 4px rgba(15,23,42,.45)"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    markerRef.current = L.marker([nextSpot.lat, nextSpot.lng], { icon }).addTo(map);
  }

  useEffect(() => {
    spotRef.current = spot;
  }, [spot]);

  useEffect(() => {
    let disposed = false;

    async function initialize() {
      if (!mapNode.current || mapRef.current) return;
      try {
        const L = await import("leaflet");
        if (disposed || !mapNode.current) return;

        const map = L.map(mapNode.current, {
          center: [DEMO_CENTER.lat, DEMO_CENTER.lng],
          zoom: 15,
          zoomControl: false,
        });
        L.control.zoom({ position: "bottomright" }).addTo(map);
        const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        let tileErrors = 0;
        let tileLoaded = false;
        tiles.on("tileload", () => {
          tileLoaded = true;
        });
        tiles.on("tileerror", () => {
          tileErrors += 1;
          if (!tileLoaded && tileErrors >= 3) {
            setMapMessage("Map tiles couldn't load — you can still search an address or use your location.");
          }
        });

        const buildingLayer = L.geoJSON(undefined, {
          style: (feature) => buildingStyle(Number(feature?.properties?.height ?? 0)),
        }).addTo(map);
        const highlightLayer = L.geoJSON(undefined, {
          style: {
            color: "#9a3412",
            weight: 1,
            fillColor: "#f97316",
            fillOpacity: 0.78,
          },
        }).addTo(map);

        map.on("click", (event) => {
          onSpotChange({ lat: event.latlng.lat, lng: event.latlng.lng });
        });
        mapRef.current = map;
        leafletRef.current = L;
        buildingLayerRef.current = buildingLayer;
        highlightLayerRef.current = highlightLayer;
        if (spotRef.current) {
          syncMarker(L, map, spotRef.current);
        }
        requestAnimationFrame(() => map.invalidateSize());
      } catch {
        setMapMessage("The map couldn't start in this browser — you can still search an address or use your location.");
      }
    }

    void initialize();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markerRef.current = null;
      buildingLayerRef.current = null;
      highlightLayerRef.current = null;
    };
  }, [onSpotChange]);

  useEffect(() => {
    const layer = buildingLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const featureCollection: FeatureCollection<Polygon> = {
      type: "FeatureCollection",
      features: buildings.map((building) => ({
        type: "Feature",
        id: building.id,
        properties: { height: building.height, name: building.name ?? "" },
        geometry: { type: "Polygon", coordinates: [building.footprint] },
      })),
    };
    layer.addData(featureCollection);
  }, [buildings]);

  useEffect(() => {
    const layer = highlightLayerRef.current;
    if (!layer) return;
    const highlighted = buildings.find((building) => building.id === highlightedBlockerId);
    layer.clearLayers();
    if (highlighted) {
      const feature: Feature<Polygon> = {
        type: "Feature",
        properties: { height: highlighted.height },
        geometry: { type: "Polygon", coordinates: [highlighted.footprint] },
      };
      layer.addData(feature);
    }
  }, [buildings, highlightedBlockerId]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !spot) return;
    syncMarker(L, map, spot);
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
      {mapMessage && <div className="absolute left-4 right-4 bottom-4 z-[1100] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 shadow-lg">{mapMessage}</div>}
      <div className="absolute left-4 right-4 top-4 z-[1100] flex gap-2">
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
                  event.preventDefault();
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
      <div className="absolute bottom-4 left-4 z-[1100] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg backdrop-blur">
        <div className="mb-1 font-bold text-slate-900">Map legend</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#b8c8d8]" /> Under 12 m</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#8198ad]" /> 12–25 m</div>
        <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-[#536b82]" /> Over 25 m</div>
        <div className="mt-1 flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-orange-500" /> Current shade blocker</div>
      </div>
    </section>
  );
}
