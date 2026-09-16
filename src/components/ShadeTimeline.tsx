"use client";

import type { ShadeSample, ShadeSummary } from "@/lib/shade";
import { fmtClock, fmtHour, hourIn, zonedDate } from "@/lib/time";

type Props = {
  samples: ShadeSample[];
  summary: ShadeSummary;
  date: string;
  timeZone: string;
  onDateChange: (date: string) => void;
  onHighlight: (blockerId?: string) => void;
};

const formatMinutes = (minutes: number) =>
  `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;

function zoneLabel(timeZone: string): string {
  return timeZone.split("/").at(-1)?.replaceAll("_", " ") ?? timeZone;
}

export default function ShadeTimeline({
  samples,
  summary,
  date,
  timeZone,
  onDateChange,
  onHighlight,
}: Props) {
  const sunrise = samples[0]?.time;
  const sunset = samples.at(-1)?.time;
  const daylightMinutes = sunrise && sunset
    ? Math.round((sunset.getTime() - sunrise.getTime()) / 60_000)
    : 0;
  const firstHour = sunrise ? hourIn(sunrise, timeZone) : 0;
  const lastHour = sunset ? hourIn(sunset, timeZone) : firstHour;
  const daylightHours = Array.from(
    { length: Math.max(0, lastHour - firstHour + 1) },
    (_, offset) => firstHour + offset,
  );
  const daylightLabels = daylightHours.filter((hour) => {
    if (!sunrise || !sunset) return false;
    const instant = zonedDate(date, hour, timeZone);
    return instant >= sunrise && instant <= sunset;
  });
  const labels = daylightLabels.filter(
    (_, index) => daylightLabels.length <= 10 || index % 2 === 0 || index === daylightLabels.length - 1,
  );
  const bestWindow = summary.bestShadyWindow
    ? `${fmtClock(summary.bestShadyWindow.start, timeZone)}–${fmtClock(summary.bestShadyWindow.end, timeZone)}`
    : "No continuous shade found";
  const displayZone = zoneLabel(timeZone);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Sun path</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Your shade timeline</h2>
        </div>
        <label className="text-sm font-semibold text-slate-700">
          Date
          <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 font-normal text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200" />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
        <span>Sunrise <strong className="text-slate-900">{sunrise ? fmtClock(sunrise, timeZone) : "—"}</strong></span>
        <span>Sunset <strong className="text-slate-900">{sunset ? fmtClock(sunset, timeZone) : "—"}</strong></span>
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-500">Times shown in {displayZone} time</p>
      <p className="mt-3 text-sm font-semibold text-slate-800">
        Shady {formatMinutes(summary.shadedMinutes)} of {formatMinutes(daylightMinutes)} daylight · Selling hours (11 AM–7 PM): {formatMinutes(summary.windowShadedMinutes)} shady · Best shady window {bestWindow}
      </p>
      <div className="mt-5 overflow-x-auto pb-1">
        <div className="min-w-[560px]">
          <div className="flex gap-0.5" aria-label="15-minute sun and shade timeline">
            {samples.slice(0, -1).map((sample, index) => (
              <button
                key={sample.time.toISOString()}
                type="button"
                aria-label={`${fmtClock(sample.time, timeZone)}: ${sample.shaded ? "shade" : "sun"}`}
                onFocus={() => onHighlight(sample.blockerId)}
                onMouseEnter={() => onHighlight(sample.blockerId)}
                onMouseLeave={() => onHighlight(undefined)}
                className={`h-10 min-w-[10px] flex-1 rounded-sm border border-white/60 transition-transform hover:scale-y-110 focus:z-10 focus:scale-y-110 focus:outline-none focus:ring-2 focus:ring-slate-900 ${sample.shaded ? "bg-sky-400" : "bg-amber-300"}`}
              >
                <span className="sr-only">{index}</span>
              </button>
            ))}
          </div>
          <div className="relative mt-2 h-5 text-[11px] font-semibold text-slate-500">
            {labels.map((hour) => {
              const hourInstant = zonedDate(date, hour, timeZone);
              const position = sunrise && sunset
                ? ((hourInstant.getTime() - sunrise.getTime()) / (sunset.getTime() - sunrise.getTime())) * 100
                : 0;
              return <span key={hour} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${Math.max(0, Math.min(100, position))}%` }}>{fmtHour(hour)}</span>;
            })}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-sky-400" /> Shade</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-amber-300" /> Sun</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm border border-slate-400 bg-orange-500" /> Highlighted blocker</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {summary.shadedFractionPerHour.map(({ hour, fraction }) => {
          const shadedMinutes = Math.round(fraction * 60);
          const sample = samples.find((item) => hourIn(item.time, timeZone) === hour);
          return (
            <button key={hour} type="button" aria-label={`${fmtHour(hour)}: ${shadedMinutes ? `${shadedMinutes} of 60 minutes shade` : "full sun"}`} onFocus={() => onHighlight(sample?.blockerId)} onMouseEnter={() => onHighlight(sample?.blockerId)} onMouseLeave={() => onHighlight(undefined)} className="rounded-xl border border-slate-200 px-3 py-2 text-left text-xs hover:border-orange-300 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-400">
              <span className="block font-bold text-slate-900">{fmtHour(hour)}</span>
              <span className="text-slate-600">{shadedMinutes ? `${shadedMinutes} of 60 min shade` : "Full sun"}</span>
            </button>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>Hourly shade breakdown</caption>
        <thead><tr><th>Hour</th><th>Shade minutes</th><th>Shade fraction</th></tr></thead>
        <tbody>{summary.shadedFractionPerHour.map(({ hour, fraction }) => <tr key={hour}><td>{fmtHour(hour)}</td><td>{Math.round(fraction * 60)}</td><td>{Math.round(fraction * 100)}%</td></tr>)}</tbody>
      </table>
    </section>
  );
}
