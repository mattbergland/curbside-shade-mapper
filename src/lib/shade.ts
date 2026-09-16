import { Building } from "./buildings";
import {
  pointInPolygon,
  raySegmentIntersection,
  toLocalMeters,
  LocalPoint,
} from "./geo";
import { SunSample } from "./sun";
import { hourIn, zonedDate } from "./time";

export type ShadeSample = {
  time: Date;
  sun: boolean;
  shaded: boolean;
  blockerId?: string;
};

function localFootprint(building: Building, spot: { lat: number; lng: number }) {
  return building.footprint.map(([lng, lat]) =>
    toLocalMeters(lat, lng, spot.lat, spot.lng),
  );
}

export function computeShade(
  spot: { lat: number; lng: number },
  buildings: Building[],
  samples: SunSample[],
): ShadeSample[] {
  const projected = buildings.map((building) => ({
    building,
    polygon: localFootprint(building, spot),
  }));

  return samples.map((sample) => {
    const direction: LocalPoint = {
      x: -Math.sin(sample.azimuth),
      y: -Math.cos(sample.azimuth),
    };
    let nearest: { building: Building; distance: number } | undefined;

    for (const candidate of projected) {
      let distance: number | null = null;
      for (let index = 0; index < candidate.polygon.length; index += 1) {
        const next = (index + 1) % candidate.polygon.length;
        const hit = raySegmentIntersection(
          { x: 0, y: 0 },
          direction,
          candidate.polygon[index],
          candidate.polygon[next],
        );
        if (hit !== null && (distance === null || hit < distance)) distance = hit;
      }
      if (
        distance !== null &&
        candidate.building.height > distance * Math.tan(sample.altitude) &&
        (!nearest || distance < nearest.distance)
      ) {
        nearest = { building: candidate.building, distance };
      }
    }

    return {
      time: sample.time,
      sun: !nearest,
      shaded: Boolean(nearest),
      ...(nearest ? { blockerId: nearest.building.id } : {}),
    };
  });
}

export function isInsideBuilding(
  spot: { lat: number; lng: number },
  buildings: Building[],
): boolean {
  return buildings.some((building) =>
    pointInPolygon(
      { x: 0, y: 0 },
      localFootprint(building, spot),
    ),
  );
}

export type ShadeSummary = {
  shadedMinutes: number;
  sunMinutes: number;
  windowShadedMinutes: number;
  bestShadyWindow?: { start: Date; end: Date };
  shadedFractionPerHour: { hour: number; fraction: number }[];
};

export function summarize(
  samples: ShadeSample[],
  local: { dateStr: string; tz: string },
  windowStart = 11,
  windowEnd = 19,
): ShadeSummary {
  if (samples.length < 1) {
    return {
      shadedMinutes: 0,
      sunMinutes: 0,
      windowShadedMinutes: 0,
      shadedFractionPerHour: [],
    };
  }

  const intervals = samples.slice(0, -1).map((sample, index) => ({
    start: sample.time,
    end: samples[index + 1].time,
    shaded: sample.shaded,
  }));
  const minutes = (start: Date, end: Date) =>
    Math.max(0, (end.getTime() - start.getTime()) / 60_000);
  const shadedMinutes = intervals
    .filter((interval) => interval.shaded)
    .reduce((total, interval) => total + minutes(interval.start, interval.end), 0);
  const totalMinutes = intervals.reduce(
    (total, interval) => total + minutes(interval.start, interval.end),
    0,
  );
  const startBoundary = zonedDate(local.dateStr, windowStart, local.tz);
  const endBoundary = zonedDate(local.dateStr, windowEnd, local.tz);
  const windowIntervals = intervals.flatMap((interval) => {
    const start = new Date(
      Math.max(interval.start.getTime(), startBoundary.getTime()),
    );
    const end = new Date(Math.min(interval.end.getTime(), endBoundary.getTime()));
    return end > start ? [{ start, end, shaded: interval.shaded }] : [];
  });
  const windowShadedMinutes = windowIntervals
    .filter((interval) => interval.shaded)
    .reduce((total, interval) => total + minutes(interval.start, interval.end), 0);

  const firstHour = hourIn(samples[0].time, local.tz);
  const lastHour = hourIn(samples.at(-1)!.time, local.tz);
  const shadedFractionPerHour = Array.from(
    { length: Math.max(0, lastHour - firstHour + 1) },
    (_, offset) => {
      const hour = firstHour + offset;
      const hourStart = zonedDate(local.dateStr, hour, local.tz);
      const hourEnd = zonedDate(local.dateStr, hour + 1, local.tz);
      const shaded = intervals
        .filter((interval) => interval.shaded)
        .reduce((total, interval) => {
          const overlapStart = new Date(
            Math.max(interval.start.getTime(), hourStart.getTime()),
          );
          const overlapEnd = new Date(
            Math.min(interval.end.getTime(), hourEnd.getTime()),
          );
          return total + minutes(overlapStart, overlapEnd);
        }, 0);
      return { hour, fraction: Math.min(1, shaded / 60) };
    },
  );

  let bestShadyWindow: ShadeSummary["bestShadyWindow"];
  let current: { start: Date; end: Date } | undefined;
  for (const interval of windowIntervals) {
    if (interval.shaded) {
      current = current
        ? { start: current.start, end: interval.end }
        : { start: interval.start, end: interval.end };
    } else if (current) {
      if (
        !bestShadyWindow ||
        current.end.getTime() - current.start.getTime() >
          bestShadyWindow.end.getTime() - bestShadyWindow.start.getTime()
      ) {
        bestShadyWindow = current;
      }
      current = undefined;
    }
  }
  if (
    current &&
    (!bestShadyWindow ||
      current.end.getTime() - current.start.getTime() >
        bestShadyWindow.end.getTime() - bestShadyWindow.start.getTime())
  ) {
    bestShadyWindow = current;
  }

  return {
    shadedMinutes,
    sunMinutes: Math.max(0, totalMinutes - shadedMinutes),
    windowShadedMinutes,
    ...(bestShadyWindow ? { bestShadyWindow } : {}),
    shadedFractionPerHour,
  };
}
