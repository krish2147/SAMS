import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function pageCount(pdf: Buffer): number {
  const match = pdf.toString("latin1").match(/\/Type \/Pages[\s\S]*?\/Count (\d+)/);
  assert.ok(match, "PDF page tree should contain a page count");
  return Number(match[1]);
}

test("premium invoice is A4, compact, idempotent, and overflow safe", async () => {
  const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sams-invoice-test-"));
  process.env.UPLOAD_DIR = outputRoot;
  for (const key of ["SPACES_BUCKET", "SPACES_REGION", "SPACES_ACCESS_KEY_ID", "SPACES_SECRET_ACCESS_KEY"]) {
    delete process.env[key];
  }

  const { PdfInvoiceService, formatInvoiceCurrency, INVOICE_LAYOUT, INVOICE_BRANDING } = await import("./pdf-invoice.service");
  const { BARODA_SWIM_FRONT_LOGO_DATA_URI } = await import("../assets/baroda-swim-front-logo");
  assert.equal(formatInvoiceCurrency(3800), "₹3,800");
  assert.equal(formatInvoiceCurrency(125000), "₹1,25,000");
  assert.equal(formatInvoiceCurrency(3800.5), "₹3,800.50");
  assert.equal(INVOICE_LAYOUT.PAGE_MARGIN, 18);
  assert.match(BARODA_SWIM_FRONT_LOGO_DATA_URI, /^data:image\/jpeg;base64,/);
  assert.ok(INVOICE_BRANDING.WATERMARK_OPACITY > 0 && INVOICE_BRANDING.WATERMARK_OPACITY < 0.1);

  const fixture = {
    paymentId: 2,
    invoiceNo: "BSF-INV-2026-000002",
    receiptNo: "BSF-REC-2026-000002",
    invoiceDate: "2026-08-26T10:30:00+05:30",
    memberName: "Krish Prajapati",
    membershipNo: "BSF-2026-2035",
    mobileNo: "+91 98765 43210",
    email: "krish.prajapati@example.com",
    planName: "General 3 Days",
    durationMonths: 1,
    paymentType: "Registration",
    registrationFee: 300,
    renewalFee: 3500,
    totalAmount: 3800,
    paymentMethod: "upi",
    razorpayPaymentId: "pay_R7examplePayment0002",
    status: "Paid",
    membershipStartDate: "2026-08-26",
    membershipEndDate: "2026-09-25"
  };

  const generated = await PdfInvoiceService.generateInvoicePDF(fixture);
  assert.equal(generated.pdfBuffer.subarray(0, 5).toString(), "%PDF-");
  assert.equal(pageCount(generated.pdfBuffer), 1);
  assert.ok(generated.pdfBuffer.length < 100_000, "invoice should remain reasonably small");
  assert.match(generated.pdfBuffer.toString("latin1"), /\/MediaBox \[0 0 595\.27/);
  assert.match(generated.pdfBuffer.toString("latin1"), /\/FontName \/NotoSans/);
  assert.match(generated.pdfBuffer.toString("latin1"), /\/Subtype \/Image/);
  assert.ok(fs.existsSync(generated.filePath));

  const reused = await PdfInvoiceService.generateInvoicePDF({ ...fixture, memberName: "Must not regenerate" });
  assert.deepEqual(reused.pdfBuffer, generated.pdfBuffer);

  const longFixture = {
    ...fixture,
    invoiceNo: "BSF-INV-2026-LONG",
    receiptNo: `BSF-REC-${"2026-LONG-".repeat(8)}`,
    memberName: "A deliberately long member name used to verify defensive wrapping without clipping or shrinking text ".repeat(3),
    email: `${"very.long.member.address.".repeat(8)}@example.test`,
    planName: "Premium General Swimming Membership With An Intentionally Long Descriptive Plan Name ".repeat(4),
    razorpayPaymentId: `pay_${"LongGatewayIdentifier".repeat(18)}`
  };
  const overflow = await PdfInvoiceService.generateInvoicePDF(longFixture);
  assert.ok(pageCount(overflow.pdfBuffer) >= 2, "genuinely long content should flow onto another page");
  assert.ok(pageCount(overflow.pdfBuffer) <= 4, "overflow should remain bounded and readable");
});
