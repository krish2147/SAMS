import React, { useState } from "react";
import { AlertTriangle, CreditCard, LoaderCircle } from "lucide-react";
import { calendarDaysFromToday, formatMemberDate, type MemberDashboardData } from "./member-overview-data";

// Online renewal for members. The server opens renewal 30 days before the membership ends (and
// keeps it open after it ends); "Renew now" creates the renewal order and goes to the same secure
// checkout page used for registration payments.

export const RENEWAL_OPENS_DAYS_BEFORE = 30;
export const RENEWAL_BANNER_DAYS = 7;

export function renewalState(membership: MemberDashboardData["membership"], now = new Date()) {
  const daysLeft = calendarDaysFromToday(membership.expiryDate, now);
  const status = membership.status?.trim().toLowerCase();
  const hasMembership = status === "active" || status === "expired";
  const canRenew = hasMembership && daysLeft !== null && daysLeft <= RENEWAL_OPENS_DAYS_BEFORE;
  return {
    daysLeft,
    ended: daysLeft !== null && daysLeft < 0,
    canRenew,
    showBanner: canRenew && daysLeft !== null && daysLeft <= RENEWAL_BANNER_DAYS
  };
}

export function RenewNowButton({ className = "", label = "Renew now" }: { className?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const renew = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/member/renew", { method: "POST", credentials: "same-origin" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.checkoutPath) throw new Error(result.error || "We couldn't start the renewal. Please try again.");
      window.location.assign(result.checkoutPath);
    } catch (err: any) {
      setError(err.message || "We couldn't start the renewal. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={() => void renew()} disabled={busy} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70 cursor-pointer ${className}`}>
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        {busy ? "Opening payment…" : label}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}

/** Home banner in the last week of a membership, and after it has ended. */
export function RenewalBanner({ data }: { data: MemberDashboardData }) {
  const state = renewalState(data.membership);
  if (!state.showBanner || state.daysLeft === null) return null;
  const expiry = formatMemberDate(data.membership.expiryDate);
  const title = state.ended
    ? `Your membership ended${expiry ? ` on ${expiry}` : ""}`
    : state.daysLeft === 0 ? "Your membership ends today"
    : state.daysLeft === 1 ? "Your membership ends tomorrow"
    : `Your membership ends in ${state.daysLeft} days`;
  return (
    <section aria-label="Renew your membership" className={`flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${state.ended ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${state.ended ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}><AlertTriangle className="h-5 w-5" /></span>
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Renew online now to keep your place in {data.batch?.name || "your batch"}, or renew at the reception.</p>
        </div>
      </div>
      <RenewNowButton className="w-full sm:w-auto" />
    </section>
  );
}
