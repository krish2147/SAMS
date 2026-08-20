import Razorpay from "razorpay";
import crypto from "crypto";
import { getDbPool, isMockDatabase } from "../config/db";
import { ActivityService } from "./activity.service";
import { sendEventNotification } from "./communication.service";
import { PdfInvoiceService } from "./pdf-invoice.service";
import { sendPaymentReminder } from "./whatsapp.service";
import { enqueuePaymentWhatsApp } from "./notification-worker.service";

let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      const err: any = new Error("Razorpay credentials are not configured on the server.");
      err.status = 503;
      throw err;
    }
    razorpayInstance = new Razorpay({ key_id, key_secret });
  }
  return razorpayInstance;
}

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

/**
 * Standardize status values to strictly allowed set: Pending, Paid, Failed, Refunded, Cancelled
 */
function standardizeStatus(status: string | null | undefined): "Pending" | "Paid" | "Failed" | "Refunded" | "Cancelled" {
  if (!status) return "Pending";
  const s = status.trim().toLowerCase();
  if (s === "paid" || s === "success" || s === "successful" || s === "completed" || s === "captured") {
    return "Paid";
  }
  if (s === "refunded" || s === "refund_processed") {
    return "Refunded";
  }
  if (s === "failed" || s === "failure") {
    return "Failed";
  }
  if (s === "cancelled" || s === "canceled") {
    return "Cancelled";
  }
  return "Pending";
}

export class PaymentService {
  /**
   * Helper: Generate sequential, non-repeating Receipt or Invoice numbers
   * Example: BSF-REC-2026-000001, BSF-INV-2026-000001
   */
  async generateSequentialNumber(type: "REC" | "INV"): Promise<string> {
    const pool = await getDbPool();
    const year = new Date().getFullYear();
    const prefix = `BSF-${type}-${year}-`;

    try {
      const column = type === "REC" ? "receipt_no" : "invoice_no";
      const [rows]: any = await pool.query(
        `SELECT COUNT(*) as count FROM payments WHERE ${column} LIKE ?`,
        [`${prefix}%`]
      );
      const count = Number(rows[0]?.count || 0) + 1;
      return `${prefix}${String(count).padStart(6, "0")}`;
    } catch (_) {
      return `${prefix}${String(Math.floor(100000 + Math.random() * 900000))}`;
    }
  }

  /**
   * Helper: Calculate membership expiry and renewal dates
   * Extends existing expiry date if member is currently active and unexpired.
   */
  calculateExpiryDates(currentExpiry: string | Date | null | undefined, durationMonths: number = 1) {
    const now = new Date();
    let baseDate = now;

    if (currentExpiry) {
      const parsed = new Date(currentExpiry);
      if (!isNaN(parsed.getTime()) && parsed > now) {
        baseDate = parsed; // Extend from current active expiry
      }
    }

    const startDate = new Date(now);
    const expiryDate = new Date(baseDate);
    expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

    const startDateStr = startDate.toISOString().split("T")[0];
    const expiryDateStr = expiryDate.toISOString().split("T")[0];

    return {
      startDateStr,
      expiryDateStr
    };
  }

  /**
   * Helper: Server-side payable amount calculation.
   * Never trusts unverified amounts from client payloads when plan exists.
   */
  async calculatePayableAmount(
    planId: number | null | undefined,
    paymentType: "Registration" | "Renewal" | "Standard" = "Registration",
    payloadAmount?: number
  ) {
    const pool = await getDbPool();
    let regFee = 0;
    let renFee = 0;
    let planName = "Standard Plan";
    let durationMonths = 1;

    if (planId) {
      try {
        const [planRows]: any = await pool.query("SELECT * FROM membership_plans WHERE id = ?", [planId]);
        const plan = planRows[0];
        if (plan) {
          planName = plan.name || plan.plan_name || planName;
          durationMonths = Number(plan.duration_months || 1);

          if (paymentType === "Registration") {
            regFee = Number(plan.registration_fee || 500);
            renFee = Number(plan.renewal_fee || 1000);
          } else if (paymentType === "Renewal") {
            regFee = 0;
            renFee = Number(plan.renewal_fee || 1000);
          } else {
            regFee = Number(plan.registration_fee || 0);
            renFee = Number(plan.renewal_fee || 1000);
          }
        }
      } catch (err) {
        console.warn("Could not fetch plan pricing, falling back:", err);
      }
    }

    let totalAmount = regFee + renFee;
    if (totalAmount <= 0) {
      totalAmount = Number(payloadAmount || 120);
    }

    return {
      totalAmount: Math.max(1, totalAmount), // INR
      registrationFee: regFee,
      renewalFee: renFee,
      planName,
      durationMonths
    };
  }

  /**
   * Get overall payments summary statistics and full transaction list
   */
  async getDashboardData(filters?: {
    dateFilter?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    status?: string;
  }) {
    const pool = await getDbPool();

    // 1. Fetch all raw transactions with joined member and plan details
    const [rows]: any = await pool.query(`
      SELECT 
        p.id, 
        p.member_id, 
        p.membership_plan_id, 
        p.payment_type, 
        p.amount, 
        p.registration_fee, 
        p.renewal_fee, 
        p.payment_status, 
        p.payment_method, 
        p.razorpay_order_id, 
        p.razorpay_payment_id, 
        p.razorpay_signature, 
        p.failure_reason, 
        p.approved_by, 
        p.receipt_no, 
        p.invoice_no, 
        p.invoice_path,
        p.invoice_url,
        p.generated_at,
        p.refund_amount, 
        p.refund_status, 
        p.refund_date, 
        p.refund_txn_id, 
        p.gateway_response, 
        COALESCE(p.payment_date, p.created_at) as payment_date, 
        p.created_at, 
        m.fullName as member_name, 
        m.membershipNo, 
        m.mobileNo, 
        m.email, 
        m.addressLine1,
        pl.name as plan_name
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      LEFT JOIN membership_plans pl ON p.membership_plan_id = pl.id
      ORDER BY p.id DESC
    `);

    let transactions = (rows || []).map((t: any) => {
      const status = standardizeStatus(t.payment_status);
      return {
        id: Number(t.id),
        memberId: t.member_id,
        memberName: t.member_name || "Guest Swimmer",
        membershipNo: t.membershipNo || "N/A",
        mobileNo: t.mobileNo || "N/A",
        email: t.email || "",
        address: t.addressLine1 || "",
        planName: t.plan_name || "Standard Membership Plan",
        paymentType: t.payment_type || "Registration",
        amount: Number(t.amount || 0),
        registrationFee: Number(t.registration_fee || 0),
        renewalFee: Number(t.renewal_fee || 0),
        paymentMethod: t.payment_method || "Razorpay",
        transactionId: t.razorpay_payment_id || `TXN-${t.id}`,
        orderId: t.razorpay_order_id || `ORD-${t.id}`,
        status,
        paymentDate: t.payment_date || t.created_at,
        createdAt: t.created_at,
        approvedBy: t.approved_by || "System Admin",
        receiptNo: t.receipt_no || `BSF-REC-2026-${String(t.id).padStart(6, "0")}`,
        invoiceNo: t.invoice_no || `BSF-INV-2026-${String(t.id).padStart(6, "0")}`,
        invoicePath: t.invoice_path || null,
        invoiceUrl: t.invoice_url || null,
        generatedAt: t.generated_at || null,
        failureReason: t.failure_reason || null,
        gatewayResponse: t.gateway_response || null,
        refundAmount: Number(t.refund_amount || 0),
        refundStatus: t.refund_status || null,
        refundDate: t.refund_date || null,
        refundTxnId: t.refund_txn_id || null
      };
    });

    // 2. Compute Overall Summary Statistics
    let totalRevenue = 0;
    let todaysRevenue = 0;
    let monthlyRevenue = 0;
    let yearlyRevenue = 0;
    let pendingPaymentsCount = 0;
    let pendingPaymentsSum = 0;
    let successfulPaymentsCount = 0;
    let failedPaymentsCount = 0;
    let refundsTotal = 0;
    let renewalPaymentsTotal = 0;
    let registrationRevenueTotal = 0;

    const now = new Date();
    const todayStr = now.toDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    transactions.forEach((tx: any) => {
      const isPaid = tx.status === "Paid";
      const txDate = new Date(tx.paymentDate || tx.createdAt);
      const isToday = !isNaN(txDate.getTime()) && txDate.toDateString() === todayStr;
      const isThisMonth = !isNaN(txDate.getTime()) && txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      const isThisYear = !isNaN(txDate.getTime()) && txDate.getFullYear() === currentYear;

      if (isPaid) {
        totalRevenue += tx.amount;
        successfulPaymentsCount += 1;
        if (isToday) todaysRevenue += tx.amount;
        if (isThisMonth) monthlyRevenue += tx.amount;
        if (isThisYear) yearlyRevenue += tx.amount;
        if (tx.paymentType === "Renewal") renewalPaymentsTotal += tx.amount;
        if (tx.paymentType === "Registration") registrationRevenueTotal += tx.amount;
      } else if (tx.status === "Pending") {
        pendingPaymentsCount += 1;
        pendingPaymentsSum += tx.amount;
      } else if (tx.status === "Failed") {
        failedPaymentsCount += 1;
      }

      if (tx.status === "Refunded" || tx.refundAmount > 0) {
        refundsTotal += tx.refundAmount || tx.amount;
      }
    });

    const [pendingMembers]: any = await pool.query(
      "SELECT COUNT(*) as count FROM members WHERE registration_status = 'Approved' AND payment_status = 'Pending'"
    );
    const approvedPendingMembersCount = Number(pendingMembers[0]?.count || 0);

    // Filter transactions if filters are provided
    if (filters) {
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        transactions = transactions.filter((tx: any) =>
          tx.memberName.toLowerCase().includes(q) ||
          tx.membershipNo.toLowerCase().includes(q) ||
          tx.mobileNo.toLowerCase().includes(q) ||
          tx.transactionId.toLowerCase().includes(q) ||
          tx.orderId.toLowerCase().includes(q)
        );
      }

      if (filters.status && filters.status !== "All") {
        const reqStatus = standardizeStatus(filters.status);
        transactions = transactions.filter((tx: any) => tx.status === reqStatus);
      }

      if (filters.dateFilter) {
        if (filters.dateFilter === "Today") {
          transactions = transactions.filter((tx: any) => {
            const d = new Date(tx.paymentDate);
            return !isNaN(d.getTime()) && d.toDateString() === todayStr;
          });
        } else if (filters.dateFilter === "This Week") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          transactions = transactions.filter((tx: any) => {
            const d = new Date(tx.paymentDate);
            return !isNaN(d.getTime()) && d >= sevenDaysAgo && d <= now;
          });
        } else if (filters.dateFilter === "This Month") {
          transactions = transactions.filter((tx: any) => {
            const d = new Date(tx.paymentDate);
            return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          });
        } else if (filters.dateFilter === "Custom" && (filters.startDate || filters.endDate)) {
          const start = filters.startDate ? new Date(filters.startDate) : new Date(0);
          const end = filters.endDate ? new Date(filters.endDate) : new Date();
          end.setHours(23, 59, 59, 999);
          transactions = transactions.filter((tx: any) => {
            const d = new Date(tx.paymentDate);
            return !isNaN(d.getTime()) && d >= start && d <= end;
          });
        }
      }
    }

    return {
      summary: {
        totalRevenue,
        todaysRevenue,
        monthlyRevenue,
        yearlyRevenue,
        pendingPaymentsCount: pendingPaymentsCount + approvedPendingMembersCount,
        pendingPaymentsSum,
        successfulPaymentsCount,
        failedPaymentsCount,
        refundsTotal,
        renewalPaymentsTotal,
        registrationRevenueTotal
      },
      transactions
    };
  }

  /**
   * Create Razorpay Order with server amount calculation and duplicate pending check
   */
  async createRazorpayOrder(payload: {
    memberId: number;
    membershipNo?: string;
    paymentType?: "Registration" | "Renewal" | "Standard";
    amount?: number;
    registrationFee?: number;
    renewalFee?: number;
    approvedBy?: string;
  }) {
    const pool = await getDbPool();
    const razorpay = getRazorpay();

    // 1. Fetch member details
    const [memberRows]: any = await pool.query(
      "SELECT * FROM members WHERE id = ? OR membershipNo = ?",
      [payload.memberId || 0, payload.membershipNo || ""]
    );
    const member = memberRows[0];
    if (!member) {
      throw new Error(`Member with ID or MembershipNo ${payload.membershipNo || payload.memberId} not found.`);
    }

    const paymentType = payload.paymentType || "Registration";

    // 2. Check duplicate protection: Reuse existing pending order if available
    const [existingPending]: any = await pool.query(
      `SELECT * FROM payments 
       WHERE member_id = ? AND payment_status = 'Pending' AND razorpay_order_id IS NOT NULL 
       ORDER BY id DESC LIMIT 1`,
      [member.id]
    );

    if (existingPending[0]) {
      const p = existingPending[0];
      const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
      const appBaseUrl = (process.env.APP_BASE_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
      const paymentLinkUrl = p.payment_link_url || `${appBaseUrl}/pay?order_id=${p.razorpay_order_id}&member=${member.membershipNo || member.id}`;
      return {
        success: true,
        reused: true,
        paymentId: p.id,
        orderId: p.razorpay_order_id,
        paymentLink: paymentLinkUrl,
        payment_link_url: paymentLinkUrl,
        amount: Number(p.amount),
        currency: "INR",
        razorpayKeyId: keyId,
        memberName: member.fullName,
        membershipNo: member.membershipNo,
        mobileNo: member.mobileNo,
        email: member.email || "",
        receiptNo: p.receipt_no,
        invoiceNo: p.invoice_no
      };
    }

    // 3. Server-Decided Pricing calculation
    const pricing = await this.calculatePayableAmount(member.membership_plan_id, paymentType, payload.amount);
    const amountInINR = pricing.totalAmount;
    const amountInPaise = Math.round(amountInINR * 100);

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;

    // 4. Generate Razorpay Order
    let rzpOrder: any = null;
    try {
      if (razorpay && razorpay.orders && typeof razorpay.orders.create === "function") {
        rzpOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: "INR",
          receipt: `BSF_${paymentType.toUpperCase()}_${Date.now()}`,
          notes: {
            member_id: String(member?.id || ""),
            membership_no: member?.membershipNo || "",
            member_name: member?.fullName || "Member",
            payment_type: paymentType
          }
        });
      }
    } catch (rzpErr: any) {
      const err: any = new Error(`Razorpay order creation failed: ${rzpErr?.message || "Gateway unavailable"}`);
      err.status = 502;
      throw err;
    }

    if (!rzpOrder?.id) {
      const err: any = new Error("Razorpay did not return a valid order ID.");
      err.status = 502;
      throw err;
    }

    const orderId = rzpOrder?.id || `order_${Math.random().toString(36).substring(2, 14)}`;

    // 5. Generate sequential receipt and invoice numbers
    const receiptNo = await this.generateSequentialNumber("REC");
    const invoiceNo = await this.generateSequentialNumber("INV");

    // 6. Generate real payment URL using configured APP_BASE_URL
    const appBaseUrl = (process.env.APP_BASE_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
    const memberIdentifier = member?.membershipNo || member?.id || "member";
    const paymentLinkUrl = `${appBaseUrl}/pay?order_id=${encodeURIComponent(orderId)}&member=${encodeURIComponent(String(memberIdentifier))}`;

    // 7. Save pending payment record in payments table with payment_link_url
    let paymentId: number;
    try {
      const [insertResult]: any = await pool.query(
        `INSERT INTO payments 
        (member_id, registration_id, membership_plan_id, payment_type, amount, registration_fee, renewal_fee, payment_status, payment_method, razorpay_order_id, payment_link_url, approved_by, receipt_no, invoice_no) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          member?.id || 1,
          member?.registration_id || member?.id || 1,
          member?.membership_plan_id || 1,
          paymentType,
          amountInINR,
          pricing.registrationFee,
          pricing.renewalFee,
          "Pending",
          "Razorpay",
          orderId,
          paymentLinkUrl,
          payload.approvedBy || "System Admin",
          receiptNo,
          invoiceNo
        ]
      );
      paymentId = insertResult?.insertId || insertResult?.[0]?.insertId || 1;
    } catch (insertErr) {
      console.error("Payment row insert error:", insertErr);
      // Fallback query if table has fewer columns
      try {
        const [fallbackInsert]: any = await pool.query(
          `INSERT INTO payments 
          (member_id, membership_plan_id, payment_type, amount, registration_fee, renewal_fee, payment_status, payment_method, razorpay_order_id, approved_by, receipt_no, invoice_no) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            member?.id || 1,
            member?.membership_plan_id || 1,
            paymentType,
            amountInINR,
            pricing.registrationFee,
            pricing.renewalFee,
            "Pending",
            "Razorpay",
            orderId,
            payload.approvedBy || "System Admin",
            receiptNo,
            invoiceNo
          ]
        );
        paymentId = fallbackInsert?.insertId || fallbackInsert?.[0]?.insertId || 1;
      } catch (fbErr) {
        console.error("Fallback insert error:", fbErr);
        const err: any = new Error("The Razorpay order was created, but its payment record could not be saved. Do not send this payment link; retry after checking the database.");
        err.status = 500;
        throw err;
      }
    }

    await ActivityService.logActivity(
      member?.fullName || "Member",
      `Razorpay Payment Order Created (${orderId}) for ₹${amountInINR}`,
      "Payment Link Generated",
      payload.approvedBy || "Admin"
    );

    return {
      success: true,
      paymentId,
      orderId: orderId,
      paymentLink: paymentLinkUrl,
      payment_link_url: paymentLinkUrl,
      amount: amountInINR,
      currency: "INR",
      razorpayKeyId: keyId,
      memberName: member?.fullName || "Member",
      membershipNo: member?.membershipNo || "",
      mobileNo: member?.mobileNo || "",
      email: member?.email || "",
      receiptNo,
      invoiceNo
    };
  }

  /**
   * Create standard Razorpay Order Endpoint Handler
   */
  async createStandardOrder(payload: {
    amount: number; // in paise
    currency?: string;
    receipt?: string;
    notes?: any;
    memberId?: number;
    membershipNo?: string;
  }) {
    const razorpay = getRazorpay();
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;

    const amountInPaise = Number(payload.amount);
    if (isNaN(amountInPaise) || amountInPaise < 100) {
      const err: any = new Error("Amount must be at least 100 paise (₹1).");
      err.status = 400;
      throw err;
    }

    const currency = payload.currency || "INR";
    const receipt = payload.receipt || `receipt_${Date.now()}`;

    let rzpOrder: any;
    try {
      rzpOrder = await razorpay.orders.create({
        amount: Math.round(amountInPaise),
        currency,
        receipt,
        notes: payload.notes || {}
      });
    } catch (apiErr: any) {
      const err: any = new Error(`Razorpay order creation failed: ${apiErr.message || "Gateway unavailable"}`);
      err.status = 502;
      throw err;
    }

    if (payload.memberId || payload.membershipNo) {
      try {
        const pool = await getDbPool();
        const [memberRows]: any = await pool.query("SELECT id, membership_plan_id FROM members WHERE id = ? OR membershipNo = ?", [
          payload.memberId || 0,
          payload.membershipNo || ""
        ]);
        if (memberRows[0]) {
          const amountInINR = Math.round(amountInPaise / 100);
          const receiptNo = await this.generateSequentialNumber("REC");
          const invoiceNo = await this.generateSequentialNumber("INV");

          await pool.query(
            `INSERT INTO payments 
            (member_id, membership_plan_id, payment_type, amount, registration_fee, renewal_fee, payment_status, payment_method, razorpay_order_id, approved_by, receipt_no, invoice_no) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              memberRows[0].id,
              memberRows[0].membership_plan_id || 1,
              "Standard",
              amountInINR,
              amountInINR,
              0,
              "Pending",
              "Razorpay",
              rzpOrder?.id || `order_${Date.now()}`,
              "Razorpay Gateway",
              receiptNo,
              invoiceNo
            ]
          );
        }
      } catch (dbErr) {
        console.warn("Optional payment log insert skipped/failed:", dbErr);
      }
    }

    return {
      success: true,
      order_id: rzpOrder.id,
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency || "INR",
      receipt: rzpOrder.receipt,
      key_id: keyId,
      keyId: keyId
    };
  }

  /**
   * Transaction-Safe & Idempotent Razorpay Payment Verification
   * Updates payments -> Paid, members -> Active, login_enabled -> 1, calculates start/end expiry dates
   */
  async verifyPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature?: string;
    memberId?: number;
    paymentId?: number;
    approvedBy?: string;
  }) {
    if (!payload.razorpay_order_id || !payload.razorpay_payment_id) {
      const err: any = new Error("Missing required payment verification fields: razorpay_order_id and razorpay_payment_id are required.");
      err.status = 400;
      throw err;
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      const err: any = new Error("Razorpay verification secret is not configured.");
      err.status = 503;
      throw err;
    }

    // 1. Verify HMAC-SHA256 signature
    if (!payload.razorpay_signature) {
      const err: any = new Error("Razorpay payment signature is required.");
      err.status = 400;
      throw err;
    }
    if (payload.razorpay_signature !== "verified_webhook") {
      const generated_signature = crypto
        .createHmac("sha256", secret)
        .update(payload.razorpay_order_id + "|" + payload.razorpay_payment_id)
        .digest("hex");

      if (!signaturesMatch(generated_signature, payload.razorpay_signature)) {
        const err: any = new Error("Invalid Razorpay payment signature. Verification failed.");
        err.status = 400;
        throw err;
      }
    }

    const pool = await getDbPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 2. Fetch target payment row inside transaction
      let payment: any = null;
      const rowLock = isMockDatabase() ? "" : " FOR UPDATE";
      if (payload.paymentId) {
        const [pRows]: any = await conn.query(`SELECT * FROM payments WHERE id = ?${rowLock}`, [payload.paymentId]);
        payment = pRows[0];
      }
      if (!payment && payload.razorpay_order_id) {
        const [pRows]: any = await conn.query(`SELECT * FROM payments WHERE razorpay_order_id = ?${rowLock}`, [payload.razorpay_order_id]);
        payment = pRows[0];
      }
      if (!payment && payload.memberId) {
        const [pRows]: any = await conn.query(`SELECT * FROM payments WHERE member_id = ? ORDER BY id DESC LIMIT 1${rowLock}`, [payload.memberId]);
        payment = pRows[0];
      }

      if (!payment) {
        const err: any = new Error("No local payment record exists for this Razorpay order.");
        err.status = 404;
        throw err;
      }

      // IDEMPOTENCY CHECK: If already paid, return existing verified response without duplicating side-effects
      if (standardizeStatus(payment.payment_status) === "Paid") {
        await conn.commit();
        return {
          success: true,
          idempotent: true,
          message: "Payment already verified and completed previously.",
          paymentId: payment.id,
          amount: Number(payment.amount),
          status: "Paid",
          transactionId: payment.razorpay_payment_id || payload.razorpay_payment_id,
          receiptNo: payment.receipt_no,
          invoiceNo: payment.invoice_no
        };
      }

      // 3. Sequential Receipt & Invoice Number Assignment
      const receiptNo = payment.receipt_no || (await this.generateSequentialNumber("REC"));
      const invoiceNo = payment.invoice_no || (await this.generateSequentialNumber("INV"));

      const gatewayResp = JSON.stringify({
        razorpay_order_id: payload.razorpay_order_id,
        razorpay_payment_id: payload.razorpay_payment_id,
        status: "captured",
        timestamp: new Date().toISOString()
      });

      // Update Payments row
      await conn.query(
        `UPDATE payments SET 
          payment_status = 'Paid',
          razorpay_payment_id = ?,
          razorpay_signature = ?,
          gateway_response = ?,
          receipt_no = ?,
          invoice_no = ?,
          payment_date = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          payload.razorpay_payment_id,
          payload.razorpay_signature || "verified_sha256",
          gatewayResp,
          receiptNo,
          invoiceNo,
          payment.id
        ]
      );

      // 4. Fetch Member and Calculate Membership Start/End Expiry Dates
      const [memberRows]: any = await conn.query("SELECT * FROM members WHERE id = ?", [payment.member_id]);
      const member = memberRows[0];

      let startDateStr = new Date().toISOString().split("T")[0];
      let expiryDateStr = startDateStr;

      if (member) {
        let durationMonths = 1;
        if (payment.membership_plan_id) {
          const [planRows]: any = await conn.query("SELECT duration_months FROM membership_plans WHERE id = ?", [payment.membership_plan_id]);
          if (planRows[0] && planRows[0].duration_months) {
            durationMonths = Number(planRows[0].duration_months);
          }
        }

        const dateRange = this.calculateExpiryDates(member.membership_end_date, durationMonths);
        startDateStr = dateRange.startDateStr;
        expiryDateStr = dateRange.expiryDateStr;

        // Update Member Row
        await conn.query(
          `UPDATE members SET 
            payment_status = 'Paid',
            registration_status = 'Approved',
            membership_status = 'Active',
            login_enabled = 1,
            amountPaid = ?,
            paymentMethod = 'Razorpay',
            paymentDate = CURRENT_TIMESTAMP,
            txnId = ?,
            membership_start_date = ?,
            membership_end_date = ?,
            next_renewal_date = ?,
            last_payment_id = ?
          WHERE id = ?`,
          [
            payment.amount,
            payload.razorpay_payment_id,
            startDateStr,
            expiryDateStr,
            expiryDateStr,
            payment.id,
            member.id
          ]
        );

        // Insert Renewal Row if Renewal payment (Check duplicate)
        if (payment.payment_type === "Renewal") {
          const [existingRen]: any = await conn.query("SELECT id FROM renewals WHERE payment_id = ?", [payment.id]);
          if (!existingRen[0]) {
            await conn.query(
              "INSERT INTO renewals (member_id, due_date, amount, status, payment_id) VALUES (?, ?, ?, 'Completed', ?)",
              [member.id, expiryDateStr, payment.amount, payment.id]
            );
          }
        }

        // Log Activity
        await conn.query(
          "INSERT INTO activities (userName, action, status, performedBy) VALUES (?, ?, 'Payment Successful', ?)",
          [
            member.fullName,
            `Payment Verified (₹${payment.amount} via Razorpay) - Membership Activated until ${expiryDateStr}`,
            payload.approvedBy || "Razorpay Gateway"
          ]
        );

        // Create Notification Record
        await conn.query(
          "INSERT INTO notifications (member_id, title, message, type) VALUES (?, ?, ?, 'Payment Success')",
          [
            member.id,
            "Payment Confirmed",
            `Your payment of ₹${payment.amount} (Receipt #${receiptNo}) was verified. Membership active until ${expiryDateStr}.`
          ]
        );
      }

      await conn.commit();

      // Trigger Auto Invoice Generation & WhatsApp/Email Dispatch
      let generatedInvoiceUrl = "";
      try {
        const { pdfResult, invoiceNo: invNo } = await this.ensureAndGetInvoicePDF(
          payment.id,
          payload.approvedBy || "Razorpay Gateway"
        );
        generatedInvoiceUrl = pdfResult.fileUrl;

        if (member) {
          const invoiceVars = {
            membershipNo: member.membershipNo,
            amount: payment.amount,
            receiptNo: receiptNo,
            invoiceUrl: pdfResult.fileUrl,
            attachments: [
              {
                filename: `${invNo}.pdf`,
                ...(pdfResult.filePath ? { path: pdfResult.filePath } : { content: pdfResult.pdfBuffer })
              }
            ]
          };

          // Send Invoice Notification (WhatsApp, Email, SMS)
          sendEventNotification("invoice_generated", {
            id: member.id,
            memberName: member.fullName,
            mobileNo: member.mobileNo,
            email: member.email
          }, invoiceVars, payload.approvedBy || "Razorpay Gateway").catch(err => console.error("Invoice dispatch notification error:", err));

          ActivityService.logActivity(
            member.fullName,
            `Invoice (${invNo}) Sent via WhatsApp to ${member.mobileNo || "N/A"}`,
            "Invoice Sent via WhatsApp",
            payload.approvedBy || "System Trigger"
          ).catch(() => {});

          if (member.email) {
            ActivityService.logActivity(
              member.fullName,
              `Invoice (${invNo}) Sent via Email to ${member.email}`,
              "Invoice Sent via Email",
              payload.approvedBy || "System Trigger"
            ).catch(() => {});
          }
        }
      } catch (invErr: any) {
        console.error("Auto Invoice generation error in verifyPayment:", invErr.message);
      }

      // Trigger Dispatch Notifications
      if (member) {
        sendEventNotification("payment_successful", {
          id: member.id,
          memberName: member.fullName,
          mobileNo: member.mobileNo,
          email: member.email
        }, {
          membershipNo: member.membershipNo,
          amount: payment.amount,
          receiptNo: receiptNo,
          invoiceUrl: generatedInvoiceUrl
        }).catch(err => console.error("Payment verify notification error:", err));

        sendEventNotification("membership_activated", {
          id: member.id,
          memberName: member.fullName,
          mobileNo: member.mobileNo,
          email: member.email
        }, {
          membershipNo: member.membershipNo,
          batch: member.batchTiming || "Standard Morning Batch",
          expiryDate: expiryDateStr
        }).catch(err => console.error("Activation verify notification error:", err));
      }

      return {
        success: true,
        paymentId: payment.id,
        amount: Number(payment.amount),
        status: "Paid",
        transactionId: payload.razorpay_payment_id,
        receiptNo,
        invoiceNo,
        membershipStartDate: startDateStr,
        membershipEndDate: expiryDateStr,
        nextRenewalDate: expiryDateStr
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Process Razorpay Webhooks safely and idempotently
   */
  async handleWebhook(rawBody: string, signature: string | undefined) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret || !signature) {
      const err: any = new Error("Razorpay webhook secret or signature is missing.");
      err.status = 400;
      throw err;
    }

    // Verify webhook signature
    if (signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (!signaturesMatch(expectedSignature, signature)) {
        const err: any = new Error("Invalid Razorpay webhook signature.");
        err.status = 400;
        throw err;
      }
    }

    let eventPayload: any;
    try {
      eventPayload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    } catch (err) {
      throw new Error("Invalid JSON webhook payload.");
    }

    const event = eventPayload.event;
    console.log(`🔔 Razorpay Webhook Event Received: [${event}]`);

    const pool = await getDbPool();

    if (event === "payment.captured") {
      const pEntity = eventPayload.payload?.payment?.entity;
      if (pEntity) {
        const orderId = pEntity.order_id;
        const paymentId = pEntity.id;

        await ActivityService.logActivity(
          "Webhook Service",
          `Webhook Event Received: payment.captured (${paymentId})`,
          "Webhook Received",
          "Razorpay Webhook"
        );

        return await this.verifyPayment({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: "verified_webhook",
          approvedBy: "Razorpay Webhook"
        });
      }
    } else if (event === "payment.failed") {
      const pEntity = eventPayload.payload?.payment?.entity;
      if (pEntity) {
        const orderId = pEntity.order_id;
        const paymentId = pEntity.id;
        const reason = pEntity.error_description || pEntity.error_reason || "Payment transaction failed at Razorpay gateway.";

        await pool.query(
          `UPDATE payments SET payment_status = 'Failed', failure_reason = ?, razorpay_payment_id = ? WHERE razorpay_order_id = ?`,
          [reason, paymentId, orderId]
        );

        const [pRows]: any = await pool.query("SELECT * FROM payments WHERE razorpay_order_id = ?", [orderId]);
        if (pRows[0]) {
          const [mRows]: any = await pool.query("SELECT * FROM members WHERE id = ?", [pRows[0].member_id]);
          if (mRows[0]) {
            sendEventNotification("payment_failed", {
              id: mRows[0].id,
              memberName: mRows[0].fullName,
              mobileNo: mRows[0].mobileNo,
              email: mRows[0].email
            }, {
              membershipNo: mRows[0].membershipNo,
              amount: pRows[0].amount,
              reason,
              paymentLink: `${process.env.APP_URL || "http://localhost:3000"}/pay?order_id=${orderId}`
            }).catch(err => console.error("Payment failed webhook notification error:", err));
          }
        }

        await ActivityService.logActivity(
          "Razorpay Gateway",
          `Payment Failed for Order ${orderId}: ${reason}`,
          "Payment Failed",
          "Razorpay Webhook"
        );

        return { success: true, event, status: "Failed", reason };
      }
    } else if (event === "refund.processed") {
      const rEntity = eventPayload.payload?.refund?.entity;
      if (rEntity) {
        const paymentId = rEntity.payment_id;
        const refundTxnId = rEntity.id;
        const refundAmount = Number(rEntity.amount || 0) / 100;

        const [pRows]: any = await pool.query("SELECT * FROM payments WHERE razorpay_payment_id = ?", [paymentId]);
        if (pRows[0]) {
          await this.processRefund({
            paymentId: pRows[0].id,
            refundAmount,
            reason: rEntity.notes?.reason || "Refund processed via Razorpay Webhook",
            approvedBy: "Razorpay Webhook",
            gatewayConfirmed: true,
            gatewayRefundId: refundTxnId
          });
        }
        return { success: true, event, status: "Refunded", refundTxnId };
      }
    }

    return { success: true, event, message: "Webhook event received and logged" };
  }

  /**
   * Send WhatsApp / Email / SMS payment link notification with duplicate pending check
   */
  async sendPaymentLink(payload: {
    paymentId?: number;
    memberId?: number;
    membershipNo?: string;
    channel?: "all" | "whatsapp" | "sms" | "email";
    approvedBy?: string;
  }) {
    const pool = await getDbPool();

    let payment: any = null;
    let member: any = null;

    if (payload.paymentId) {
      const [pRows]: any = await pool.query("SELECT * FROM payments WHERE id = ?", [payload.paymentId]);
      payment = pRows[0];
    }

    if (payload.memberId || payload.membershipNo) {
      const [mRows]: any = await pool.query("SELECT * FROM members WHERE id = ? OR membershipNo = ?", [
        payload.memberId || 0,
        payload.membershipNo || ""
      ]);
      member = mRows[0];
    }

    if (payment && !member) {
      const [mRows]: any = await pool.query("SELECT * FROM members WHERE id = ?", [payment.member_id]);
      member = mRows[0];
    }

    if (!member) {
      throw new Error("Target member could not be located.");
    }

    // Reuse existing pending order or generate a new order
    if (!payment) {
      const orderResult = await this.createRazorpayOrder({
        memberId: member.id,
        membershipNo: member.membershipNo,
        amount: Number(member.amountPaid || member.pendingAmount || 3500),
        approvedBy: payload.approvedBy
      });

      try {
        const [pRows]: any = await pool.query("SELECT * FROM payments WHERE id = ?", [orderResult.paymentId]);
        if (pRows && pRows.length > 0) {
          payment = pRows[0];
        }
      } catch (err) {
        console.warn("Could not query payment row by id, using orderResult:", err);
      }

      if (!payment) {
        payment = {
          id: orderResult.paymentId,
          razorpay_order_id: orderResult.orderId,
          payment_link_url: orderResult.paymentLink || orderResult.payment_link_url,
          amount: orderResult.amount,
          member_id: member.id
        };
      }
    }

    const appBaseUrl = (process.env.APP_BASE_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
    let paymentLink = payment.payment_link_url;
    if (!paymentLink) {
      paymentLink = `${appBaseUrl}/pay?order_id=${payment.razorpay_order_id}&member=${member.membershipNo || member.id}`;
      try {
        await pool.query("UPDATE payments SET payment_link_url = ? WHERE id = ?", [paymentLink, payment.id]);
        payment.payment_link_url = paymentLink;
      } catch (updErr) {
        console.warn("Notice: payment_link_url update error:", updErr);
      }
    }

    const messageText = `Dear ${member.fullName}, your Baroda Swim Front membership fee of ₹${payment.amount} is due. Please complete payment using this secure Razorpay link: ${paymentLink}`;

    // 1. Existing MSG91 WhatsApp Function Called
    const targetPhone = member.mobileNo || member.whatsappNumber || member.mobile || member.emergencyContactNumber || "";
    let whatsappResponse: any = null;
    let whatsappStatus = "Pending";

    if (targetPhone) {
      try {
        whatsappResponse = await sendPaymentReminder(
          targetPhone,
          member.fullName || "Member",
          payment.amount,
          paymentLink
        );
        whatsappStatus = "Delivered";
      } catch (waErr: any) {
        whatsappStatus = "Failed";
        console.error("[PaymentService] WhatsApp reminder dispatch error:", waErr?.response?.data || waErr?.message || waErr);
        try {
          await enqueuePaymentWhatsApp(payment.id, {
            phoneNumber: targetPhone,
            customerName: member.fullName || "Member",
            amount: payment.amount,
            paymentLink
          });
          if (!isMockDatabase()) whatsappStatus = "Queued";
        } catch (queueErr) {
          console.error("[PaymentService] Could not queue WhatsApp retry:", queueErr);
        }
      }
    }

    try {
      await pool.query(
        "INSERT INTO notifications (member_id, title, message, type) VALUES (?, ?, ?, 'Payment Link')",
        [member.id, "Payment Link Request", messageText]
      );

      // Approval explicitly requests WhatsApp. Avoid sending a second copy via
      // the generic multi-channel dispatcher after the MSG91 template above.
      if (!payload.channel || payload.channel === "all" || payload.channel === "sms" || payload.channel === "email") {
        sendEventNotification("payment_link", {
          id: member.id,
          memberName: member.fullName,
          mobileNo: payload.channel === "email" ? undefined : member.mobileNo,
          email: payload.channel === "sms" ? undefined : member.email
        }, {
          membershipNo: member.membershipNo,
          amount: payment.amount,
          paymentLink
        }).catch(err => console.error("Payment link notification error:", err));
      }
    } catch (_) {}

    await ActivityService.logActivity(
      member.fullName,
      `Payment Link Generated (${payment.razorpay_order_id}) & sent to ${targetPhone || member.mobileNo}`,
      "Payment Link Generated",
      payload.approvedBy || "Admin"
    );

    return {
      success: true,
      paymentId: payment.id,
      paymentLink,
      payment_link_url: paymentLink,
      orderId: payment.razorpay_order_id,
      amount: payment.amount,
      memberName: member.fullName,
      mobileNo: targetPhone || member.mobileNo,
      email: member.email || "",
      whatsappStatus,
      whatsappResponse,
      deliveredChannels: whatsappStatus === "Delivered" ? ["WhatsApp"] : []
    };
  }

  /**
   * Process Refund inside Transaction
   */
  async processRefund(payload: {
    paymentId: number;
    refundAmount?: number;
    reason?: string;
    approvedBy: string;
    gatewayConfirmed?: boolean;
    gatewayRefundId?: string;
  }) {
    const pool = await getDbPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const rowLock = isMockDatabase() ? "" : " FOR UPDATE";
      const [pRows]: any = await conn.query(`SELECT * FROM payments WHERE id = ?${rowLock}`, [payload.paymentId]);
      const payment = pRows[0];
      if (!payment) {
        throw new Error(`Payment record with ID ${payload.paymentId} not found.`);
      }

      const status = standardizeStatus(payment.payment_status);
      if (payload.gatewayRefundId && payload.gatewayRefundId === payment.refund_txn_id) {
        await conn.commit();
        return {
          success: true,
          idempotent: true,
          refundTxnId: payment.refund_txn_id,
          refundAmount: Number(payment.refund_amount || 0),
          status: payment.refund_status || status,
          paymentId: payment.id
        };
      }
      if (status === "Refunded") {
        if (payload.gatewayRefundId && payload.gatewayRefundId !== payment.refund_txn_id) {
          await conn.query("UPDATE payments SET refund_txn_id = ? WHERE id = ?", [payload.gatewayRefundId, payment.id]);
        }
        await conn.commit();
        return {
          success: true,
          idempotent: true,
          refundTxnId: payload.gatewayRefundId || payment.refund_txn_id,
          refundAmount: Number(payment.refund_amount || 0),
          status: "Refunded",
          paymentId: payment.id
        };
      }
      if (status !== "Paid") {
        throw new Error("Only completed/paid transactions can be refunded.");
      }

      const refundAmount = Number(payload.refundAmount || payment.amount);
      if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > Number(payment.amount)) {
        const err: any = new Error("Refund amount must be greater than zero and cannot exceed the paid amount.");
        err.status = 400;
        throw err;
      }
      let refundTxnId = payload.gatewayRefundId || `RFD-${new Date().getFullYear()}-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

      // Never mark a real payment refunded locally unless Razorpay accepted it
      // or a signed webhook confirms that it was processed.
      if (!payload.gatewayConfirmed && payment.razorpay_payment_id && !payment.razorpay_payment_id.startsWith("pay_sim_")) {
        try {
          const razorpay = getRazorpay();
          const gatewayRefund: any = await razorpay.payments.refund(payment.razorpay_payment_id, {
            amount: Math.round(refundAmount * 100),
            notes: { reason: payload.reason || "Admin requested refund" }
          });
          if (!gatewayRefund?.id) throw new Error("Razorpay did not return a refund ID.");
          refundTxnId = gatewayRefund.id;
        } catch (err: any) {
          const gatewayError: any = new Error(`Razorpay refund failed: ${err.message || "Gateway unavailable"}`);
          gatewayError.status = 502;
          throw gatewayError;
        }
      }

      const isFullRefund = refundAmount >= Number(payment.amount);

      // Update payment record in database
      await conn.query(
        `UPDATE payments SET 
          payment_status = ?,
          refund_amount = ?,
          refund_status = ?,
          refund_date = CURRENT_TIMESTAMP,
          refund_txn_id = ?,
          failure_reason = ?
        WHERE id = ?`,
        [isFullRefund ? "Refunded" : "Paid", refundAmount, isFullRefund ? "Processed" : "Partially Refunded", refundTxnId, payload.reason || "Refund issued by Admin", payment.id]
      );

      // Update member status if full refund
      if (isFullRefund) {
        await conn.query(
          "UPDATE members SET membership_status = 'Inactive', payment_status = 'Refunded' WHERE id = ?",
          [payment.member_id]
        );
      }

      const [mRows]: any = await conn.query("SELECT * FROM members WHERE id = ?", [payment.member_id]);
      const member = mRows[0];

      await conn.query(
        "INSERT INTO activities (userName, action, status, performedBy) VALUES (?, ?, 'Refund Processed', ?)",
        [
          member?.fullName || "Member",
          `Refund of ₹${refundAmount} processed (Txn ${refundTxnId}). Reason: ${payload.reason || "Admin Refund"}`,
          payload.approvedBy
        ]
      );

      await conn.query(
        "INSERT INTO notifications (member_id, title, message, type) VALUES (?, ?, ?, 'Refund')",
        [
          payment.member_id,
          "Refund Processed",
          `A refund of ₹${refundAmount} has been processed for your membership (Txn ID: ${refundTxnId}).`
        ]
      );

      await conn.commit();

      if (member) {
        sendEventNotification("refund_processed", {
          id: member.id,
          memberName: member.fullName,
          mobileNo: member.mobileNo,
          email: member.email
        }, {
          membershipNo: member.membershipNo,
          amount: refundAmount,
          refundTxnId
        }).catch(err => console.error("Refund notification error:", err));
      }

      return {
        success: true,
        refundTxnId,
        refundAmount,
        status: isFullRefund ? "Refunded" : "Partially Refunded",
        paymentId: payment.id
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Retry failed payment / re-generate order
   */
  async retryPayment(paymentId: number, approvedBy: string) {
    const pool = await getDbPool();
    const [pRows]: any = await pool.query("SELECT * FROM payments WHERE id = ?", [paymentId]);
    const payment = pRows[0];
    if (!payment) {
      throw new Error("Payment record not found.");
    }

    await ActivityService.logActivity(
      "Admin Service",
      `Initiated payment retry for Payment ID ${paymentId}`,
      "Payment Retry Initiated",
      approvedBy
    );

    return await this.createRazorpayOrder({
      memberId: payment.member_id,
      paymentType: payment.payment_type || "Registration",
      amount: payment.amount,
      registrationFee: payment.registration_fee,
      renewalFee: payment.renewal_fee,
      approvedBy
    });
  }

  /**
   * Single Payment Record details
   */
  async getPaymentById(paymentId: number | string) {
    const pool = await getDbPool();
    const isNum = !isNaN(Number(paymentId));
    const [rows]: any = await pool.query(
      `SELECT 
        p.*, 
        m.fullName as member_name, 
        m.membershipNo, 
        m.mobileNo, 
        m.email, 
        m.addressLine1,
        pl.name as plan_name
      FROM payments p
      LEFT JOIN members m ON p.member_id = m.id
      LEFT JOIN membership_plans pl ON p.membership_plan_id = pl.id
      WHERE ${isNum ? "p.id = ?" : "p.razorpay_order_id = ?"}`,
      [paymentId]
    );

    if (!rows[0]) {
      throw new Error(`Payment record ${paymentId} not found.`);
    }

    const t = rows[0];
    return {
      id: Number(t.id),
      memberId: t.member_id,
      memberName: t.member_name || "Guest Swimmer",
      membershipNo: t.membershipNo || "N/A",
      mobileNo: t.mobileNo || "N/A",
      email: t.email || "",
      address: t.addressLine1 || "",
      planName: t.plan_name || "Standard Membership Plan",
      paymentType: t.payment_type || "Registration",
      amount: Number(t.amount || 0),
      registrationFee: Number(t.registration_fee || 0),
      renewalFee: Number(t.renewal_fee || 0),
      paymentMethod: t.payment_method || "Razorpay",
      transactionId: t.razorpay_payment_id || `TXN-${t.id}`,
      orderId: t.razorpay_order_id || `ORD-${t.id}`,
      status: standardizeStatus(t.payment_status),
      paymentDate: t.payment_date || t.created_at,
      createdAt: t.created_at,
      receiptNo: t.receipt_no || `BSF-REC-2026-${String(t.id).padStart(6, "0")}`,
      invoiceNo: t.invoice_no || `BSF-INV-2026-${String(t.id).padStart(6, "0")}`,
      failureReason: t.failure_reason,
      refundAmount: Number(t.refund_amount || 0),
      refundStatus: t.refund_status,
      refundDate: t.refund_date,
      refundTxnId: t.refund_txn_id
    };
  }

  /**
   * Member Payment History List
   */
  async getMemberPayments(memberId: number) {
    const pool = await getDbPool();
    const [rows]: any = await pool.query(
      `SELECT p.*, pl.name as plan_name 
       FROM payments p
       LEFT JOIN membership_plans pl ON p.membership_plan_id = pl.id
       WHERE p.member_id = ? 
       ORDER BY p.id DESC`,
      [memberId]
    );

    return (rows || []).map((t: any) => ({
      id: Number(t.id),
      memberId: t.member_id,
      planName: t.plan_name || "Standard Membership Plan",
      paymentType: t.payment_type || "Registration",
      amount: Number(t.amount || 0),
      registrationFee: Number(t.registration_fee || 0),
      renewalFee: Number(t.renewal_fee || 0),
      paymentMethod: t.payment_method || "Razorpay",
      transactionId: t.razorpay_payment_id || `TXN-${t.id}`,
      orderId: t.razorpay_order_id || `ORD-${t.id}`,
      status: standardizeStatus(t.payment_status),
      paymentDate: t.payment_date || t.created_at,
      receiptNo: t.receipt_no || `BSF-REC-2026-${String(t.id).padStart(6, "0")}`,
      invoiceNo: t.invoice_no || `BSF-INV-2026-${String(t.id).padStart(6, "0")}`
    }));
  }

  /**
   * Official Receipt Data for View / PDF Printing
   */
  async getReceiptData(paymentId: number) {
    const payment = await this.getPaymentById(paymentId);
    return {
      receiptNo: payment.receiptNo,
      invoiceNo: payment.invoiceNo,
      date: payment.paymentDate,
      memberName: payment.memberName,
      membershipNo: payment.membershipNo,
      mobileNo: payment.mobileNo,
      email: payment.email,
      planName: payment.planName,
      paymentType: payment.paymentType,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      status: payment.status,
      issuedBy: "Baroda Swim Front Academy, Vadodara"
    };
  }

  /**
   * Official Invoice Data for View / PDF Printing
   */
  async getInvoiceData(paymentId: number) {
    const payment = await this.getPaymentById(paymentId);
    return {
      invoiceNo: payment.invoiceNo,
      receiptNo: payment.receiptNo,
      invoiceDate: payment.paymentDate,
      memberName: payment.memberName,
      membershipNo: payment.membershipNo,
      address: payment.address,
      mobileNo: payment.mobileNo,
      email: payment.email,
      planName: payment.planName,
      registrationFee: payment.registrationFee,
      renewalFee: payment.renewalFee,
      totalAmount: payment.amount,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      status: payment.status,
      gstin: "24AAACB1234F1Z0",
      companyName: "Baroda Swim Front Academy"
    };
  }

  /**
   * Advanced Reports Breakdown Data
   */
  async getReportsData() {
    const { summary, transactions } = await this.getDashboardData();

    // 1. Monthly Revenue Breakdown
    const monthlyMap: { [key: string]: number } = {};
    transactions.forEach((tx: {
      status: string;
      paymentDate: string | Date;
      amount: number;
    }) => {
      if (tx.status === "Paid") {
        const d = new Date(tx.paymentDate);
        if (!isNaN(d.getTime())) {
          const monthKey = d.toLocaleString("default", { month: "short", year: "numeric" });
          monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + tx.amount;
        }
      }
    });

    const monthlyBreakdown = Object.keys(monthlyMap).map((key) => ({
      month: key,
      revenue: monthlyMap[key]
    }));

    // 2. Payment Method Breakdown
    const methodMap: { [key: string]: { amount: number; count: number } } = {};
    transactions.forEach((tx: { status: string; amount: number; paymentMethod?: string }) => {
      if (tx.status === "Paid") {
        const method = tx.paymentMethod || "Razorpay";
        if (!methodMap[method]) {
          methodMap[method] = { amount: 0, count: 0 };
        }
        methodMap[method].amount += tx.amount;
        methodMap[method].count += 1;
      }
    });

    const paymentMethodBreakdown = Object.keys(methodMap).map((key) => ({
      method: key,
      amount: methodMap[key].amount,
      count: methodMap[key].count
    }));

    // 3. Plan Revenue Breakdown
    const planMap: { [key: string]: { amount: number; count: number } } = {};
    transactions.forEach((tx: { status: string; amount: number; planName?: string }) => {
      if (tx.status === "Paid") {
        const plan = tx.planName || "Standard Plan";
        if (!planMap[plan]) {
          planMap[plan] = { amount: 0, count: 0 };
        }
        planMap[plan].amount += tx.amount;
        planMap[plan].count += 1;
      }
    });

    const membershipPlanRevenue = Object.keys(planMap).map((key) => ({
      planName: key,
      amount: planMap[key].amount,
      count: planMap[key].count
    }));

    // 4. Renewals vs Registration Breakdown
    const registrationRevenue = transactions
      .filter((t: { paymentType?: string; status?: string; amount: number }) =>
        t.paymentType === "Registration" && t.status === "Paid"
      )
      .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

    const renewalRevenue = transactions
      .filter((t: { paymentType?: string; status?: string; amount: number }) =>
        t.paymentType === "Renewal" && t.status === "Paid"
      )
      .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

    return {
      summary: {
        ...summary,
        dailyRevenue: summary.todaysRevenue,
        monthlyRevenue: summary.monthlyRevenue,
        yearlyRevenue: summary.yearlyRevenue,
        pendingPayments: summary.pendingPaymentsCount,
        failedPayments: summary.failedPaymentsCount,
        refundAmount: summary.refundsTotal,
        renewalRevenue,
        registrationRevenue
      },
      monthlyBreakdown,
      paymentMethodBreakdown,
      membershipPlanRevenue,
      typeBreakdown: {
        registrationRevenue,
        renewalRevenue
      },
      transactions
    };
  }

  /**
   * Ensures invoice PDF is generated and saved to server disk and database.
   * If PDF already exists, reuses existing file without regenerating.
   */
  async ensureAndGetInvoicePDF(paymentId: number, approvedBy: string = "System Admin") {
    const pool = await getDbPool();
    const [rows]: any = await pool.query(
      `SELECT p.*, m.fullName as member_name, m.membershipNo, m.mobileNo, m.email, m.addressLine1, pl.name as plan_name
       FROM payments p
       LEFT JOIN members m ON p.member_id = m.id
       LEFT JOIN membership_plans pl ON p.membership_plan_id = pl.id
       WHERE p.id = ?`,
      [paymentId]
    );

    const p = rows[0];
    if (!p) {
      throw new Error(`Payment record #${paymentId} not found.`);
    }

    const receiptNo = p.receipt_no || (await this.generateSequentialNumber("REC"));
    const invoiceNo = p.invoice_no || (await this.generateSequentialNumber("INV"));

    const invoiceData = {
      paymentId: p.id,
      invoiceNo,
      receiptNo,
      invoiceDate: p.payment_date || p.created_at || new Date(),
      memberName: p.member_name || "Guest Member",
      membershipNo: p.membershipNo || "BSF-MEM",
      mobileNo: p.mobileNo || "",
      email: p.email || "",
      address: p.addressLine1 || "",
      planName: p.plan_name || "Standard Membership Plan",
      paymentType: p.payment_type || "Registration",
      registrationFee: Number(p.registration_fee || 0),
      renewalFee: Number(p.renewal_fee || 0),
      totalAmount: Number(p.amount || 0),
      paymentMethod: p.payment_method || "Razorpay",
      razorpayPaymentId: p.razorpay_payment_id || `TXN-${p.id}`,
      status: p.payment_status || "Paid",
      gstin: "24AAACB1234F1Z0",
      invoicePath: p.invoice_path
    };

    const isFirstTime = !p.invoice_path || !p.generated_at;

    // Generate or retrieve existing PDF
    const pdfResult = await PdfInvoiceService.generateInvoicePDF(invoiceData);

    // Save invoice_path, invoice_url, generated_at if missing or newly generated
    if (isFirstTime || p.invoice_path !== pdfResult.filePath) {
      await pool.query(
        `UPDATE payments SET 
          receipt_no = ?,
          invoice_no = ?,
          invoice_path = ?,
          invoice_url = ?,
          generated_at = COALESCE(generated_at, CURRENT_TIMESTAMP)
        WHERE id = ?`,
        [receiptNo, invoiceNo, pdfResult.filePath, pdfResult.fileUrl, p.id]
      );

      // Log Activity "Invoice Generated"
      await ActivityService.logActivity(
        p.member_name || "Member",
        `Invoice Generated (${invoiceNo}) for ₹${p.amount}`,
        "Invoice Generated",
        approvedBy
      );
    }

    return {
      pdfResult,
      invoiceNo,
      receiptNo,
      payment: p
    };
  }

  /**
   * Resend existing invoice via WhatsApp or Email without regenerating
   */
  async resendInvoice(paymentId: number, channel: "whatsapp" | "email" | "all" = "all", sentBy: string = "Admin") {
    const { pdfResult, invoiceNo, payment } = await this.ensureAndGetInvoicePDF(paymentId, sentBy);

    const pool = await getDbPool();
    const [mRows]: any = await pool.query("SELECT * FROM members WHERE id = ?", [payment.member_id]);
    const member = mRows[0] || {
      id: payment.member_id,
      fullName: payment.member_name || "Member",
      mobileNo: payment.mobileNo || "",
      email: payment.email || ""
    };

    const customVars = {
      membershipNo: member.membershipNo || payment.membershipNo,
      amount: payment.amount,
      receiptNo: payment.receipt_no || invoiceNo,
      invoiceUrl: pdfResult.fileUrl,
      attachments: [
        {
          filename: `${invoiceNo}.pdf`,
          ...(pdfResult.filePath ? { path: pdfResult.filePath } : { content: pdfResult.pdfBuffer })
        }
      ]
    };

    let waDispatched = false;
    let emailDispatched = false;

    if (channel === "whatsapp" || channel === "all") {
      await sendEventNotification("invoice_generated", {
        id: member.id,
        memberName: member.fullName,
        mobileNo: member.mobileNo,
        email: undefined
      }, customVars, sentBy);

      await ActivityService.logActivity(
        member.fullName,
        `Invoice (${invoiceNo}) Sent via WhatsApp to ${member.mobileNo || "N/A"}`,
        "Invoice Sent via WhatsApp",
        sentBy
      );
      waDispatched = true;
    }

    if (channel === "email" || channel === "all") {
      if (member.email) {
        await sendEventNotification("invoice_generated", {
          id: member.id,
          memberName: member.fullName,
          mobileNo: undefined,
          email: member.email
        }, customVars, sentBy);

        await ActivityService.logActivity(
          member.fullName,
          `Invoice (${invoiceNo}) Sent via Email to ${member.email}`,
          "Invoice Sent via Email",
          sentBy
        );
        emailDispatched = true;
      }
    }

    return {
      success: true,
      message: `Invoice #${invoiceNo} dispatched via ${channel.toUpperCase()}`,
      invoiceNo,
      invoiceUrl: pdfResult.fileUrl,
      waDispatched,
      emailDispatched
    };
  }
}
