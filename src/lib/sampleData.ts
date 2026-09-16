import { Building } from "./buildings";

export const DEMO_SPOT = { lat: 40.742, lng: -73.9897 };

const rectangle = (
  lng: number,
  lat: number,
  width: number,
  depth: number,
): [number, number][] => {
  const latScale = 1 / 111_320;
  const lngScale = 1 / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [
    [lng - width * lngScale, lat - depth * latScale],
    [lng + width * lngScale, lat - depth * latScale],
    [lng + width * lngScale, lat + depth * latScale],
    [lng - width * lngScale, lat + depth * latScale],
  ];
};

export const SAMPLE_BUILDINGS: Building[] = [
  { id: "demo-1", height: 45, footprint: rectangle(-73.99005, 40.74225, 30, 20), name: "Flatiron House", heightSource: "height" },
  { id: "demo-2", height: 18, footprint: rectangle(-73.9891, 40.7422, 22, 18), name: "Café Row", heightSource: "height" },
  { id: "demo-3", height: 30, footprint: rectangle(-73.98995, 40.74165, 18, 28), name: "Market Lofts", heightSource: "height" },
  { id: "demo-4", height: 9, footprint: rectangle(-73.98915, 40.74165, 25, 14), name: "Corner Shops", heightSource: "default" },
  { id: "demo-5", height: 24, footprint: rectangle(-73.99035, 40.74175, 16, 20), name: "The Workshop", heightSource: "levels" },
  { id: "demo-6", height: 12, footprint: rectangle(-73.9904, 40.74235, 18, 13), name: "Book Nook", heightSource: "height" },
  { id: "demo-7", height: 38, footprint: rectangle(-73.9895, 40.74265, 25, 17), name: "Sunset Tower", heightSource: "height" },
  { id: "demo-8", height: 6, footprint: rectangle(-73.9889, 40.7427, 19, 12), name: "Flower Stall", heightSource: "default" },
];
