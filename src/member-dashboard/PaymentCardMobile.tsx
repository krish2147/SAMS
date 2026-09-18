import React from "react";
import type { MemberPayment } from "./member-overview-data";
import { formatMemberDate } from "./member-overview-data";
import { PaymentDocumentActions } from "./PaymentDocumentActions";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { presentPaymentStatus } from "./payment-presentation";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function PaymentCardMobile({ payment }: { payment: MemberPayment }) {
  const status = presentPaymentStatus(payment);
  return <article className="p-5">
    <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-xl font-semibold tracking-[-0.015em] text-slate-950">{currency.format(payment.amount)}</p><p className="mt-2 truncate text-sm font-semibold text-slate-800">{payment.planName || "Membership"}</p></div><PaymentStatusBadge payment={payment} /></div>
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500"><span className="whitespace-nowrap">{formatMemberDate(payment.paymentDate) || "Date pending"}</span>{payment.paymentMethod && <><span aria-hidden="true">·</span><span>{payment.paymentMethod}</span></>}</div>
    {status === "Refunded" && <div className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">Refunded {currency.format(Number(payment.refundAmount || 0))}{formatMemberDate(payment.refundDate) ? ` on ${formatMemberDate(payment.refundDate)}` : ""}</div>}
    <div className="mt-5 grid gap-3"><div><div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-medium text-slate-500">Receipt</p>{payment.receiptNo && <span className="max-w-[65%] truncate text-xs text-slate-500">{payment.receiptNo}</span>}</div><PaymentDocumentActions payment={payment} type="receipt" /></div><div><div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-medium text-slate-500">Invoice</p>{payment.invoiceNo && <span className="max-w-[65%] truncate text-xs text-slate-500">{payment.invoiceNo}</span>}</div><PaymentDocumentActions payment={payment} type="invoice" /></div></div>
  </article>;
}
