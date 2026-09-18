import React from "react";
import type { MemberPayment } from "./member-overview-data";
import { presentPaymentStatus } from "./payment-presentation";

const styles = {
  Paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  Pending: "bg-amber-50 text-amber-700 ring-amber-600/10",
  Failed: "bg-rose-50 text-rose-700 ring-rose-600/10",
  Refunded: "bg-sky-50 text-sky-700 ring-sky-600/10",
  Cancelled: "bg-slate-100 text-slate-700 ring-slate-500/10",
  Other: "bg-slate-100 text-slate-700 ring-slate-500/10",
};

export function PaymentStatusBadge({ payment }: { payment: MemberPayment }) {
  const status = presentPaymentStatus(payment);
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}>{status === "Other" ? (payment.status || "Status pending") : status}</span>;
}
