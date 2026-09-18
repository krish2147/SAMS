import type { MemberPayment } from "./member-overview-data";

export type PaymentStatus = "Paid" | "Pending" | "Failed" | "Refunded" | "Cancelled" | "Other";
export type PaymentFilter = "All" | "Paid" | "Pending" | "Failed" | "Refunded";

export function presentPaymentStatus(payment: MemberPayment): PaymentStatus {
  const refund = payment.refundStatus?.trim().toLowerCase();
  if (refund && Number(payment.refundAmount || 0) > 0) return "Refunded";
  const status = payment.status?.trim().toLowerCase();
  if (["paid", "success", "successful", "completed", "captured"].includes(status || "")) return "Paid";
  if (["pending", "created", "authorized", "processing"].includes(status || "")) return "Pending";
  if (["failed", "failure"].includes(status || "")) return "Failed";
  if (["cancelled", "canceled"].includes(status || "")) return "Cancelled";
  return "Other";
}

export function filterMemberPayments(payments: MemberPayment[], filter: PaymentFilter) {
  return filter === "All" ? payments : payments.filter(payment => presentPaymentStatus(payment) === filter);
}

export function latestSuccessfulPayment(payments: MemberPayment[]) {
  return payments.find(payment => presentPaymentStatus(payment) === "Paid") || null;
}

export function latestPendingPayment(payments: MemberPayment[]) {
  return payments.find(payment => presentPaymentStatus(payment) === "Pending") || null;
}
