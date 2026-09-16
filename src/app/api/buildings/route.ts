import { NextResponse } from "next/server";
import { parseOverpass } from "@/lib/buildings";

const USER_AGENT =
  "curbside-shade-mapper (github.com/mattbergland/curbside-shade-mapper)";

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

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "text/plain", "User-Agent": USER_AGENT },
      body: query,
    });
    if (!response.ok) {
      throw new Error(`Overpass returned ${response.status}`);
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch building data" },
      { status: 502 },
    );
  }
}
