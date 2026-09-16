import tzLookup from "tz-lookup";

const partsFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

function partsAsUtc(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    partsFormatter(timeZone)
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
}

export function timeZoneFor(lat: number, lng: number): string {
  return tzLookup(lat, lng);
}

export function zonedDate(dateStr: string, hour: number, timeZone: string): Date {
  const initial = new Date(`${dateStr}T${String(hour).padStart(2, "0")}:00:00Z`);
  const firstOffset = partsAsUtc(initial, timeZone) - initial.getTime();
  const firstPass = new Date(initial.getTime() - firstOffset);
  const secondOffset = partsAsUtc(firstPass, timeZone) - firstPass.getTime();
  return new Date(initial.getTime() - secondOffset);
}

export function hourIn(date: Date, timeZone: string): number {
  const hour = partsFormatter(timeZone)
    .formatToParts(date)
    .find(({ type }) => type === "hour")?.value;
  return Number(hour ?? 0);
}

export function fmtClock(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function fmtHour(hour: number): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    hour: "numeric",
  }).format(new Date(Date.UTC(2020, 0, 1, hour)));
}
