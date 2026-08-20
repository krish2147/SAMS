import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PaymentReceiptData {
  id: number;
  memberId?: number;
  memberName: string;
  membershipNo: string;
  mobileNo: string;
  email?: string;
  address?: string;
  planName: string;
  paymentType: "Registration" | "Renewal" | string;
  amount: number;
  registrationFee: number;
  renewalFee: number;
  paymentMethod: string;
  transactionId: string;
  orderId: string;
  status: string;
  paymentDate: string;
  approvedBy: string;
  receiptNo: string;
  invoiceNo: string;
}

export function generatePaymentReceiptPDF(receipt: PaymentReceiptData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // Theme colors
  const navyColor = [15, 23, 42]; // #0f172a
  const skyBlueColor = [2, 132, 199]; // #0284c7
  const slateColor = [100, 116, 139]; // #64748b

  // 1. Header Banner
  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.rect(0, 0, 210, 36, "F");

  doc.setFillColor(skyBlueColor[0], skyBlueColor[1], skyBlueColor[2]);
  doc.rect(0, 34, 210, 3, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("BARODA SWIM FRONT", 15, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Official Swimming Academy & Aquatic Fitness Center | Vadodara, Gujarat", 15, 26);

  // Document Badge
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT RECEIPT", 195, 20, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Receipt #: ${receipt.receiptNo || "BSF-REC-2026-001"}`, 195, 27, { align: "right" });

  // 2. Receipt & Invoice Meta Info Box
  let y = 46;

  doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("RECEIPT DETAILS", 15, y);
  doc.text("MEMBER INFORMATION", 115, y);

  y += 5;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, y, 85, 36, 2, 2, "FD");
  doc.roundedRect(110, y, 85, 36, 2, 2, "FD");

  // Left Meta Info
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice Number:", 18, y + 8);
  doc.setFont("helvetica", "normal");
  doc.text(receipt.invoiceNo || "BSF-INV-2026-001", 50, y + 8);

  doc.setFont("helvetica", "bold");
  doc.text("Order ID:", 18, y + 15);
  doc.setFont("helvetica", "normal");
  doc.text(receipt.orderId || "N/A", 50, y + 15);

  doc.setFont("helvetica", "bold");
  doc.text("Transaction ID:", 18, y + 22);
  doc.setFont("helvetica", "normal");
  doc.text(receipt.transactionId || "N/A", 50, y + 22);

  doc.setFont("helvetica", "bold");
  doc.text("Date & Time:", 18, y + 29);
  doc.setFont("helvetica", "normal");
  const dateFormatted = new Date(receipt.paymentDate).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  doc.text(dateFormatted, 50, y + 29);

  // Right Member Info
  doc.setFont("helvetica", "bold");
  doc.text("Member Name:", 113, y + 8);
  doc.setFont("helvetica", "normal");
  doc.text(receipt.memberName.toUpperCase(), 145, y + 8);

  doc.setFont("helvetica", "bold");
  doc.text("Membership #:", 113, y + 15);
  doc.setFont("helvetica", "normal");
  doc.text(receipt.membershipNo, 145, y + 15);

  doc.setFont("helvetica", "bold");
  doc.text("Mobile Number:", 113, y + 22);
  doc.setFont("helvetica", "normal");
  doc.text(receipt.mobileNo || "N/A", 145, y + 22);

  doc.setFont("helvetica", "bold");
  doc.text("Plan:", 113, y + 29);
  doc.setFont("helvetica", "normal");
  doc.text(receipt.planName, 145, y + 29);

  y += 45;

  // 3. Itemized Fee Breakdown Table
  const basePrice = Math.max(0, receipt.amount - receipt.registrationFee);
  
  autoTable(doc, {
    startY: y,
    head: [["Item / Fee Particulars", "Type", "Status", "Amount (INR)"]],
    body: [
      [
        `${receipt.planName} (${receipt.paymentType})`,
        receipt.paymentType,
        receipt.status.toUpperCase(),
        `INR ${basePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      ],
      [
        "One-Time Registration Fee",
        "Registration",
        receipt.status.toUpperCase(),
        `INR ${receipt.registrationFee.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
      ],
      [
        "GST & Administrative Services (18%)",
        "Tax",
        "INCLUDED",
        "INR 0.00"
      ]
    ],
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9
    },
    bodyStyles: {
      textColor: [30, 41, 59],
      fontSize: 8.5
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30, halign: "center" },
      3: { cellWidth: 25, halign: "right" }
    },
    margin: { left: 15, right: 15 }
  });

  // Get position after table
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // 4. Summary & Total Paid Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(120, finalY, 75, 28, 2, 2, "FD");

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Method:", 124, finalY + 8);
  doc.setFont("helvetica", "normal");
  doc.text(receipt.paymentMethod || "Razorpay Gateway", 160, finalY + 8);

  doc.setFont("helvetica", "bold");
  doc.text("Payment Status:", 124, finalY + 15);
  doc.setTextColor(16, 185, 129); // emerald green
  doc.text((receipt.status || "Paid").toUpperCase(), 160, finalY + 15);

  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.line(124, finalY + 18, 191, finalY + 18);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL PAID:", 124, finalY + 24);
  doc.setTextColor(2, 132, 199);
  doc.text(`INR ${receipt.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 191, finalY + 24, { align: "right" });

  // 5. Verification Seal & Terms
  const footerY = finalY + 40;

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, footerY, 90, 26, 2, 2, "D");

  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.text("VERIFICATION & AUTHORIZATION", 18, footerY + 6);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Processed By: ${receipt.approvedBy || "System Admin"}`, 18, footerY + 12);
  doc.text("Gateway: Razorpay Automated Webhook Confirmed", 18, footerY + 17);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 18, footerY + 22);

  // Digital Seal Stamp Box
  doc.setDrawColor(2, 132, 199);
  doc.setFillColor(240, 249, 255);
  doc.roundedRect(120, footerY, 75, 26, 2, 2, "FD");

  doc.setTextColor(2, 132, 199);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("✓ VERIFIED DIGITAL RECEIPT", 157.5, footerY + 11, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("Baroda Swim Front Aquatic Management System", 157.5, footerY + 18, { align: "center" });

  // Page Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("This is a computer-generated official receipt. No physical signature required. | Baroda Swim Front SAMS", 105, 285, { align: "center" });

  // Save PDF
  doc.save(`Receipt_${receipt.membershipNo}_${receipt.receiptNo || "BSF"}.pdf`);
}

export function generateCSVReport(transactions: PaymentReceiptData[]) {
  const headers = [
    "Receipt No",
    "Invoice No",
    "Member Name",
    "Membership No",
    "Mobile No",
    "Plan Name",
    "Payment Type",
    "Amount (INR)",
    "Registration Fee",
    "Renewal Fee",
    "Payment Method",
    "Transaction ID",
    "Order ID",
    "Status",
    "Date & Time",
    "Approved By"
  ];

  const rows = transactions.map((t) => [
    `"${t.receiptNo || ""}"`,
    `"${t.invoiceNo || ""}"`,
    `"${t.memberName || ""}"`,
    `"${t.membershipNo || ""}"`,
    `"${t.mobileNo || ""}"`,
    `"${t.planName || ""}"`,
    `"${t.paymentType || ""}"`,
    t.amount || 0,
    t.registrationFee || 0,
    t.renewalFee || 0,
    `"${t.paymentMethod || ""}"`,
    `"${t.transactionId || ""}"`,
    `"${t.orderId || ""}"`,
    `"${t.status || ""}"`,
    `"${new Date(t.paymentDate).toLocaleString("en-IN")}"`,
    `"${t.approvedBy || ""}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `BSF_Payments_Report_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
