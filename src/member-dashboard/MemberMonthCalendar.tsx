import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PartyPopper, Waves, CalendarClock } from "lucide-react";
import { FESTIVALS } from "./festivals";
import type { MemberCalendarEvent, MemberCalendarHoliday } from "./calendar-data";

// A month view for members: festivals and public holidays, days the academy has closed the pool,
// and academy events. Tap a day to see what is on.

type Kind = "festival" | "closed" | "event";
interface DayItem { kind: Kind; title: string; note?: string }

const KIND_STYLE: Record<Kind, { dot: string; chip: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  festival: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800 ring-amber-200", label: "Festival", icon: PartyPopper },
  closed: { dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700 ring-rose-200", label: "Pool closed", icon: Waves },
  event: { dot: "bg-cyan-500", chip: "bg-cyan-50 text-cyan-800 ring-cyan-200", label: "Academy event", icon: CalendarClock },
};

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const dateOnly = (v?: string | null) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

/** Every YYYY-MM-DD from start to end (inclusive), capped so a bad range cannot run away. */
function eachDay(start: string, end?: string | null) {
  const out: string[] = [];
  const [y, m, d] = start.split("-").map(Number);
  const cur = new Date(Date.UTC(y, m - 1, d));
  const last = end && end >= start ? end : start;
  for (let i = 0; i < 62; i++) {
    const k = cur.toISOString().slice(0, 10);
    out.push(k);
    if (k >= last) break;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

const todayKey = () => {
  const now = new Date();
  return keyOf(now.getFullYear(), now.getMonth(), now.getDate());
};

export function MemberMonthCalendar({ events, holidays }: { events: MemberCalendarEvent[]; holidays: MemberCalendarHoliday[] }) {
  const today = todayKey();
  const [cursor, setCursor] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [selected, setSelected] = useState<string>(today);

  const byDay = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    const add = (k: string, item: DayItem) => map.set(k, [...(map.get(k) || []), item]);
    for (const f of FESTIVALS) {
      for (const k of eachDay(f.date, f.endDate)) add(k, { kind: "festival", title: f.name, note: f.tentative ? "Date may shift by a day" : undefined });
    }
    for (const h of holidays) {
      const start = dateOnly(h.startDate);
      if (!start) continue;
      for (const k of eachDay(start, dateOnly(h.endDate))) add(k, { kind: h.facilityClosed === false ? "festival" : "closed", title: h.name, note: h.description || undefined });
    }
    for (const e of events) {
      const k = dateOnly(e.eventDate);
      if (k) add(k, { kind: "event", title: e.title, note: [e.location, e.description].filter(Boolean).join(" · ") || undefined });
    }
    return map;
  }, [events, holidays]);

  const { y, m } = cursor;
  const first = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const leading = first.getDay(); // Sunday first, as on Indian wall calendars
  const monthLabel = first.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const cells: Array<number | null> = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const monthItems = useMemo(() => {
    const prefix = `${y}-${pad(m + 1)}-`;
    const seen = new Set<string>();
    const list: Array<{ key: string; item: DayItem }> = [];
    [...byDay.keys()].filter((k) => k.startsWith(prefix)).sort().forEach((k) => {
      for (const item of byDay.get(k) || []) {
        // Multi-day items (Navratri, a closure week) are listed once, on their first day.
        const id = `${item.kind}:${item.title}`;
        const prev = new Date(Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)) - 1)).toISOString().slice(0, 10);
        if (seen.has(id) && (byDay.get(prev) || []).some((p) => `${p.kind}:${p.title}` === id)) continue;
        seen.add(id);
        list.push({ key: k, item });
      }
    });
    return list;
  }, [byDay, y, m]);

  const move = (delta: number) => setCursor(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const goToday = () => { const n = new Date(); setCursor({ y: n.getFullYear(), m: n.getMonth() }); setSelected(today); };
  const selectedItems = byDay.get(selected) || [];
  const selectedLabel = new Date(`${selected}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section aria-labelledby="month-calendar-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
        <h2 id="month-calendar-title" className="text-lg font-semibold text-slate-950">{monthLabel}</h2>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={goToday} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Today</button>
          <button type="button" onClick={() => move(-1)} aria-label="Previous month" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => move(1)} aria-label="Next month" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>

      <div className="px-2 pb-3 pt-3 sm:px-4">
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div role="grid" className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={`blank-${i}`} aria-hidden="true" />;
            const k = keyOf(y, m, day);
            const items = byDay.get(k) || [];
            const kinds: Kind[] = Array.from(new Set<Kind>(items.map((it) => it.kind)));
            const isToday = k === today;
            const isSelected = k === selected;
            const festival = items.find((it) => it.kind === "festival");
            const closed = kinds.includes("closed");
            // Name shown inside the day on wider screens: the festival first (a closure still shows as a
            // red day and dot), then a closure, then an event.
            const label = festival || items.find((it) => it.kind === "closed") || items.find((it) => it.kind === "event");
            const labelColour = !label ? "" : isSelected ? "text-white/80" : label.kind === "closed" ? "text-rose-700" : label.kind === "festival" ? "text-amber-800" : "text-cyan-800";
            return (
              <button
                key={k}
                type="button"
                role="gridcell"
                aria-selected={isSelected}
                aria-label={`${day} ${monthLabel}${items.length ? `: ${items.map((it) => it.title).join(", ")}` : ""}`}
                onClick={() => setSelected(k)}
                className={`relative flex min-h-[58px] flex-col items-center rounded-xl px-0.5 pb-1.5 pt-1.5 text-left transition sm:min-h-[76px] sm:items-start sm:px-2 ${
                  isSelected ? "bg-slate-900 text-white" : closed ? "bg-rose-50/70 hover:bg-rose-50" : festival ? "bg-amber-50/70 hover:bg-amber-50" : "hover:bg-slate-50"
                }`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday && !isSelected ? "ring-2 ring-cyan-500 text-cyan-800" : ""} ${!isSelected && i % 7 === 0 ? "text-rose-600" : ""}`}>{day}</span>
                {label && <span className={`mt-0.5 hidden w-full truncate text-[11px] font-medium leading-tight sm:block ${labelColour}`}>{label.title}</span>}
                {kinds.length > 0 && (
                  <span className="mt-auto flex gap-1 sm:hidden">
                    {kinds.map((kind) => <span key={kind} className={`h-1.5 w-1.5 rounded-full ${KIND_STYLE[kind].dot}`} />)}
                  </span>
                )}
                {kinds.length > 1 && (
                  <span className="mt-auto hidden gap-1 sm:flex">
                    {kinds.map((kind) => <span key={kind} className={`h-1.5 w-1.5 rounded-full ${KIND_STYLE[kind].dot}`} />)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-2 text-xs text-slate-500">
          {(Object.keys(KIND_STYLE) as Kind[]).map((kind) => (
            <span key={kind} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${KIND_STYLE[kind].dot}`} />{KIND_STYLE[kind].label}</span>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-6">
        <p className="text-sm font-semibold text-slate-900">{selectedLabel}</p>
        {selectedItems.length ? (
          <ul className="mt-2 space-y-2">
            {selectedItems.map((it, i) => <ItemRow key={i} item={it} />)}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-slate-500">Nothing special on this day. Classes run as usual.</p>
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">This month</p>
        {monthItems.length ? (
          <ul className="mt-2 divide-y divide-slate-100">
            {monthItems.map(({ key, item }, i) => (
              <li key={`${key}-${i}`} className="flex items-center gap-3 py-2.5">
                <span className="w-14 shrink-0 text-center">
                  <span className="block text-[11px] font-semibold uppercase text-slate-400">{new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" })}</span>
                  <span className="block text-lg font-bold leading-tight text-slate-900">{Number(key.slice(8, 10))}</span>
                </span>
                <ItemRow item={item} bare />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No festivals, closures or events this month.</p>
        )}
        <p className="mt-3 text-xs leading-5 text-slate-400">Festivals don't mean the pool is closed. Pool closures are marked in red when the academy announces them.</p>
      </div>
    </section>
  );
}

function ItemRow({ item, bare = false }: { item: DayItem; bare?: boolean; key?: React.Key }) {
  const style = KIND_STYLE[item.kind];
  const Icon = style.icon;
  const body = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${style.chip}`}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900">{item.title}</span>
        <span className="block truncate text-xs text-slate-500">{style.label}{item.note ? ` · ${item.note}` : ""}</span>
      </span>
    </>
  );
  return bare ? <span className="flex min-w-0 items-center gap-3">{body}</span> : <li className="flex items-center gap-3">{body}</li>;
}
