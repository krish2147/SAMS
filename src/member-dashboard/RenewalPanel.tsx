import React from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import { formatMemberDate, getMembershipDisplayStatus, type MemberDashboardData } from "./member-overview-data";

export function RenewalPanel({ data }: { data: MemberDashboardData }) {
  const { membership } = data;
  const status = getMembershipDisplayStatus(membership.status, membership.expiryDate, membership.daysRemaining);
  const expiry = formatMemberDate(membership.expiryDate);
  let title = "Renewal information";
  let message = "Renewal information will appear when your active membership dates are available.";
  let tone = "bg-slate-50 text-slate-600";

  if (status === "Active") {
    title = "Your membership is active.";
    message = expiry ? `Your current membership remains active through ${expiry}.` : "Your membership is currently active.";
    tone = "bg-emerald-50 text-emerald-700";
  } else if (status === "Expiring Soon") {
    title = membership.daysRemaining === 1 ? "Your membership expires in 1 day." : `Your membership expires in ${Math.max(0, membership.daysRemaining ?? 0)} days.`;
    message = "Please contact the academy when you are ready to renew.";
    tone = "bg-amber-50 text-amber-800";
  } else if (status === "Expired") {
    title = expiry ? `Your membership expired on ${expiry}.` : "Your membership has expired.";
    message = "Please contact the academy for renewal assistance.";
    tone = "bg-slate-100 text-slate-700";
  } else if (membership.status) {
    title = "Renewal is not available yet.";
    message = "Your current membership is pending. Renewal details will appear after activation.";
  }

  const Icon = status === "Active" ? CheckCircle2 : Clock3;
  return <section aria-labelledby="renewal-panel-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6"><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span><div><p className="text-xs font-medium text-slate-500">Renewal</p><h2 id="renewal-panel-title" className="mt-1 text-base font-semibold text-slate-950">{title}</h2><p className="mt-1.5 text-sm leading-6 text-slate-500">{message}</p></div></div></section>;
}
