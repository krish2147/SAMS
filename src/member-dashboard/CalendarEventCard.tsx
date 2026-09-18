import React from "react";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { calendarDateBadge, eventTimeRange, formatCalendarDate, type MemberCalendarEvent } from "./calendar-data";

export const CalendarEventCard: React.FC<{ event: MemberCalendarEvent }> = ({ event }) => {
  const badge = calendarDateBadge(event.eventDate);
  const date = formatCalendarDate(event.eventDate);
  const timing = eventTimeRange(event.startTime, event.endTime);
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6"><div className="flex items-start gap-4">{badge && <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-cyan-50 text-cyan-800 ring-1 ring-inset ring-cyan-100"><span className="text-[11px] font-semibold uppercase">{badge.month}</span><span className="text-xl font-bold leading-6">{badge.day}</span></div>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2">{event.eventType && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{event.eventType}</span>}{event.registrationRequired && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Registration required</span>}</div><h3 className="mt-2 break-words text-lg font-semibold text-slate-950">{event.title}</h3></div></div><div className="mt-5 space-y-2 text-sm text-slate-600">{date && <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />{date}</p>}{timing && <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 shrink-0 text-slate-400" />{timing}</p>}{event.location && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>{event.location}</span></p>}</div>{event.description && <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">{event.description}</p>}</article>;
};
