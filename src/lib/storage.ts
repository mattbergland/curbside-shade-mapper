export type SavedSpot = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  savedAt: string;
  snapshot?: { date: string; shadedFractionPerHour: { hour: number; fraction: number }[] };
};

const STORAGE_KEY = "csm.savedSpots.v1";

export function getSavedSpots(): SavedSpot[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as SavedSpot[]) : [];
  } catch {
    return [];
  }
}

export function saveSpot(spot: SavedSpot): SavedSpot[] {
  const spots = getSavedSpots().filter((item) => item.id !== spot.id);
  const next = [spot, ...spots];
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function deleteSpot(id: string): SavedSpot[] {
  const next = getSavedSpots().filter((spot) => spot.id !== id);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}
