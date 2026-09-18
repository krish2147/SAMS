import React from "react";
import { ArrowUpRight, CalendarRange, Clock3, CreditCard, Waves } from "lucide-react";
import { formatBatchTime, formatMemberDate, receiptHref, type MemberDashboardData, type MemberPayment } from "./member-overview-data";

interface OverviewSummaryCardsProps {
  dashboard: MemberDashboardData;
  latestPayment?: MemberPayment | null;
  paymentsLoading: boolean;
  onNavigate: (section: "batch" | "payments") => void;
}

function Card({ children }: { children: React.ReactNode }) {
  return <article className="min-h-[172px] rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">{children}</article>;
}

function CardHeading({ icon: Icon, eyebrow, title }: { icon: React.ComponentType<{ className?: string }>; eyebrow: string; title: string }) {
  return <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">{eyebrow}</p><h3 className="mt-1 text-base font-semibold text-slate-950">{title}</h3></div><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><Icon className="h-4.5 w-4.5" /></span></div>;
}

export function OverviewSummaryCards({ dashboard, latestPayment, paymentsLoading, onNavigate }: OverviewSummaryCardsProps) {
  const start = formatMemberDate(dashboard.membership.startDate);
  const expiry = formatMemberDate(dashboard.membership.expiryDate);
  const batchStart = formatBatchTime(dashboard.batch?.startTime);
  const batchEnd = formatBatchTime(dashboard.batch?.endTime);
  const paymentDate = formatMemberDate(latestPayment?.paymentDate);
  const invoiceUrl = receiptHref(latestPayment);

  return (
    <section aria-label="Membership information" className={`grid gap-4 ${start && expiry ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
      <Card>
        <CardHeading icon={Waves} eyebrow="My batch" title={dashboard.batch?.name || "No batch assigned yet"} />
        {dashboard.batch ? <p className="mt-5 flex items-center gap-2 text-sm text-slate-600"><Clock3 className="h-4 w-4 text-slate-400" />{batchStart && batchEnd ? `${batchStart} – ${batchEnd}` : "Timing not available"}</p> : <p className="mt-5 text-sm leading-6 text-slate-500">Your assigned batch will appear here once confirmed.</p>}
        <button type="button" onClick={() => onNavigate("batch")} className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-cyan-700 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2">View batch<ArrowUpRight className="h-4 w-4" /></button>
      </Card>

      <Card>
        {paymentsLoading ? <div className="animate-pulse"><div className="h-3 w-24 rounded bg-slate-200" /><div className="mt-3 h-6 w-32 rounded bg-slate-200" /><div className="mt-5 h-4 w-40 rounded bg-slate-100" /><div className="mt-5 h-5 w-24 rounded bg-slate-100" /></div> : <>
          <CardHeading icon={CreditCard} eyebrow="Latest payment" title={latestPayment ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(latestPayment.amount) : "No payments yet"} />
          {latestPayment ? <p className="mt-5 text-sm text-slate-600"><span className="font-medium text-emerald-700">{latestPayment.status}</span>{paymentDate ? ` · ${paymentDate}` : ""}</p> : <p className="mt-5 text-sm leading-6 text-slate-500">Completed payments and receipts will appear here.</p>}
          <div className="mt-4 flex flex-wrap gap-4">
            {invoiceUrl && <a href={invoiceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-cyan-700 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2">View receipt<ArrowUpRight className="h-4 w-4" /></a>}
            <button type="button" onClick={() => onNavigate("payments")} className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2">Payment history</button>
          </div>
        </>}
      </Card>

      {start && expiry && <Card>
        <CardHeading icon={CalendarRange} eyebrow="Membership validity" title={dashboard.membership.daysRemaining === 1 ? "1 day remaining" : `${Math.max(0, dashboard.membership.daysRemaining ?? 0)} days remaining`} />
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-slate-500">Start</dt><dd className="mt-1 whitespace-nowrap font-medium text-slate-800">{start}</dd></div><div><dt className="text-xs text-slate-500">Expiry</dt><dd className="mt-1 whitespace-nowrap font-medium text-slate-800">{expiry}</dd></div></dl>
      </Card>}
    </section>
  );
}
