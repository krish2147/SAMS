import React from "react";
import { CalendarRange } from "lucide-react";
import { calendarDaysFromToday, formatMemberDate, getMembershipDisplayStatus, membershipProgress, type MemberDashboardData } from "./member-overview-data";

export function MembershipValidity({ data }: { data: MemberDashboardData }) {
  const { membership } = data;
  const start = formatMemberDate(membership.startDate);
  const expiry = formatMemberDate(membership.expiryDate);
  const progress = membershipProgress(membership.startDate, membership.expiryDate);
  const status = getMembershipDisplayStatus(membership.status, membership.expiryDate, membership.daysRemaining);
  const position = progress ?? 0;
  const daysUntilStart = calendarDaysFromToday(membership.startDate);
  const startsInFuture = typeof daysUntilStart === "number" && daysUntilStart > 0;

  return <section aria-labelledby="membership-validity-title" className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium text-cyan-700">Current period</p><h2 id="membership-validity-title" className="mt-1 text-lg font-semibold text-slate-950">Membership validity</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><CalendarRange className="h-5 w-5" /></span></div>
    {start && expiry && progress !== null ? <>
      <p className={`mt-7 text-2xl font-semibold tracking-[-0.02em] ${status === "Expiring Soon" ? "text-amber-700" : "text-slate-950"}`}>{startsInFuture ? (daysUntilStart === 1 ? "Starts in 1 day" : `Starts in ${daysUntilStart} days`) : status === "Expired" ? "Membership expired" : membership.daysRemaining === 1 ? "1 day remaining" : `${Math.max(0, membership.daysRemaining ?? 0)} days remaining`}</p>
      <div className="relative mt-7 h-2 rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={position} aria-label={`${position}% of membership period elapsed`}><div className={`h-full rounded-full ${status === "Expiring Soon" ? "bg-amber-400" : status === "Expired" ? "bg-slate-400" : "bg-cyan-500"}`} style={{ width: `${position}%` }} /><span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-slate-950 shadow" style={{ left: `${position}%` }} aria-hidden="true" /></div>
      <div className="mt-4 grid grid-cols-2 gap-4"><div><p className="text-xs text-slate-500">Start</p><p className="mt-1 whitespace-nowrap text-sm font-semibold text-slate-800">{start}</p></div><div className="text-right"><p className="text-xs text-slate-500">Expiry</p><p className="mt-1 whitespace-nowrap text-sm font-semibold text-slate-800">{expiry}</p></div></div>
      <p className="mt-5 text-xs leading-5 text-slate-500">{startsInFuture ? "This membership period has not started yet." : "The marker shows today's position within your stored membership period."}</p>
    </> : <div className="mt-8 rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-800">Validity dates pending</p><p className="mt-1 text-sm leading-5 text-slate-500">Your start and expiry dates will appear after activation.</p></div>}
  </section>;
}
