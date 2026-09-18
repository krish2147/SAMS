import React from "react";
import { ArrowRight, ExternalLink, ReceiptText } from "lucide-react";
import { formatMemberDate, receiptHref, type MemberPayment } from "./member-overview-data";

interface RecentPaymentsProps {
  payments: MemberPayment[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onViewAll: () => void;
}

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function RecentPayments({ payments, loading, error, onRetry, onViewAll }: RecentPaymentsProps) {
  return (
    <section aria-labelledby="recent-payments-title" className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div><h2 id="recent-payments-title" className="text-base font-semibold text-slate-950">Recent payments</h2><p className="mt-0.5 text-sm text-slate-500">Your latest transactions</p></div>
        <button type="button" onClick={onViewAll} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-cyan-700 hover:text-cyan-800">View all<ArrowRight className="h-4 w-4" /></button>
      </div>
      {loading ? <div className="space-y-4 p-5 sm:p-6">{[0, 1, 2].map((item) => <div key={item} className="grid animate-pulse grid-cols-[1fr_100px] gap-5"><div><div className="h-4 w-36 rounded bg-slate-200" /><div className="mt-2 h-3 w-24 rounded bg-slate-100" /></div><div className="h-4 rounded bg-slate-100" /></div>)}</div>
      : error ? <div className="p-6 text-center"><p className="text-sm text-slate-600">We couldn't load your recent payments.</p><button type="button" onClick={onRetry} className="mt-3 min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">Try again</button></div>
      : payments.length === 0 ? <div className="px-6 py-10 text-center"><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400"><ReceiptText className="h-5 w-5" /></span><p className="mt-3 text-sm font-medium text-slate-700">No payments yet</p><p className="mt-1 text-sm text-slate-500">Your transaction history will appear here.</p></div>
      : <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full table-fixed text-left text-sm"><thead className="bg-slate-50/80 text-xs font-medium text-slate-500"><tr><th className="w-[20%] px-6 py-3">Date</th><th className="w-[30%] px-4 py-3">Membership</th><th className="w-[18%] px-4 py-3">Amount</th><th className="w-[16%] px-4 py-3">Status</th><th className="w-[16%] px-6 py-3 text-right">Receipt</th></tr></thead><tbody className="divide-y divide-slate-100">{payments.map((payment, index) => { const url = receiptHref(payment); return <tr key={`${payment.paymentDate}-${payment.receiptNo || index}`}><td className="whitespace-nowrap px-6 py-4 text-slate-600">{formatMemberDate(payment.paymentDate) || "Date pending"}</td><td className="truncate px-4 py-4 font-medium text-slate-800">{payment.planName || "Membership"}</td><td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-950">{currency.format(payment.amount)}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${payment.status === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{payment.status || "Pending"}</span></td><td className="px-6 py-4 text-right">{url ? <a href={url} target="_blank" rel="noreferrer" aria-label={`View receipt for ${formatMemberDate(payment.paymentDate) || "payment"}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-cyan-700 hover:text-cyan-800">View<ExternalLink className="h-3.5 w-3.5" /></a> : <span className="text-xs text-slate-400">—</span>}</td></tr>})}</tbody></table></div>
        <div className="divide-y divide-slate-100 md:hidden">{payments.map((payment, index) => { const url = receiptHref(payment); return <article key={`${payment.paymentDate}-${payment.receiptNo || index}`} className="p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-lg font-semibold text-slate-950">{currency.format(payment.amount)}</p><p className="mt-1 truncate text-sm font-medium text-slate-700">{payment.planName || "Membership"}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${payment.status === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{payment.status || "Pending"}</span></div><div className="mt-3 flex min-h-11 items-center justify-between gap-4"><span className="whitespace-nowrap text-sm text-slate-500">{formatMemberDate(payment.paymentDate) || "Date pending"}</span>{url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-cyan-700">View receipt<ExternalLink className="h-3.5 w-3.5" /></a>}</div></article>})}</div>
      </>}
    </section>
  );
}
