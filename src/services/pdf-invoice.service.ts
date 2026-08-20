import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { uploadsDir } from "../config/multer";
import { getObject, objectStorageEnabled, uploadObject } from "./object-storage.service";

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
   * Generate clean A4 PDF Invoice & Receipt document.
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

    const gstin = data.gstin || "24AAACB1234F1Z0";
    const statusText = (data.status || "PAID").toUpperCase();

    // 3. Generate Verification QR Code Data URL
    const qrContent = `BARODA SWIM FRONT - OFFICIAL INVOICE
Invoice No: ${data.invoiceNo}
Receipt No: ${data.receiptNo}
Member: ${data.memberName} (${data.membershipNo})
Amount: INR ${data.totalAmount}
Status: ${statusText}
Txn ID: ${data.razorpayPaymentId || "N/A"}`;

    let qrDataUrl = "";
    try {
      qrDataUrl = await QRCode.toDataURL(qrContent, { margin: 1, width: 120 });
    } catch (_) {}

    // 4. Create A4 jsPDF Document (210mm x 297mm)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = 210;

    // --- HEADER BANNER ---
    doc.setFillColor(15, 23, 42); // Navy slate (#0f172a)
    doc.rect(0, 0, pageWidth, 32, "F");

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("BARODA SWIM FRONT ACADEMY", 15, 15);

    doc.setTextColor(56, 189, 248); // Cyan sky (#38bdf8)
    doc.setFontSize(9);
    doc.text("OFFICIAL MEMBERSHIP TAX INVOICE & RECEIPT", 15, 22);

    doc.setTextColor(203, 213, 225);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`GSTIN: ${gstin} | Vadodara, Gujarat, India`, 15, 27);

    // --- PAID BADGE ---
    doc.setFillColor(16, 185, 129); // Emerald (#10b981)
    doc.roundedRect(pageWidth - 45, 10, 30, 12, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(statusText, pageWidth - 30, 17.5, { align: "center" });

    // --- INVOICE META & MEMBER INFO GRID ---
    let startY = 42;

    // Box 1: Invoice Details (Left)
    doc.setFillColor(248, 250, 252); // Light bg (#f8fafc)
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, startY, 88, 48, 3, 3, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("INVOICE DETAILS", 20, startY + 8);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    
    doc.text("Invoice Number:", 20, startY + 16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(data.invoiceNo, 52, startY + 16);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Receipt Number:", 20, startY + 22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(data.receiptNo, 52, startY + 22);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Invoice Date:", 20, startY + 28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(invDateStr, 52, startY + 28);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Payment Mode:", 20, startY + 34);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(data.paymentMethod || "Razorpay Gateway", 52, startY + 34);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Razorpay Txn ID:", 20, startY + 40);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(2, 132, 199);
    doc.text(data.razorpayPaymentId || "N/A", 52, startY + 40);

    // Box 2: Member Details (Right)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(107, startY, 88, 48, 3, 3, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("MEMBER DETAILS", 112, startY + 8);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);

    doc.text("Member Name:", 112, startY + 16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(data.memberName, 144, startY + 16);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Membership No:", 112, startY + 22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(data.membershipNo || "N/A", 144, startY + 22);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Mobile Number:", 112, startY + 28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(data.mobileNo || "N/A", 144, startY + 28);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Email Address:", 112, startY + 34);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    const displayEmail = data.email && data.email.length > 22 ? data.email.substring(0, 20) + "..." : (data.email || "N/A");
    doc.text(displayEmail, 144, startY + 34);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Membership Plan:", 112, startY + 40);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(data.planName || "Standard Plan", 144, startY + 40);

    // --- PAYMENT BREAKDOWN TABLE ---
    startY = startY + 56;

    // Table Header
    doc.setFillColor(15, 23, 42);
    doc.rect(15, startY, 180, 10, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("DESCRIPTION / ITEM", 20, startY + 6.5);
    doc.text("FEE TYPE", 110, startY + 6.5);
    doc.text("AMOUNT (INR)", 190, startY + 6.5, { align: "right" });

    // Row 1: Registration Fee
    startY = startY + 10;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, startY, 180, 12, "D");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${data.planName} - Registration Fee`, 20, startY + 7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(data.paymentType || "Registration", 110, startY + 7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`INR ${data.registrationFee.toFixed(2)}`, 190, startY + 7.5, { align: "right" });

    // Row 2: Renewal Fee / Monthly Membership Fee
    startY = startY + 12;
    doc.rect(15, startY, 180, 12, "D");

    doc.setFont("helvetica", "bold");
    doc.text(`${data.planName} - Membership Subscription Fee`, 20, startY + 7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(data.paymentType || "Renewal", 110, startY + 7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`INR ${data.renewalFee.toFixed(2)}`, 190, startY + 7.5, { align: "right" });

    // Table Summary Banner (Total)
    startY = startY + 12;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, startY, 180, 14, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL PAID AMOUNT", 20, startY + 9);

    doc.setTextColor(2, 132, 199); // Sky blue
    doc.setFontSize(14);
    doc.text(`INR ${data.totalAmount.toFixed(2)}`, 190, startY + 9.5, { align: "right" });

    // --- THANK YOU & QR CODE & SIGNATURE ---
    startY = startY + 24;

    // Thank you box (Left)
    doc.setFillColor(240, 253, 244); // Light emerald (#f0fdf4)
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(15, startY, 110, 36, 3, 3, "FD");

    doc.setTextColor(22, 101, 52);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Thank You for Your Payment! 🎉", 20, startY + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(22, 101, 52);
    doc.text("Your Baroda Swim Front membership is now active.", 20, startY + 16);
    doc.text("Please keep this official tax invoice & receipt for your records.", 20, startY + 22);
    doc.text("Show your QR ID pass at the pool reception entry gate.", 20, startY + 28);

    // QR Code (Center-Right)
    if (qrDataUrl) {
      try {
        doc.addImage(qrDataUrl, "PNG", 132, startY, 32, 32);
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(6.5);
        doc.text("Scan to Verify Invoice", 148, startY + 35, { align: "center" });
      } catch (_) {}
    }

    // Authorized Signature Box (Right)
    const sigX = 168;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);

    // Stamp / Sign placeholder line
    doc.setDrawColor(148, 163, 184);
    doc.line(166, startY + 22, 198, startY + 22);

    doc.text("Authorized Signatory", 182, startY + 26, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.text("Baroda Swim Front", 182, startY + 30, { align: "center" });

    // --- FOOTER ---
    const footerY = 280;
    doc.setDrawColor(226, 232, 240);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text(
      "This is a computer-generated invoice and does not require a physical signature.",
      pageWidth / 2,
      footerY,
      { align: "center" }
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      "Baroda Swim Front Academy • Akota, Vadodara, Gujarat 390020 • Support: +91 98765 43210 • info@barodaswimfront.in",
      pageWidth / 2,
      footerY + 5,
      { align: "center" }
    );

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
