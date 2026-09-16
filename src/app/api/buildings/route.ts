import { NextResponse } from "next/server";
import { parseOverpass } from "@/lib/buildings";

const USER_AGENT =
  "curbside-shade-mapper (github.com/mattbergland/curbside-shade-mapper)";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const radius = Math.min(
    1000,
    Math.max(50, Number(url.searchParams.get("radius") ?? 250)),
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const roundedLat = Number(lat.toFixed(4));
  const roundedLng = Number(lng.toFixed(4));
  const query = `[out:json][timeout:25];way["building"](around:${radius},${roundedLat},${roundedLng});out geom;`;

  let lastError = "Unable to fetch building data";
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain", "User-Agent": USER_AGENT },
        body: query,
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        lastError = `Overpass returned ${response.status}`;
        continue;
      }
      const data = parseOverpass(await response.json());
      return NextResponse.json(
        { buildings: data, source: "osm", fetchedAt: new Date().toISOString() },
        {
          headers: {
            "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
          },
        },
      );
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  return NextResponse.json({ error: lastError }, { status: 502 });
}
