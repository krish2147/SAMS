import React, { useCallback, useEffect, useState } from "react";
import { CalendarCheck2, CalendarDays, RefreshCw } from "lucide-react";
import { CalendarEventCard } from "./CalendarEventCard";
import { CalendarSkeleton } from "./CalendarSkeleton";
import { formatCalendarDate, type MemberCalendarEvent, type MemberCalendarHoliday } from "./calendar-data";

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-7 text-center"><p className="text-sm font-medium text-slate-700">{message}</p><button type="button" onClick={onRetry} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-cyan-200 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"><RefreshCw className="h-4 w-4" />Try again</button></div>;
}

export function MemberCalendarPage() {
  const [events, setEvents] = useState<MemberCalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<MemberCalendarHoliday[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [holidaysError, setHolidaysError] = useState(false);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true); setEventsError(false);
    try { const response = await fetch("/api/member/events", { credentials: "same-origin" }); if (!response.ok) throw new Error("events unavailable"); const result = await response.json(); setEvents(Array.isArray(result) ? result : []); }
    catch { setEventsError(true); }
    finally { setEventsLoading(false); }
  }, []);

  const loadHolidays = useCallback(async () => {
    setHolidaysLoading(true); setHolidaysError(false);
    try { const response = await fetch("/api/member/holidays", { credentials: "same-origin" }); if (!response.ok) throw new Error("holidays unavailable"); const result = await response.json(); setHolidays(Array.isArray(result) ? result : []); }
    catch { setHolidaysError(true); }
    finally { setHolidaysLoading(false); }
  }, []);

  useEffect(() => { void loadEvents(); void loadHolidays(); }, [loadEvents, loadHolidays]);
  if (eventsLoading || holidaysLoading) return <CalendarSkeleton />;
  const completelyEmpty = !eventsError && !holidaysError && events.length === 0 && holidays.length === 0;

  return <div className="mx-auto max-w-5xl space-y-6 lg:space-y-7"><header><h1 className="text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-[30px]">Calendar &amp; Events</h1><p className="mt-1.5 text-sm leading-6 text-slate-500 sm:text-[15px]">View upcoming academy events and important dates.</p></header>
    {completelyEmpty ? <section className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:py-14"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-100"><CalendarCheck2 className="h-5 w-5" /></span><h2 className="mt-5 text-lg font-semibold text-slate-950">No upcoming events</h2><p className="mt-2 text-sm text-slate-500">New events and important academy dates will appear here.</p></section> : <>
      <section aria-labelledby="upcoming-events-title"><div className="mb-3"><p className="text-xs font-medium text-cyan-700">What’s ahead</p><h2 id="upcoming-events-title" className="mt-1 text-lg font-semibold text-slate-950">Upcoming events</h2></div>{eventsError ? <SectionError message="We couldn't load upcoming events." onRetry={() => void loadEvents()} /> : events.length ? <div className="grid gap-4 md:grid-cols-2">{events.map((event, index) => <CalendarEventCard key={`${event.eventDate || "event"}-${event.title}-${index}`} event={event} />)}</div> : <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-7 text-sm text-slate-500">No upcoming events are scheduled.</div>}</section>
      <section aria-labelledby="important-dates-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600"><CalendarDays className="h-5 w-5" /></span><div><p className="text-xs font-medium text-slate-500">Academy calendar</p><h2 id="important-dates-title" className="mt-0.5 text-lg font-semibold text-slate-950">Important dates</h2></div></div>{holidaysError ? <div className="mt-5"><SectionError message="We couldn't load important dates." onRetry={() => void loadHolidays()} /></div> : holidays.length ? <div className="mt-5 divide-y divide-slate-100">{holidays.map((holiday, index) => <article key={`${holiday.startDate || "date"}-${holiday.name}-${index}`} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-900">{holiday.name}</h3>{holiday.facilityClosed && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Facility closed</span>}</div>{holiday.description && <p className="mt-1.5 text-sm leading-6 text-slate-500">{holiday.description}</p>}</div><p className="shrink-0 text-sm font-medium text-slate-700">{formatCalendarDate(holiday.startDate)}{holiday.endDate && holiday.endDate !== holiday.startDate ? ` – ${formatCalendarDate(holiday.endDate)}` : ""}</p></article>)}</div> : <p className="mt-5 text-sm text-slate-500">No important dates are currently scheduled.</p>}</section>
    </>}
  </div>;
}
