import * as SunCalc from "suncalc";

export type SunSample = {
  time: Date;
  azimuth: number;
  altitude: number;
};

export function getSunSamples(
  date: Date,
  lat: number,
  lng: number,
  stepMinutes = 15,
): SunSample[] {
  const times = SunCalc.getTimes(date, lat, lng);
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
    if (altitude > 0) {
      samples.push({
        time,
        azimuth,
        altitude,
      });
    }
  }

  if (samples.length > 0 && samples.at(-1)!.time.getTime() < sunset) {
    const time = new Date(sunset);
    const position = SunCalc.getPosition(time, lat, lng);
    const altitude = (position.altitude * Math.PI) / 180;
    const azimuth = ((position.azimuth - 180) * Math.PI) / 180;
    if (altitude > 0) {
      samples.push({
        time,
        azimuth,
        altitude,
      });
    }
  }

  return samples;
}
