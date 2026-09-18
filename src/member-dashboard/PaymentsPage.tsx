import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Download, ShieldCheck } from "lucide-react";
import { receiptDownloadHref, type MemberPayment } from "./member-overview-data";
import { latestPendingPayment, latestSuccessfulPayment, type PaymentFilter } from "./payment-presentation";
import { PaymentHistory } from "./PaymentHistory";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { PaymentSummary } from "./PaymentSummary";
import { PaymentsSkeleton } from "./PaymentsSkeleton";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function PaymentsPage() {
  const [payments, setPayments] = useState<MemberPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<PaymentFilter>("All");

  const loadPayments = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const response = await fetch("/api/member/payments", { credentials: "same-origin" });
      if (!response.ok) throw new Error("payments unavailable");
      const result = await response.json();
      setPayments(Array.isArray(result.payments) ? result.payments : []);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadPayments(); }, [loadPayments]);
  const latest = payments[0] || null;
  const latestPaid = useMemo(() => latestSuccessfulPayment(payments), [payments]);
  const pending = useMemo(() => latestPendingPayment(payments), [payments]);
  const latestReceiptDownload = receiptDownloadHref(latestPaid);

  if (loading) return <PaymentsSkeleton />;
  if (error) return <section role="alert" className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><ShieldCheck className="h-5 w-5" /></span><h1 className="mt-4 text-lg font-semibold text-slate-900">We couldn't load your payment history.</h1><p className="mt-1 text-sm text-slate-500">Please try again in a moment.</p><button type="button" onClick={() => void loadPayments()} className="mt-5 min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2">Try again</button></section>;

  return <div className="space-y-6 lg:space-y-7">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-[30px]">Payments &amp; Receipts</h1><p className="mt-1.5 text-sm leading-6 text-slate-500 sm:text-[15px]">View your membership payments, receipts and invoices.</p></div>{latestReceiptDownload && <a href={latestReceiptDownload} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"><Download className="h-4 w-4" />Download latest receipt</a>}</header>
    <PaymentSummary latest={latest} latestPaid={latestPaid} />
    {pending && <section aria-label="Pending payment" className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><h2 className="text-sm font-semibold text-amber-950">Payment pending</h2><p className="mt-1 text-sm text-amber-800">{pending.planName || "Membership"} · {currency.format(pending.amount)}</p></div></div><PaymentStatusBadge payment={pending} /></section>}
    <PaymentHistory payments={payments} filter={filter} onFilterChange={setFilter} />
  </div>;
}
