export type Building = {
  id: string;
  height: number;
  footprint: [number, number][];
  name?: string;
  heightSource: "height" | "levels" | "default";
};

type OverpassElement = {
  type: string;
  id: number | string;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
};

export function parseOverpass(json: { elements?: OverpassElement[] }): Building[] {
  return (json.elements ?? [])
    .filter((element) => element.type === "way" && (element.geometry?.length ?? 0) >= 3)
    .map((element) => {
      const tags = element.tags ?? {};
      const heightTag = tags.height?.replace(/\s*m\s*$/i, "").trim();
      const parsedHeight = heightTag ? Number.parseFloat(heightTag) : Number.NaN;
      const levels = tags["building:levels"]
        ? Number.parseFloat(tags["building:levels"])
        : Number.NaN;
      const heightSource = Number.isFinite(parsedHeight)
        ? "height"
        : Number.isFinite(levels)
          ? "levels"
          : "default";
      const height =
        heightSource === "height"
          ? parsedHeight
          : heightSource === "levels"
            ? levels * 3.2
            : 10;

      return {
        id: String(element.id),
        height,
        footprint: element.geometry!.map(
          (point) => [point.lon, point.lat] as [number, number],
        ),
        ...(tags.name ? { name: tags.name } : {}),
        heightSource,
      };
    });
}
