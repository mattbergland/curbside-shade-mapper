import { describe, expect, it } from "vitest";
import { Building } from "./buildings";
import { computeShade, isInsideBuilding } from "./shade";
import { getSunSamples } from "./sun";

const spot = { lat: 40.7, lng: -74 };
const metersToLng = (meters: number) =>
  meters / (111_320 * Math.cos((spot.lat * Math.PI) / 180));
const metersToLat = (meters: number) => meters / 111_320;

function squareAt(xMeters: number, yMeters: number, size = 10): [number, number][] {
  const half = size / 2;
  return [
    [spot.lng + metersToLng(xMeters - half), spot.lat + metersToLat(yMeters - half)],
    [spot.lng + metersToLng(xMeters + half), spot.lat + metersToLat(yMeters - half)],
    [spot.lng + metersToLng(xMeters + half), spot.lat + metersToLat(yMeters + half)],
    [spot.lng + metersToLng(xMeters - half), spot.lat + metersToLat(yMeters + half)],
  ];
}

const southBuilding: Building = {
  id: "south",
  height: 30,
  footprint: squareAt(0, -20),
  heightSource: "height",
};

const northBuilding: Building = {
  id: "north",
  height: 30,
  footprint: squareAt(0, 20),
  heightSource: "height",
};

function noonSample(date: string) {
  return getSunSamples(new Date(`${date}T17:00:00Z`), spot.lat, spot.lng, 60).find(
    (sample) => Math.abs(sample.time.getTime() - new Date(`${date}T17:00:00Z`).getTime()) < 30 * 60_000,
  )!;
}

describe("computeShade", () => {
  it("does not shade at summer noon when the sun is high", () => {
    const result = computeShade(spot, [southBuilding], [noonSample("2026-06-21")]);
    expect(result[0].shaded).toBe(false);
  });

  it("shades at winter noon when the sun is low", () => {
    const result = computeShade(spot, [southBuilding], [noonSample("2026-12-21")]);
    expect(result[0].shaded).toBe(true);
  });

  it("does not shade when the building is behind the sun", () => {
    const result = computeShade(spot, [northBuilding], [
      noonSample("2026-06-21"),
      noonSample("2026-12-21"),
    ]);
    expect(result.every((sample) => !sample.shaded)).toBe(true);
  });

  it("keeps every sample sunny without buildings", () => {
    const samples = getSunSamples(new Date("2026-06-21T17:00:00Z"), spot.lat, spot.lng);
    expect(computeShade(spot, [], samples).every((sample) => sample.sun)).toBe(true);
  });

  it("detects when the spot is inside a footprint", () => {
    expect(isInsideBuilding(spot, [southBuilding])).toBe(false);
    expect(isInsideBuilding({ lat: spot.lat - metersToLat(20), lng: spot.lng }, [southBuilding])).toBe(true);
  });
});
