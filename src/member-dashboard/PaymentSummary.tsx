import React from "react";
import { CreditCard } from "lucide-react";
import { formatMemberDate, type MemberPayment } from "./member-overview-data";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

// One card for the newest payment. The history below lists every payment with its invoice,
// so this only answers "what did I pay last, and is it done".
export function PaymentSummary({ latest }: { latest: MemberPayment | null }) {
  const date = formatMemberDate(latest?.paymentDate);
  return <section aria-label="Latest payment" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">Latest payment</p>
        <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950">{latest ? currency.format(latest.amount) : "No payments yet"}</p>
        {latest?.planName && <p className="mt-1 truncate text-sm font-medium text-slate-700">{latest.planName}</p>}
      </div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><CreditCard className="h-4.5 w-4.5" /></span>
    </div>
    {latest && <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500">
      <PaymentStatusBadge payment={latest} />
      <span className="whitespace-nowrap">{date || "Date pending"}</span>
      {latest.paymentMethod && <><span aria-hidden="true">·</span><span>{latest.paymentMethod}</span></>}
    </div>}
  </section>;
}
