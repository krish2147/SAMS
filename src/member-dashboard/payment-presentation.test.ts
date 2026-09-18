import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { invoiceDownloadHref, invoiceHref, receiptDownloadHref, receiptHref, type MemberPayment } from "./member-overview-data";
import { filterMemberPayments, latestPendingPayment, latestSuccessfulPayment, presentPaymentStatus } from "./payment-presentation";

const paid: MemberPayment = { amount: 3800, status: "Paid", paymentDate: "2026-09-04", planName: "Monthly", receiptNo: "REC-1", invoiceNo: "INV-1", hasReceipt: true, hasInvoice: true };
const pending: MemberPayment = { amount: 3800, status: "Pending", paymentDate: "2026-09-03", planName: "Monthly", hasReceipt: false, hasInvoice: false };
const failed: MemberPayment = { amount: 3800, status: "Failed", paymentDate: "2026-09-02", planName: "Monthly", hasReceipt: false, hasInvoice: false };

test("successful, pending, failed and refunded records retain member-friendly statuses", () => {
  assert.equal(presentPaymentStatus(paid), "Paid");
  assert.equal(presentPaymentStatus(pending), "Pending");
  assert.equal(presentPaymentStatus(failed), "Failed");
  assert.equal(presentPaymentStatus({ ...paid, refundStatus: "Processed", refundAmount: 1200 }), "Refunded");
});

test("multiple payments filter without creating shadow records", () => {
  const payments = [paid, pending, failed];
  assert.equal(filterMemberPayments(payments, "All"), payments);
  assert.deepEqual(filterMemberPayments(payments, "Pending"), [pending]);
  assert.equal(latestSuccessfulPayment(payments), paid);
  assert.equal(latestPendingPayment(payments), pending);
  assert.equal(latestSuccessfulPayment([]), null);
});

test("document actions exist only when stored receipt and invoice metadata is available", () => {
  assert.equal(receiptHref(paid), "/api/member/payments/receipt/REC-1");
  assert.equal(receiptDownloadHref(paid), "/api/member/payments/receipt/REC-1?download=true");
  assert.equal(invoiceHref(paid), "/api/member/payments/invoice/INV-1");
  assert.equal(invoiceDownloadHref(paid), "/api/member/payments/invoice/INV-1?download=true");
  assert.equal(receiptHref(pending), null);
  assert.equal(invoiceHref(pending), null);
});

test("member document routes require authentication and bind references to authenticated ownership", async () => {
  const source = await readFile(new URL("../routes/member-dashboard.routes.ts", import.meta.url), "utf8");
  assert.match(source, /router\.get\("\/member\/payments\/receipt\/:receiptNo", requireAuth\(\["member", "parent"\]\)/);
  assert.match(source, /router\.get\("\/member\/payments\/invoice\/:invoiceNo", requireAuth\(\["member", "parent"\]\)/);
  assert.match(source, /WHERE member_id = \? AND receipt_no = \?/);
  assert.match(source, /WHERE member_id = \? AND invoice_no = \?/);
  assert.doesNotMatch(source.slice(source.indexOf('router.get("/member/payments"'), source.indexOf('// Invoice references')), /razorpay_order_id|razorpay_payment_id|razorpay_signature|gateway_response/);
});
