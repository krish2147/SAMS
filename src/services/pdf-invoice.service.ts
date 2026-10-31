import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { uploadsDir } from "../config/multer";
import { getObject, objectStorageEnabled, uploadObject } from "./object-storage.service";
import { BARODA_SWIM_FRONT_LOGO_DATA_URI } from "../assets/baroda-swim-front-logo";
import { BSF_SIGNATURE_DATA_URI } from "../assets/baroda-swim-front-signature";

/** Academy GSTIN printed on invoices (GST REG-06 certificate, Baroda Swim Front, Vadodara). */
export const ACADEMY_GSTIN = (process.env.INVOICE_GSTIN || "24ABBFB0936E2Z0").trim();

/** Name printed under the signature on member invoices. */
export const INVOICE_SIGNATORY_NAME = "Ritvik";

export interface InvoiceData {
  paymentId: number;
  invoiceNo: string;
  receiptNo: string;
  invoiceDate: string | Date;
  memberName: string;
  membershipNo: string;
  mobileNo: string;
  email?: string;
  address?: string;
  planName: string;
  paymentType: string;
  registrationFee: number;
  renewalFee: number;
  totalAmount: number;
  paymentMethod: string;
  razorpayPaymentId: string;
  status: string;
  gstin?: string;
  invoicePath?: string;
}

export class PdfInvoiceService {
  /**
   * Generate the clean A4 invoice PDF (the one payment document; there is no separate receipt).
   * If PDF file already exists on server disk, reuses existing file without regenerating.
   */
  static async generateInvoicePDF(data: InvoiceData): Promise<{ filePath: string; fileUrl: string; pdfBuffer: Buffer }> {
    const filename = `${data.invoiceNo.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
    const objectKey = `invoices/${filename}`;
    const uploadDir = path.join(uploadsDir, "invoices");
    const filePath = path.join(uploadDir, filename);
    const fileUrl = `/uploads/invoices/${filename}`;

    if (objectStorageEnabled()) {
      const existingObject = await getObject(objectKey);
      if (existingObject) return { filePath: "", fileUrl, pdfBuffer: existingObject.body };
    } else if (fs.existsSync(filePath)) {
      const existingBuffer = fs.readFileSync(filePath);
      return {
        filePath,
        fileUrl,
        pdfBuffer: existingBuffer
      };
    }

    // 2. Format Dates & Currency
    const invDateStr = data.invoiceDate
      ? new Date(data.invoiceDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        })
      : new Date().toLocaleDateString("en-IN");

    // No GSTIN fallback: printing a made-up number on a document headed "invoice" is a
    // compliance problem. If the academy supplies one it is shown; otherwise nothing is.
    const gstin = (data.gstin || "").trim();
    const statusText = (data.status || "PAID").toUpperCase();

    // 3. Generate Verification QR Code Data URL
    const qrContent = `BARODA SWIM FRONT - OFFICIAL INVOICE
Invoice No: ${data.invoiceNo}
Member: ${data.memberName} (${data.membershipNo})
Amount: INR ${data.totalAmount}
Status: ${statusText}
Txn ID: ${data.razorpayPaymentId || "N/A"}`;

    let qrDataUrl = "";
    try {
      qrDataUrl = await QRCode.toDataURL(qrContent, { margin: 1, width: 120 });
    } catch (_) {}

    // 4. Create A4 jsPDF Document (210mm x 297mm)
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const PAGE_W = 210;
    const M = 20;                       // page margin
    const RIGHT = PAGE_W - M;
    const INK: [number, number, number] = [17, 24, 39];
    const MUTED: [number, number, number] = [120, 128, 138];
    const RULE: [number, number, number] = [214, 219, 226];

    const money = (value: number) =>
      "INR " + Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const label = (text: string, x: number, y: number) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(text, x, y);
    };
    const value = (text: string, x: number, y: number, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      doc.text(text, x, y);
    };
    const rule = (y: number, from = M, to = RIGHT) => {
      doc.setDrawColor(...RULE);
      doc.setLineWidth(0.2);
      doc.line(from, y, to, y);
    };

    // ---------- Masthead: logo left, INVOICE right ----------
    try {
      doc.addImage(BARODA_SWIM_FRONT_LOGO_DATA_URI, "PNG", M, 18, 20, 20, undefined, "FAST");
    } catch (_) {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...INK);
    doc.text("Baroda", M + 25, 25);
    doc.text("Swim Front", M + 25, 30.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("Swim for life", M + 25, 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(30);
    doc.setTextColor(...INK);
    doc.text("INVOICE", RIGHT, 30, { align: "right" });

    // ---------- Meta row ----------
    let y = 48;
    label("Billed to", M, y);
    label("Academy", M + 62, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(`#${data.invoiceNo}`, RIGHT, y, { align: "right" });

    y += 6;
    value(data.memberName || "-", M, y, true);
    value("Baroda Swim Front", M + 62, y, true);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(invDateStr, RIGHT, y, { align: "right" });

    y += 5;
    value(data.membershipNo || "-", M, y);
    value("Vadodara, Gujarat", M + 62, y);
    if (gstin) value(`GSTIN: ${gstin}`, M + 62, y + 5);

    y += 5;
    value(data.mobileNo || "-", M, y);
    if (data.email) { y += 5; value(data.email, M, y); }
    if (data.address) {
      const addr = doc.splitTextToSize(String(data.address), 55) as string[];
      addr.slice(0, 2).forEach((line) => { y += 5; value(line, M, y); });
    }

    // ---------- Description ----------
    y = Math.max(y, 74) + 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(17);
    doc.setTextColor(...INK);
    doc.text("Description", M, y);

    y += 7;
    rule(y);
    y += 9;

    const items: Array<[string, number]> = [];
    if (Number(data.registrationFee) > 0) items.push(["Registration fee", Number(data.registrationFee)]);
    items.push([data.planName || "Membership fee", Number(data.renewalFee || data.totalAmount || 0)]);

    for (const [name, amount] of items) {
      value(name, M, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      doc.text(money(amount), RIGHT, y, { align: "right" });
      y += 8;
    }

    // ---------- Totals ----------
    y += 4;
    const totalsX = M + 95;
    rule(y, totalsX);
    y += 8;

    const subtotal = items.reduce((sum, [, amount]) => sum + amount, 0);
    label("Subtotal", totalsX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(money(subtotal), RIGHT, y, { align: "right" });

    y += 7;
    label("Total", totalsX, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(money(data.totalAmount), RIGHT, y, { align: "right" });

    y += 7;
    rule(y, totalsX);
    y += 7;
    label("Status", totalsX, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(statusText, RIGHT, y, { align: "right" });

    y += 6;
    label("Paid via", totalsX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(data.paymentMethod || "Razorpay", RIGHT, y, { align: "right" });

    // ---------- Payment reference & terms ----------
    const blockY = Math.max(y + 22, 196);
    rule(blockY - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text("Payment reference", M, blockY);
    doc.text("Terms", M + 95, blockY);

    let refY = blockY + 8;
    label("Transaction", M, refY);
    value(data.razorpayPaymentId || "-", M + 26, refY);
    refY += 5.5;
    label("Type", M, refY);
    value(data.paymentType || "Registration", M + 26, refY);
    refY += 5.5;
    label("Plan", M, refY);
    const planLines = doc.splitTextToSize(String(data.planName || "-"), 46) as string[];
    planLines.slice(0, 2).forEach((line, i) => value(line, M + 26, refY + i * 5));

    const terms = doc.splitTextToSize(
      "This invoice confirms payment received against the membership stated above. Membership is " +
      "non-transferable. Please retain this document for your records and present your member QR pass " +
      "at the reception gate.",
      70
    ) as string[];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    terms.forEach((line, i) => doc.text(line, M + 95, blockY + 8 + i * 4.4));

    // ---------- QR + signature ----------
    const signY = 246;
    if (qrDataUrl) {
      try {
        doc.addImage(qrDataUrl, "PNG", M, signY - 6, 24, 24, undefined, "FAST");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text("Scan to verify", M, signY + 22);
      } catch (_) {}
    }

    try {
      doc.addImage(BSF_SIGNATURE_DATA_URI, "PNG", RIGHT - 40, signY - 3, 40, 24, undefined, "FAST");
    } catch (_) {}
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.2);
    doc.line(RIGHT - 48, signY + 22, RIGHT, signY + 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text(INVOICE_SIGNATORY_NAME, RIGHT, signY + 27, { align: "right" });
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Authorised signatory", RIGHT, signY + 31, { align: "right" });

    // ---------- Footer ----------
    rule(282);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Baroda Swim Front, Vadodara, Gujarat", M, 287);
    doc.text(`Invoice ${data.invoiceNo}`, RIGHT, 287, { align: "right" });


    // 5. Output Buffer & Save File
    const arrayBuffer = doc.output("arraybuffer");
    const pdfBuffer = Buffer.from(arrayBuffer);

    if (objectStorageEnabled()) {
      await uploadObject(objectKey, pdfBuffer, "application/pdf");
    } else {
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(filePath, pdfBuffer);
    }

    return {
      filePath: objectStorageEnabled() ? "" : filePath,
      fileUrl,
      pdfBuffer
    };
  }
}
