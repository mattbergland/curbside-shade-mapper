"use client";

import { useMemo } from "react";
import type { ShadeSample, ShadeSummary } from "@/lib/shade";

type Props = {
  samples: ShadeSample[];
  summary: ShadeSummary;
  date: string;
  onDateChange: (date: string) => void;
  onHighlight: (blockerId?: string) => void;
};

const clock = (date: Date, options: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", ...options }).format(date);

export default function ShadeTimeline({ samples, summary, date, onDateChange, onHighlight }: Props) {
  const hours = useMemo(() => summary.shadedFractionPerHour, [summary]);
  const sunrise = samples[0]?.time;
  const sunset = samples.at(-1)?.time;
  const formatMinutes = (minutes: number) => `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
  const bestWindow = summary.bestShadyWindow
    ? `${clock(summary.bestShadyWindow.start)}–${clock(summary.bestShadyWindow.end)}`
    : "No continuous shade found";

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
        <span>Sunrise <strong className="text-slate-900">{sunrise ? clock(sunrise) : "—"}</strong></span>
        <span>Sunset <strong className="text-slate-900">{sunset ? clock(sunset) : "—"}</strong></span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-800">
        Shady {formatMinutes(summary.shadedMinutes)} of {formatMinutes(summary.shadedMinutes + summary.sunMinutes)} daylight · Best shady window {bestWindow}
      </p>
      <div className="mt-5 overflow-x-auto pb-1">
        <div className="flex min-w-[560px] gap-0.5" aria-label="15-minute sun and shade timeline">
          {samples.slice(0, -1).map((sample, index) => (
            <button
              key={sample.time.toISOString()}
              type="button"
              aria-label={`${clock(sample.time)}: ${sample.shaded ? "shade" : "sun"}`}
              onFocus={() => onHighlight(sample.blockerId)}
              onMouseEnter={() => onHighlight(sample.blockerId)}
              onMouseLeave={() => onHighlight(undefined)}
              className={`h-10 min-w-[10px] flex-1 rounded-sm border border-white/60 transition-transform hover:scale-y-110 focus:z-10 focus:scale-y-110 focus:outline-none focus:ring-2 focus:ring-slate-900 ${sample.shaded ? "bg-sky-400" : "bg-amber-300"}`}
            >
              <span className="sr-only">{index}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex min-w-[560px] justify-between text-[11px] font-semibold text-slate-500">
          {hours.map(({ hour }) => <span key={hour}>{new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date(2020, 0, 1, hour))}</span>)}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-sky-400" /> Shade</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-amber-300" /> Sun</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm border border-slate-400 bg-orange-500" /> Highlighted blocker</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {hours.map(({ hour, fraction }) => {
          const shadedMinutes = Math.round(fraction * 60);
          return (
            <button key={hour} type="button" onFocus={() => {
              const sample = samples.find((item) => item.time.getHours() === hour);
              onHighlight(sample?.blockerId);
            }} onMouseEnter={() => {
              const sample = samples.find((item) => item.time.getHours() === hour);
              onHighlight(sample?.blockerId);
            }} onMouseLeave={() => onHighlight(undefined)} className="rounded-xl border border-slate-200 px-3 py-2 text-left text-xs hover:border-orange-300 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-400">
              <span className="block font-bold text-slate-900">{new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date(2020, 0, 1, hour))}</span>
              <span className="text-slate-600">{shadedMinutes ? `${shadedMinutes} of 60 min shade` : "Full sun"}</span>
            </button>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>Hourly shade breakdown</caption>
        <thead><tr><th>Hour</th><th>Shade minutes</th><th>Shade fraction</th></tr></thead>
        <tbody>{hours.map(({ hour, fraction }) => <tr key={hour}><td>{hour}</td><td>{Math.round(fraction * 60)}</td><td>{Math.round(fraction * 100)}%</td></tr>)}</tbody>
      </table>
    </section>
  );
}
