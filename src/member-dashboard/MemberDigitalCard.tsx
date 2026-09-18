import React from "react";
import { CalendarDays, CheckCircle2, Waves } from "lucide-react";
import { formatMemberDate, getMembershipDisplayStatus, type MemberDashboardData } from "./member-overview-data";

const statusStyles = {
  Active: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
  "Expiring Soon": "border-amber-200/80 bg-amber-50 text-amber-700",
  Expired: "border-slate-300 bg-slate-100 text-slate-700",
  Pending: "border-sky-200/80 bg-sky-50 text-sky-700",
};

export function MemberDigitalCard({ data }: { data: MemberDashboardData }) {
  const { member, membership } = data;
  const status = getMembershipDisplayStatus(membership.status, membership.expiryDate, membership.daysRemaining);
  const start = formatMemberDate(membership.startDate);
  const expiry = formatMemberDate(membership.expiryDate);

  return <section aria-labelledby="digital-membership-card-title" className="relative min-h-[292px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-[0_18px_42px_rgba(15,23,42,0.16)] sm:p-7">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(34,211,238,0.16),transparent_34%),linear-gradient(125deg,rgba(14,165,233,0.06),transparent_48%)]" />
    <div className="relative flex h-full min-h-[238px] flex-col">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Waves className="h-5 w-5 text-cyan-300" />Baroda Swim Front</div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}><CheckCircle2 className="h-3.5 w-3.5" />{status}</span>
      </div>
      <div className="mt-8">
        <p className="text-sm text-slate-400">Member</p>
        <h2 id="digital-membership-card-title" className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-white sm:text-[28px]">{member.fullName}</h2>
        <p className="mt-3 text-base font-medium text-cyan-200">{membership.planName || "Plan not assigned"}</p>
        {member.membershipNo && <p className="mt-1.5 text-sm text-slate-400">Membership no. <span className="font-medium text-slate-200">{member.membershipNo}</span></p>}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-5 border-t border-white/10 pt-5">
        <div><p className="flex items-center gap-1.5 text-xs text-slate-400"><CalendarDays className="h-3.5 w-3.5" />Start date</p><p className="mt-1.5 text-sm font-semibold text-slate-100">{start || "Pending activation"}</p></div>
        <div className="text-right"><p className="text-xs text-slate-400">Expiry date</p><p className="mt-1.5 text-sm font-semibold text-slate-100">{expiry || "Pending activation"}</p></div>
      </div>
    </div>
  </section>;
}
