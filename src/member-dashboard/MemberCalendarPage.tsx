import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { CalendarEventCard } from "./CalendarEventCard";
import { CalendarSkeleton } from "./CalendarSkeleton";
import { type MemberCalendarEvent, type MemberCalendarHoliday } from "./calendar-data";
import { MemberMonthCalendar } from "./MemberMonthCalendar";

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

  return <div className="mx-auto max-w-5xl space-y-6 lg:space-y-7"><header><h1 className="text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-[30px]">Calendar &amp; Events</h1><p className="mt-1.5 text-sm leading-6 text-slate-500 sm:text-[15px]">Festivals, pool closures and academy events, month by month.</p></header>
    {holidaysError && <SectionError message="We couldn't load the academy's pool closures." onRetry={() => void loadHolidays()} />}
    <MemberMonthCalendar events={eventsError ? [] : events} holidays={holidaysError ? [] : holidays} />
    {eventsError ? <SectionError message="We couldn't load upcoming events." onRetry={() => void loadEvents()} /> : events.length > 0 && <section aria-labelledby="upcoming-events-title"><div className="mb-3"><p className="text-xs font-medium text-cyan-700">What’s ahead</p><h2 id="upcoming-events-title" className="mt-1 text-lg font-semibold text-slate-950">Upcoming events</h2></div><div className="grid gap-4 md:grid-cols-2">{events.map((event, index) => <CalendarEventCard key={`${event.eventDate || "event"}-${event.title}-${index}`} event={event} />)}</div></section>}
  </div>;
}
