import React from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import { formatMemberDate, getMembershipDisplayStatus, type MemberDashboardData } from "./member-overview-data";
import { RENEWAL_BANNER_DAYS, RenewNowButton, renewalState } from "./MemberRenewal";

// Matches the first stage of the server's renewal reminders (renewal-reminder.service.ts).
const RENEWAL_REMINDER_DAYS_BEFORE = 3;

export function RenewalPanel({ data }: { data: MemberDashboardData }) {
  const { membership } = data;
  const renewal = renewalState(membership);
  // The server never reports negative days left, so an ended membership is worked out from the date.
  const baseStatus = renewal.ended && membership.status ? "Expired" : getMembershipDisplayStatus(membership.status, membership.expiryDate, membership.daysRemaining);
  // Match the Home banner: the last week counts as "ending soon".
  const status = baseStatus === "Active" && renewal.daysLeft !== null && renewal.daysLeft <= RENEWAL_BANNER_DAYS ? "Expiring Soon" : baseStatus;
  const daysLeft = Math.max(0, renewal.daysLeft ?? membership.daysRemaining ?? 0);
  const expiry = formatMemberDate(membership.expiryDate);
  let title = "Renewal information";
  let message = "Renewal information will appear when your active membership dates are available.";
  let tone = "bg-slate-50 text-slate-600";

  if (status === "Active") {
    title = "Your membership is active.";
    message = expiry ? `Your current membership remains active through ${expiry}.` : "Your membership is currently active.";
    if (expiry) message += ` We'll send you a renewal reminder ${RENEWAL_REMINDER_DAYS_BEFORE} days before it ends.`;
    tone = "bg-emerald-50 text-emerald-700";
  } else if (status === "Expiring Soon") {
    title = daysLeft === 0 ? "Your membership ends today." : daysLeft === 1 ? "Your membership ends tomorrow." : `Your membership ends in ${daysLeft} days.`;
    message = "Renew online now, or at the reception, to keep your batch.";
    tone = "bg-amber-50 text-amber-800";
  } else if (status === "Expired") {
    title = expiry ? `Your membership expired on ${expiry}.` : "Your membership has expired.";
    message = "Renew online now, or at the reception, to start swimming again.";
    tone = "bg-slate-100 text-slate-700";
  } else if (status === "Paused") {
    title = "Your membership is paused.";
    message = "The academy has paused your membership. When it resumes, your end date moves back by the paused days. Questions? Call the reception.";
  } else if (membership.status) {
    title = "Renewal is not available yet.";
    message = "Your current membership is pending. Renewal details will appear after activation.";
  }

  const Icon = status === "Active" ? CheckCircle2 : Clock3;
  return <section aria-labelledby="renewal-panel-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6"><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span><div><p className="text-xs font-medium text-slate-500">Renewal</p><h2 id="renewal-panel-title" className="mt-1 text-base font-semibold text-slate-950">{title}</h2><p className="mt-1.5 text-sm leading-6 text-slate-500">{message}</p>{renewal.canRenew && <div className="mt-4"><RenewNowButton /></div>}</div></div></section>;
}
