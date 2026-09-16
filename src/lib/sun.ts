import * as SunCalc from "suncalc";
import { zonedDate } from "./time";

export type SunSample = {
  time: Date;
  azimuth: number;
  altitude: number;
};

export function getSunSamples(
  dateStr: string,
  lat: number,
  lng: number,
  timeZone: string,
  stepMinutes = 15,
): SunSample[] {
  const times = SunCalc.getTimes(zonedDate(dateStr, 12, timeZone), lat, lng);
  if (!times.sunrise || !times.sunset) return [];
  const sunrise = times.sunrise.getTime();
  const sunset = times.sunset.getTime();
  const step = stepMinutes * 60 * 1000;
  const samples: SunSample[] = [];

  for (let timestamp = sunrise; timestamp <= sunset; timestamp += step) {
    const time = new Date(timestamp);
    const position = SunCalc.getPosition(time, lat, lng);
    const altitude = (position.altitude * Math.PI) / 180;
    const azimuth = ((position.azimuth - 180) * Math.PI) / 180;
    if (altitude > 0 || timestamp === sunrise || timestamp === sunset) {
      samples.push({
        time,
        azimuth,
        altitude: Math.max(altitude, Number.EPSILON),
      });
    }
  }

  if (samples.length > 0 && samples.at(-1)!.time.getTime() < sunset) {
    const time = new Date(sunset);
    const position = SunCalc.getPosition(time, lat, lng);
    const altitude = (position.altitude * Math.PI) / 180;
    const azimuth = ((position.azimuth - 180) * Math.PI) / 180;
    samples.push({
      time,
      azimuth,
      altitude: Math.max(altitude, Number.EPSILON),
    });
  }

  return samples;
}
