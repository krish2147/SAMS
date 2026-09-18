import React from "react";
import { CalendarDays, CreditCard, FileCheck2 } from "lucide-react";
import { formatMemberDate, type MemberPayment } from "./member-overview-data";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function SummaryCard({ children }: { children: React.ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">{children}</article>;
}

export function PaymentSummary({ latest, latestPaid }: { latest: MemberPayment | null; latestPaid: MemberPayment | null }) {
  return <section aria-label="Payment summary" className="grid gap-4 md:grid-cols-3">
    <SummaryCard><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">Latest payment</p><p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">{latest ? currency.format(latest.amount) : "No payments"}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><CreditCard className="h-4.5 w-4.5" /></span></div>{latest && <div className="mt-4 flex items-center justify-between gap-3"><PaymentStatusBadge payment={latest} /><span className="whitespace-nowrap text-xs text-slate-500">{formatMemberDate(latest.paymentDate) || "Date pending"}</span></div>}</SummaryCard>
    <SummaryCard><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">Current membership payment</p><p className="mt-2 line-clamp-2 text-base font-semibold text-slate-950">{latestPaid?.planName || "No completed payment"}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600"><CalendarDays className="h-4.5 w-4.5" /></span></div>{latestPaid && <p className="mt-4 text-sm text-slate-600"><span className="font-semibold text-emerald-700">Paid</span>{latestPaid.paymentMethod ? ` · ${latestPaid.paymentMethod}` : ""}</p>}</SummaryCard>
    <SummaryCard><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">Documents</p><p className="mt-2 text-base font-semibold text-slate-950">{latestPaid?.hasReceipt || latestPaid?.hasInvoice ? "Documents ready" : "Not available yet"}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600"><FileCheck2 className="h-4.5 w-4.5" /></span></div><div className="mt-4 flex gap-4 text-xs text-slate-500"><span>Receipt <strong className="text-slate-700">{latestPaid?.hasReceipt ? "Available" : "Not available"}</strong></span><span>Invoice <strong className="text-slate-700">{latestPaid?.hasInvoice ? "Available" : "Not available"}</strong></span></div></SummaryCard>
  </section>;
}
