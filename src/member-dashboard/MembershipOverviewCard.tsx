import React from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, CreditCard, Waves } from "lucide-react";
import { formatBatchTime, formatMemberDate, getMembershipDisplayStatus, membershipProgress, type MemberDashboardData } from "./member-overview-data";

interface MembershipOverviewCardProps {
  data: MemberDashboardData;
  onNavigate: (section: "membership" | "batch") => void;
}

const statusStyles = {
  Active: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
  "Expiring Soon": "border-amber-200/80 bg-amber-50 text-amber-700",
  Expired: "border-slate-300 bg-slate-100 text-slate-700",
  Pending: "border-sky-200/80 bg-sky-50 text-sky-700",
};

export function MembershipOverviewCard({ data, onNavigate }: MembershipOverviewCardProps) {
  const membership = data.membership;
  const status = getMembershipDisplayStatus(membership.status, membership.expiryDate, membership.daysRemaining);
  const progress = membershipProgress(membership.startDate, membership.expiryDate);
  const startDate = formatMemberDate(membership.startDate);
  const endDate = formatMemberDate(membership.expiryDate);
  const batchStart = formatBatchTime(data.batch?.startTime);
  const batchEnd = formatBatchTime(data.batch?.endTime);
  const showProgress = (status === "Active" || status === "Expiring Soon") && progress !== null;

  return (
    <section aria-labelledby="membership-overview-title" className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,0.14)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_15%,rgba(34,211,238,0.14),transparent_35%),linear-gradient(115deg,rgba(14,165,233,0.07),transparent_45%)]" />
      <div className="relative grid gap-7 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.35fr)_minmax(190px,0.7fr)] lg:items-center lg:gap-8 lg:p-7">
        <div className="min-w-0">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {status}
          </span>
          <h2 id="membership-overview-title" className="mt-4 text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">
            {membership.planName || "Membership plan not assigned"}
          </h2>
          {data.member.membershipNo && <p className="mt-2 text-sm text-slate-400">Membership no. <span className="font-medium text-slate-200">{data.member.membershipNo}</span></p>}
        </div>

        <div className="min-w-0 border-y border-white/10 py-5 lg:border-x lg:border-y-0 lg:px-8 lg:py-1">
          {startDate && endDate ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-400">Started</p>
                  <p className="mt-1 whitespace-nowrap text-sm font-semibold text-slate-100">{startDate}</p>
                </div>
                <ArrowRight className="mt-5 h-4 w-4 shrink-0 text-cyan-400" />
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-400">Valid until</p>
                  <p className="mt-1 whitespace-nowrap text-sm font-semibold text-slate-100">{endDate}</p>
                </div>
              </div>
              {showProgress && (
                <div className="mt-5">
                  <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-label={`${progress}% of membership period elapsed`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                    <div className={`h-full rounded-full ${status === "Expiring Soon" ? "bg-amber-400" : "bg-cyan-400"}`} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-400">Membership period</span>
                    <span className={`font-semibold ${status === "Expiring Soon" ? "text-amber-300" : "text-cyan-300"}`}>
                      {membership.daysRemaining === 1 ? "1 day remaining" : `${Math.max(0, membership.daysRemaining ?? 0)} days remaining`}
                    </span>
                  </div>
                </div>
              )}
              {status === "Expired" && <p className="mt-4 text-sm text-slate-300">This membership period has ended.</p>}
            </>
          ) : (
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
              <div><p className="text-sm font-semibold text-slate-100">Validity dates pending</p><p className="mt-1 text-sm leading-5 text-slate-400">Dates will appear here after membership activation.</p></div>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <Waves className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400">Current batch</p>
              <p className="mt-1 truncate text-sm font-semibold text-white">{data.batch?.name || "Not assigned"}</p>
              {batchStart && batchEnd && <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5" />{batchStart} – {batchEnd}</p>}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400"><CreditCard className="h-4 w-4" /><span>Payment</span><span className="font-semibold text-slate-200">{membership.paymentStatus || "Status pending"}</span></div>
          <button type="button" onClick={() => onNavigate(data.batch ? "batch" : "membership")} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950">
            {data.batch ? "View batch" : "View membership"}<ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
