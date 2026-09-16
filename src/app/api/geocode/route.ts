import { NextResponse } from "next/server";

const USER_AGENT =
  "curbside-shade-mapper (github.com/mattbergland/curbside-shade-mapper)";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json([]);

  try {
    const endpoint = new URL("https://nominatim.openstreetmap.org/search");
    endpoint.searchParams.set("format", "jsonv2");
    endpoint.searchParams.set("limit", "5");
    endpoint.searchParams.set("q", query);
    const response = await fetch(endpoint, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);
    const results = (await response.json()) as {
      display_name: string;
      lat: string;
      lon: string;
    }[];
    return NextResponse.json(
      results.map((result) => ({
        label: result.display_name,
        lat: Number(result.lat),
        lng: Number(result.lon),
      })),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to search addresses" },
      { status: 502 },
    );
  }
}
