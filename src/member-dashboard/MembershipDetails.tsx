import React from "react";
import { BadgeCheck } from "lucide-react";
import { formatBatchTime, formatMemberDate, getMembershipDisplayStatus, type MemberDashboardData } from "./member-overview-data";

export function MembershipDetails({ data }: { data: MemberDashboardData }) {
  const { member, membership, batch } = data;
  const status = getMembershipDisplayStatus(membership.status, membership.expiryDate, membership.daysRemaining);
  const duration = membership.durationMonths ? `${membership.durationMonths} ${membership.durationMonths === 1 ? "month" : "months"}` : null;
  const batchTime = batch?.startTime && batch?.endTime ? `${formatBatchTime(batch.startTime)} – ${formatBatchTime(batch.endTime)}` : null;
  const fields = [
    ["Membership plan", membership.planName],
    ["Membership number", member.membershipNo],
    ["Membership status", status],
    ["Start date", formatMemberDate(membership.startDate)],
    ["End date", formatMemberDate(membership.expiryDate)],
    ["Duration", duration],
    ["Batch", batch?.name],
    ["Batch timing", batchTime],
    ["Payment status", membership.paymentStatus],
  ].filter((field): field is [string, string] => Boolean(field[1]));

  return <section aria-labelledby="membership-details-title" className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><BadgeCheck className="h-4.5 w-4.5" /></span><div><h2 id="membership-details-title" className="text-base font-semibold text-slate-950">Membership details</h2><p className="mt-0.5 text-sm text-slate-500">Your current membership record</p></div></div>
    {fields.length ? <dl className="grid sm:grid-cols-2 xl:grid-cols-3">{fields.map(([label, value]) => <div key={label} className="border-b border-slate-100 px-5 py-4 last:border-b-0 sm:px-6 sm:[&:nth-last-child(-n+2)]:border-b-0 xl:[&:nth-last-child(-n+3)]:border-b-0"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1.5 break-words text-sm font-semibold text-slate-900">{value}</dd></div>)}</dl> : <p className="px-6 py-8 text-sm text-slate-500">Membership details will appear after your record is completed.</p>}
  </section>;
}
