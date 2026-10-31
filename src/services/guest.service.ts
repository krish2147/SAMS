import { getDbPool } from "../config/db";
import { PdfInvoiceService } from "./pdf-invoice.service";
import { ActivityService } from "./activity.service";
import { normalizeIndianMobile } from "../utils/phone";
import { indiaToday } from "./renewal-reminder.service";

// Walk-in guests who swim without a membership, paid at the counter by the hour. Prices come from
// the Guest plans on the rate card (weekday and weekend). Each visit gets its own invoice in a
// separate series (BSF-GV-<year>-000001) so it never clashes with member invoice numbers, and the
// money shows in Payments, Today's collections and the closing report alongside member payments.

const guestError = (message: string, status = 400) => Object.assign(new Error(message), { status });

let tableReady: Promise<void> | null = null;
export function ensureGuestTable(): Promise<void> {
  tableReady ??= (async () => {
    const pool = await getDbPool();
    await pool.query(`CREATE TABLE IF NOT EXISTS guest_visits (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      academy_id VARCHAR(50) NOT NULL DEFAULT 'swim',
      guest_name VARCHAR(100) NOT NULL,
      mobile_no VARCHAR(15) NULL,
      plan_id INT UNSIGNED NULL,
      plan_name VARCHAR(150) NOT NULL,
      hours INT UNSIGNED NOT NULL DEFAULT 1,
      rate DECIMAL(10,2) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(20) NOT NULL DEFAULT 'Cash',
      invoice_no VARCHAR(40) NOT NULL UNIQUE,
      visit_date DATE NOT NULL,
      recorded_by VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_guest_visit_date (visit_date)
    ) ENGINE=InnoDB`);
  })().catch((err) => { tableReady = null; throw err; });
  return tableReady;
}

/** Saturday and Sunday use the weekend guest rate (India time). */
export function isWeekendInIndia(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short" }).format(now);
  return day === "Sat" || day === "Sun";
}

/** Today's guest rate from the rate card. */
export async function currentGuestRate(now = new Date()) {
  const pool = await getDbPool();
  const code = isWeekendInIndia(now) ? "weekend_hourly" : "hourly";
  const [rows]: any = await pool.query(
    "SELECT id, name, renewal_fee FROM membership_plans WHERE plan_category = 'Guest' AND duration_code = ? AND (is_active IS NULL OR is_active <> 0) ORDER BY id LIMIT 1",
    [code]
  );
  const plan = rows?.[0];
  if (!plan) throw guestError("No guest price is set up on the rate card.", 409);
  return { planId: Number(plan.id), planName: String(plan.name), rate: Number(plan.renewal_fee), weekend: code === "weekend_hourly" };
}

const toVisit = (row: any) => ({
  id: Number(row.id),
  guestName: row.guest_name,
  mobileNo: row.mobile_no || "",
  planName: row.plan_name,
  hours: Number(row.hours),
  rate: Number(row.rate),
  amount: Number(row.amount),
  paymentMethod: row.payment_method,
  invoiceNo: row.invoice_no,
  visitDate: row.visit_date instanceof Date ? row.visit_date.toISOString().slice(0, 10) : String(row.visit_date).slice(0, 10),
  recordedBy: row.recorded_by || "",
  createdAt: row.created_at
});

export async function recordGuestVisit(input: { guestName?: unknown; mobileNo?: unknown; hours?: unknown; paymentMethod?: unknown }, academyId: string, actor: string) {
  await ensureGuestTable();
  const guestName = String(input.guestName ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
  if (guestName.length < 2) throw guestError("Enter the guest's name.");
  const mobileNo = String(input.mobileNo ?? "").trim() ? normalizeIndianMobile(input.mobileNo).national : null;
  const hours = Number(input.hours ?? 1);
  if (!Number.isInteger(hours) || hours < 1 || hours > 4) throw guestError("Hours must be between 1 and 4.");
  const paymentMethod = String(input.paymentMethod || "Cash") === "UPI" ? "UPI" : "Cash";
  const { planId, planName, rate } = await currentGuestRate();
  const amount = rate * hours;

  const pool = await getDbPool();
  const year = new Date().getFullYear();
  const prefix = `BSF-GV-${year}-`;
  // Retry on the rare collision when two desks record a guest at the same moment.
  for (let attempt = 0; attempt < 3; attempt++) {
    const [counts]: any = await pool.query("SELECT COUNT(*) AS n FROM guest_visits WHERE invoice_no LIKE ?", [`${prefix}%`]);
    const invoiceNo = `${prefix}${String(Number(counts?.[0]?.n || 0) + 1 + attempt).padStart(6, "0")}`;
    try {
      const [result]: any = await pool.query(
        "INSERT INTO guest_visits (academy_id, guest_name, mobile_no, plan_id, plan_name, hours, rate, amount, payment_method, invoice_no, visit_date, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [academyId, guestName, mobileNo, planId, planName, hours, rate, amount, paymentMethod, invoiceNo, indiaToday(), actor]
      );
      await ActivityService.logActivity(guestName, `Guest swim recorded: ${hours} hour${hours === 1 ? "" : "s"}, ₹${amount} ${paymentMethod}`, "Guest", actor);
      const [rows]: any = await pool.query("SELECT * FROM guest_visits WHERE id = ?", [result.insertId]);
      return toVisit(rows[0]);
    } catch (err: any) {
      if (err?.code !== "ER_DUP_ENTRY") throw err;
    }
  }
  throw guestError("The guest could not be recorded. Please try again.", 500);
}

export async function listGuestVisits(academyId: string, date?: string) {
  await ensureGuestTable();
  const pool = await getDbPool();
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : indiaToday();
  const [rows]: any = await pool.query("SELECT * FROM guest_visits WHERE academy_id = ? AND visit_date = ? ORDER BY id DESC", [academyId, day]);
  return (rows || []).map(toVisit);
}

/** All guest visits as payment-ledger rows, for Payments, collections and the closing report. */
export async function guestVisitsAsTransactions() {
  try {
    await ensureGuestTable();
    const pool = await getDbPool();
    const [rows]: any = await pool.query("SELECT * FROM guest_visits ORDER BY id DESC");
    return (rows || []).map((row: any) => {
      const v = toVisit(row);
      return {
        // Negative ids keep guest rows apart from member payment ids.
        id: -v.id,
        memberId: null,
        memberName: `${v.guestName} (guest)`,
        membershipNo: "Guest",
        mobileNo: v.mobileNo || "N/A",
        email: "",
        address: "",
        planName: `${v.planName} × ${v.hours}`,
        paymentType: "Guest",
        amount: v.amount,
        registrationFee: 0,
        renewalFee: v.amount,
        paymentMethod: v.paymentMethod,
        transactionId: v.invoiceNo,
        orderId: v.invoiceNo,
        status: "Paid",
        paymentDate: row.created_at,
        createdAt: row.created_at,
        approvedBy: v.recordedBy || "Reception",
        receiptNo: v.invoiceNo,
        invoiceNo: v.invoiceNo,
        invoicePath: null,
        invoiceUrl: `/api/guests/${v.id}/invoice`,
        generatedAt: row.created_at,
        failureReason: null,
        gatewayResponse: null,
        refundAmount: 0,
        refundStatus: null,
        refundDate: null,
        refundTxnId: null
      };
    });
  } catch (err) {
    console.error("Guest visits unavailable for the payments ledger:", err);
    return [];
  }
}

export async function guestInvoicePdf(id: number) {
  await ensureGuestTable();
  const pool = await getDbPool();
  const [rows]: any = await pool.query("SELECT * FROM guest_visits WHERE id = ?", [id]);
  if (!rows?.[0]) throw guestError("Guest visit not found.", 404);
  const v = toVisit(rows[0]);
  const { pdfBuffer } = await PdfInvoiceService.generateInvoicePDF({
    paymentId: -v.id,
    invoiceNo: v.invoiceNo,
    receiptNo: v.invoiceNo,
    invoiceDate: rows[0].created_at || v.visitDate,
    memberName: v.guestName,
    membershipNo: "Guest",
    mobileNo: v.mobileNo || "",
    planName: `${v.planName} × ${v.hours}`,
    paymentType: "Guest swim",
    registrationFee: 0,
    renewalFee: v.amount,
    totalAmount: v.amount,
    paymentMethod: v.paymentMethod,
    razorpayPaymentId: v.invoiceNo,
    status: "Paid"
  });
  return { invoiceNo: v.invoiceNo, pdfBuffer };
}
