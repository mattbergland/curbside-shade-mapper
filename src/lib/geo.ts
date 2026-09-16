const EARTH_RADIUS = 6_371_000;

export type LocalPoint = { x: number; y: number };

export function toLocalMeters(
  lat: number,
  lng: number,
  originLat: number,
  originLng: number,
): LocalPoint {
  const latRadians = (originLat * Math.PI) / 180;
  return {
    x:
      ((lng - originLng) * Math.PI * EARTH_RADIUS * Math.cos(latRadians)) / 180,
    y: ((lat - originLat) * Math.PI * EARTH_RADIUS) / 180,
  };
}

export function pointInPolygon(point: LocalPoint, polygon: LocalPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const current = polygon[i];
    const previous = polygon[j];
    const crosses =
      current.y > point.y !== previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) /
          (previous.y - current.y) +
          current.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function raySegmentIntersection(
  origin: LocalPoint,
  direction: LocalPoint,
  segmentStart: LocalPoint,
  segmentEnd: LocalPoint,
): number | null {
  const edge = {
    x: segmentEnd.x - segmentStart.x,
    y: segmentEnd.y - segmentStart.y,
  };
  const cross = direction.x * edge.y - direction.y * edge.x;
  if (Math.abs(cross) < 1e-10) return null;

  const toStart = {
    x: segmentStart.x - origin.x,
    y: segmentStart.y - origin.y,
  };
  const distance = (toStart.x * edge.y - toStart.y * edge.x) / cross;
  const segmentPosition =
    (toStart.x * direction.y - toStart.y * direction.x) / cross;

  if (distance > 1e-8 && segmentPosition >= -1e-8 && segmentPosition <= 1 + 1e-8) {
    return distance;
  }
  return null;
}
