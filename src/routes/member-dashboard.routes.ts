import { Router, Response } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { getDbPool } from "../config/db";
import { PaymentService } from "../services/payment.service";
import type { PaymentDocumentKind } from "../services/pdf-invoice.service";
import { normalizeIndianMobile } from "../utils/phone";
import { calendarDaysBetween, calendarToday, toDateOnlyString } from "../utils/membership-date";


const router = Router();

const MEMBER_SELECT = `SELECT m.*, p.name as plan_name, p.duration_months as plan_duration,
          p.registration_fee, p.renewal_fee, p.co_charge,
          b.batch_name, b.start_time, b.end_time
   FROM members m
   LEFT JOIN membership_plans p ON m.membership_plan_id = p.id
   LEFT JOIN batches b ON m.selected_batch_id = b.id`;

// Robust helper to get the authenticated member from the session
async function getAuthenticatedMember(req: any): Promise<any> {
  if (!req.user || (req.user.role !== "member" && req.user.role !== "parent")) {
    return null;
  }
  const idOrNo = req.user.userId.replace("usr_member_", "");
  const pool = await getDbPool();

  // 1. Try search by numeric id first
  if (/^\d+$/.test(idOrNo)) {
    const [rows]: any = await pool.query(
      `${MEMBER_SELECT} WHERE m.id = ? LIMIT 1`,
      [parseInt(idOrNo, 10)]
    );
    if (rows && rows.length > 0) return rows[0];
  }

  // 2. Try search by membershipNo
  const [rowsByNo]: any = await pool.query(
    `${MEMBER_SELECT} WHERE m.membershipNo = ? LIMIT 1`,
    [idOrNo]
  );
  if (rowsByNo && rowsByNo.length > 0) return rowsByNo[0];

  // 3. Fall back to the session phone, matched on the exact normalized 10-digit
  // national number. Substring/LIKE matching here would let one member row with a
  // malformed short mobileNo resolve to any session, and ORDER BY keeps the result
  // deterministic when duplicate numbers exist.
  if (req.user.phoneNumber) {
    let national: string;
    try {
      national = normalizeIndianMobile(req.user.phoneNumber).national;
    } catch {
      return null;
    }
    const [rowsByPhone]: any = await pool.query(
      `${MEMBER_SELECT}
       WHERE RIGHT(REGEXP_REPLACE(m.mobileNo, '[^0-9]', ''), 10) = ?
       ORDER BY m.id DESC
       LIMIT 1`,
      [national]
    );
    if (rowsByPhone && rowsByPhone.length > 0) return rowsByPhone[0];
  }

  return null;
}

function memberBatch(member: any) {
  return member.batch_name
    ? { name: member.batch_name, startTime: member.start_time ?? null, endTime: member.end_time ?? null }
    : null;
}

function membershipSummary(member: any) {
  const expiryDate = toDateOnlyString(member.membership_end_date);
  return {
    status: member.membership_status || "Inactive",
    paymentStatus: member.payment_status || "Pending",
    planName: member.plan_name || null,
    startDate: toDateOnlyString(member.membership_start_date) || null,
    expiryDate: expiryDate || null,
    daysRemaining: expiryDate ? Math.max(0, calendarDaysBetween(calendarToday(), expiryDate)) : null,
    durationMonths: member.plan_duration ?? null,
    batchName: member.batch_name || null
  };
}

const PAID_STATUSES = ["paid", "success", "successful", "completed", "captured"];

// The portal's MemberPayment shape. Receipt and invoice links are offered only for a paid
// payment that carries the number, and are served by the ownership-checked routes below.
function presentMemberPayment(row: any) {
  const paid = PAID_STATUSES.includes(String(row.payment_status || "").toLowerCase());
  return {
    id: row.id,
    amount: Number(row.amount || 0),
    status: row.payment_status || null,
    paymentDate: row.payment_date ? toDateOnlyString(row.payment_date) : null,
    planName: row.plan_name || null,
    paymentType: row.payment_type || null,
    receiptNo: row.receipt_no || null,
    invoiceNo: row.invoice_no || null,
    hasReceipt: paid && Boolean(row.receipt_no),
    hasInvoice: paid && Boolean(row.invoice_no),
    paymentMethod: row.payment_method || null,
    refundAmount: Number(row.refund_amount || 0),
    refundStatus: row.refund_status || null,
    refundDate: row.refund_date ? toDateOnlyString(row.refund_date) : null
  };
}

// 1. GET /api/member/profile
router.get("/member/profile", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return res.status(404).json({ error: "Authenticated member record not found" });
    }
    res.json(member);
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/member/dashboard
router.get("/member/dashboard", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return res.status(404).json({ error: "Authenticated member record not found" });
    }

    const pool = await getDbPool();

    // Fetch batch details
    let batchInfo = null;
    if (member.selected_batch_id) {
      const [batches]: any = await pool.query("SELECT * FROM batches WHERE id = ?", [member.selected_batch_id]);
      if (batches && batches.length > 0) {
        batchInfo = batches[0];
      }
    }

    // No coach is derived here. Assigning one by gender invented a name and showed it to the
    // member as though it were their actual coach. Until coaches are linked to batches in the
    // database this stays empty and the UI omits it.
    const coachName = "";

    // Expiry comes from the stored membership_end_date, which activation already calculated
    // with the inclusive-end-date rule. This previously recomputed it from the payment date
    // with setMonth(), which is the anniversary-style calculation the project deliberately
    // removed, and it disagreed with the date on the member's own invoice.
    const expiryDate = toDateOnlyString(member.membership_end_date);
    const daysRemaining = expiryDate
      ? Math.max(0, calendarDaysBetween(calendarToday(), expiryDate))
      : 0;

    // Fetch upcoming events from MySQL
    const [events]: any = await pool.query(
      "SELECT * FROM events WHERE event_date >= CURDATE() ORDER BY event_date ASC LIMIT 3"
    );
    const upcomingEvents = events || [];

    // Fetch upcoming holidays
    const [holidays]: any = await pool.query(
      "SELECT * FROM holidays WHERE holiday_date >= CURDATE() ORDER BY holiday_date ASC LIMIT 3"
    );
    const upcomingHolidays = holidays || [];

    // Fetch notifications
    const [notifications]: any = await pool.query(
      "SELECT * FROM notifications WHERE member_id IS NULL OR member_id = ? ORDER BY id DESC LIMIT 5",
      [member.id]
    );
    const recentNotifications = notifications || [];

    res.json({
      member: {
        id: member.id,
        fullName: member.fullName,
        membershipNo: member.membershipNo,
        photoUrl: member.photoUrl
      },
      membership: {
        status: member.membership_status || "Inactive",
        // Previously absent, so the portal fell back to the literal string "Status pending"
        // for every member, including fully paid ones.
        paymentStatus: member.payment_status || "Pending",
        planName: member.plan_name || "No Active Plan",
        startDate: member.membership_start_date || null,
        expiryDate,
        daysRemaining
      },
      // null rather than a stand-in batch: a member with no allocation must not be shown
      // a time and batch name they could turn up for.
      todayBatch: member.batch_name ? {
        batchTime: `${member.start_time} - ${member.end_time}`,
        batchName: member.batch_name,
        coachName
      } : null,
      batch: memberBatch(member),
      upcomingEvent: upcomingEvents[0],
      upcomingHoliday: upcomingHolidays[0],
      recentNotifications: recentNotifications.slice(0, 3)
    });
  } catch (err) {
    next(err);
  }
});

// 2a. GET /api/member/batch
router.get("/member/batch", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return res.status(404).json({ error: "Authenticated member record not found" });
    }

    // No batch chosen yet is a normal state, not an error.
    if (!member.selected_batch_id) {
      return res.json({ batch: null });
    }

    const pool = await getDbPool();
    const [rows]: any = await pool.query(
      `SELECT b.batch_name, b.start_time, b.end_time, b.status, a.name AS academy_name
       FROM batches b
       LEFT JOIN academies a ON b.academy_id = a.id
       WHERE b.id = ? AND b.academy_id = ?
       LIMIT 1`,
      [member.selected_batch_id, member.academyId]
    );

    // Assigned batch is missing or belongs to another academy — surface it rather than
    // silently showing "no batch", which would hide a real data problem.
    if (!rows || rows.length === 0) {
      return res.status(409).json({ error: "Assigned batch unavailable" });
    }

    const batch = rows[0];
    return res.json({
      batch: {
        name: batch.batch_name,
        startTime: batch.start_time ?? null,
        endTime: batch.end_time ?? null,
        status: batch.status ?? null,
        academyName: batch.academy_name ?? null
      }
    });
  } catch (err) {
    next(err);
  }
});

// 3. GET /api/member/events
router.get("/member/events", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const pool = await getDbPool();
    const [events]: any = await pool.query(
      "SELECT * FROM events ORDER BY event_date ASC LIMIT 10"
    );
    res.json(events || []);
  } catch (err) {
    next(err);
  }
});

// 4. GET /api/member/holidays
router.get("/member/holidays", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const pool = await getDbPool();
    const [holidays]: any = await pool.query(
      "SELECT * FROM holidays ORDER BY holiday_date ASC LIMIT 15"
    );
    res.json(holidays || []);
  } catch (err) {
    next(err);
  }
});

// 5. GET /api/member/payments
// Online renewal. Opens 30 days before the membership ends (and stays open after it has ended),
// so a member can't pay for a new period months early by mistake. Creates (or reuses) a Razorpay
// renewal order at the plan's renewal fee and returns the checkout page; paying there extends the
// membership from its current end date, the same as a renewal at the counter.
export const RENEWAL_OPENS_DAYS_BEFORE = 30;

router.post("/member/renew", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) return res.status(404).json({ error: "Authenticated member record not found" });
    const expiryDate = toDateOnlyString(member.membership_end_date);
    if (!expiryDate || !member.membership_plan_id) {
      return res.status(409).json({ error: "Your membership can't be renewed online yet. Please renew at the reception." });
    }
    const daysLeft = calendarDaysBetween(calendarToday(), expiryDate);
    if (daysLeft > RENEWAL_OPENS_DAYS_BEFORE) {
      return res.status(409).json({ error: `Online renewal opens ${RENEWAL_OPENS_DAYS_BEFORE} days before your membership ends.` });
    }
    const order = await new PaymentService().createRazorpayOrder({
      memberId: member.id,
      paymentType: "Renewal",
      approvedBy: "Member (online renewal)"
    });
    res.json({
      success: true,
      amount: order.amount,
      checkoutPath: `/pay?order_id=${encodeURIComponent(order.orderId)}&member=${encodeURIComponent(member.membershipNo || String(member.id))}`
    });
  } catch (err: any) {
    if (err?.status === 502 || err?.status === 503) return res.status(503).json({ error: "Online payment isn't available right now. Please try again later or renew at the reception." });
    next(err);
  }
});

router.get("/member/payments", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return res.status(404).json({ error: "Authenticated member record not found" });
    }
    const pool = await getDbPool();
    const [payments]: any = await pool.query(
      "SELECT p.*, pl.name as plan_name FROM payments p LEFT JOIN membership_plans pl ON p.membership_plan_id = pl.id WHERE p.member_id = ? ORDER BY p.id DESC",
      [member.id]
    );

    res.json({ payments: (payments || []).map(presentMemberPayment) });
  } catch (err) {
    next(err);
  }
});

// 6. GET /api/member/notifications
// Read/unread is kept per member, because academy-wide messages (member_id NULL) are shared by
// everyone and the notifications.is_read column can only hold one answer for all of them.
let memberReadTableReady = false;
async function ensureMemberReadTable(pool: any) {
  if (memberReadTableReady) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS member_notification_reads (
    member_id INT UNSIGNED NOT NULL,
    notification_id INT UNSIGNED NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_id, notification_id)
  ) ENGINE=InnoDB`);
  memberReadTableReady = true;
}

router.get("/member/notifications", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    const pool = await getDbPool();
    const memberId = member ? member.id : 0;
    const [notifications]: any = await pool.query(
      "SELECT * FROM notifications WHERE member_id IS NULL OR member_id = ? ORDER BY id DESC LIMIT 20",
      [memberId]
    );
    let readIds = new Set<number>();
    try {
      await ensureMemberReadTable(pool);
      const [reads]: any = await pool.query("SELECT notification_id FROM member_notification_reads WHERE member_id = ?", [memberId]);
      readIds = new Set((reads || []).map((r: any) => Number(r.notification_id)));
    } catch (err: any) {
      console.warn("Member notification read state unavailable:", err?.message || err);
    }
    res.json((notifications || []).map((n: any) => ({
      ...n,
      isRead: readIds.has(Number(n.id)) || (n.member_id != null && Boolean(Number(n.is_read)))
    })));
  } catch (err) {
    next(err);
  }
});

// POST /api/member/notifications/read  { ids: number[] }
router.post("/member/notifications/read", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) return res.status(404).json({ error: "Authenticated member record not found" });
    const ids: number[] = Array.isArray(req.body?.ids)
      ? req.body.ids.map((v: any) => Number(v)).filter((v: number) => Number.isInteger(v) && v > 0).slice(0, 100)
      : [];
    if (ids.length === 0) return res.json({ success: true });
    const pool = await getDbPool();
    await ensureMemberReadTable(pool);
    // Only messages this member can actually see are recorded.
    const [visible]: any = await pool.query(
      "SELECT id FROM notifications WHERE id IN (?) AND (member_id IS NULL OR member_id = ?)",
      [ids, member.id]
    );
    const rows = (visible || []).map((v: any) => [member.id, v.id]);
    if (rows.length) {
      await pool.query("INSERT IGNORE INTO member_notification_reads (member_id, notification_id) VALUES ?", [rows]);
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// 7. GET /api/member/membership
// Built from stored values only. This used to recompute dates from the registration date,
// invent an approval date one day before activation, and list plan "benefits" (guest passes,
// merchandise discounts) the academy never offered.
router.get("/member/membership", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return res.status(404).json({ error: "Authenticated member record not found" });
    }
    res.json({
      member: { id: member.id, fullName: member.fullName, membershipNo: member.membershipNo, photoUrl: member.photoUrl },
      membership: membershipSummary(member),
      batch: memberBatch(member)
    });
  } catch (err) {
    next(err);
  }
});

// 7a. GET /api/member/payments/receipt/:receiptNo and /invoice/:invoiceNo
// Invoice references are bound to the authenticated member: a number belonging to anyone
// else, or to an unpaid payment, is reported as not found.
async function sendOwnPaymentDocument(req: any, res: Response, next: any, kind: PaymentDocumentKind, paymentRow: (memberId: number) => Promise<any>) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return res.status(404).json({ error: "Authenticated member record not found" });
    }
    const payment = await paymentRow(member.id);
    if (!payment || !PAID_STATUSES.includes(String(payment.payment_status || "").toLowerCase())) {
      return res.status(404).json({ error: "Document not found" });
    }
    const { pdfResult, invoiceNo, receiptNo } = await new PaymentService().ensureAndGetInvoicePDF(Number(payment.id), undefined, kind);
    const fileName = kind === "receipt" ? receiptNo : invoiceNo;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${req.query.download === "true" ? "attachment" : "inline"}; filename="${fileName}.pdf"`);
    res.setHeader("Content-Length", pdfResult.pdfBuffer.length);
    res.setHeader("Cache-Control", "private, no-store");
    return res.send(pdfResult.pdfBuffer);
  } catch (err) {
    next(err);
  }
}

router.get("/member/payments/receipt/:receiptNo", requireAuth(["member", "parent"]), (req: any, res, next) =>
  sendOwnPaymentDocument(req, res, next, "receipt", async (memberId) => {
    const pool = await getDbPool();
    const [rows]: any = await pool.query(
      "SELECT id, payment_status FROM payments WHERE member_id = ? AND receipt_no = ? LIMIT 1",
      [memberId, req.params.receiptNo]
    );
    return rows?.[0];
  })
);

router.get("/member/payments/invoice/:invoiceNo", requireAuth(["member", "parent"]), (req: any, res, next) =>
  sendOwnPaymentDocument(req, res, next, "invoice", async (memberId) => {
    const pool = await getDbPool();
    const [rows]: any = await pool.query(
      "SELECT id, payment_status FROM payments WHERE member_id = ? AND invoice_no = ? LIMIT 1",
      [memberId, req.params.invoiceNo]
    );
    return rows?.[0];
  })
);

// 8. GET /api/member/payment-history
router.get("/member/payment-history", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return res.status(404).json({ error: "Authenticated member record not found" });
    }
    const pool = await getDbPool();
    const [payments]: any = await pool.query(
      "SELECT p.*, pl.name as plan_name FROM payments p LEFT JOIN membership_plans pl ON p.membership_plan_id = pl.id WHERE p.member_id = ? ORDER BY p.id DESC",
      [member.id]
    );

    const result = (payments || []).map((p: any) => ({
      paymentDate: p.payment_date || p.created_at,
      amount: p.amount,
      paymentStatus: p.payment_status,
      paymentMethod: p.payment_method || "UPI",
      transactionId: p.razorpay_payment_id || `txn_${p.id}_mock`
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 9. GET /member/renewal-status
router.get("/member/renewal-status", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return res.status(404).json({ error: "Authenticated member record not found" });
    }

    const startStr = member.paymentDate || member.registrationDate || new Date().toISOString().split("T")[0];
    let daysRemaining = 0;
    
    try {
      let baseDate = new Date(startStr);
      if (isNaN(baseDate.getTime())) {
        const parts = startStr.split("/");
        if (parts.length === 3) {
          baseDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }
      if (!isNaN(baseDate.getTime())) {
        baseDate.setMonth(baseDate.getMonth() + (member.plan_duration || 1));
        const diffTime = baseDate.getTime() - Date.now();
        daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
    } catch (e) {}

    // Academy policy rules: allow early renewals only starting 15 days before expiry, or if inactive/expired
    const isAvailable = (daysRemaining <= 15) || (member.membership_status !== "Active");
    let message = "";
    if (isAvailable) {
      if (member.membership_status !== "Active") {
        message = "Your membership is currently inactive or pending. Renew now to unlock premium pool access lanes.";
      } else {
        message = `Your membership will expire in ${daysRemaining} days. Renewal is now open! click below to extend your plan.`;
      }
    } else {
      message = `Renewal will become available 15 days prior to expiry. You have ${daysRemaining} active days remaining.`;
    }

    res.json({
      isAvailable,
      daysRemaining: member.membership_status === "Active" ? daysRemaining : 0,
      message,
      renewalPrice: parseFloat(member.amountPaid || "2500.00"),
      planName: member.plan_name || "Quarterly Access Pass"
    });
  } catch (err) {
    next(err);
  }
});

// 10. POST /member/renew
// Creates a real, server-priced Razorpay order for the member's own renewal.
// This does NOT activate the membership — activation only happens once
// POST /api/payments/verify confirms a signed Razorpay payment (see payment.service.ts verifyPayment).
router.post("/member/renew", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return res.status(404).json({ error: "Authenticated member record not found" });
    }

    const result = await new PaymentService().createRazorpayOrder({
      memberId: member.id,
      membershipNo: member.membershipNo,
      paymentType: "Renewal",
      approvedBy: member.fullName || "Member Self-Renewal"
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 11. GET /api/member/attendance
router.get("/member/attendance", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return res.status(404).json({ error: "Authenticated member record not found" });
    }
    const pool = await getDbPool();

    // 1. Get attendance history
    const [rows]: any = await pool.query(
      "SELECT date, time FROM attendance WHERE member_id = ? ORDER BY date DESC, time DESC LIMIT 100",
      [member.id]
    );

    // 2. Count current month attendance
    const [monthCountRows]: any = await pool.query(
      "SELECT COUNT(*) as count FROM attendance WHERE member_id = ? AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())",
      [member.id]
    );
    const monthlyAttendance = monthCountRows[0]?.count || 0;

    // 3. Count total attendance
    const [totalCountRows]: any = await pool.query(
      "SELECT COUNT(*) as count FROM attendance WHERE member_id = ?",
      [member.id]
    );
    const totalAttendance = totalCountRows[0]?.count || 0;

    // No attendance percentage is returned. A truthful one needs the weekdays each batch
    // runs on, which the batches table does not record, so any denominator here would be
    // invented. The previous version divided by a flat 22 days - showing a member on a
    // 3-days-a-week plan roughly 55% while they attended every session - and fell back to a
    // literal 80 when there was nothing this month. Counts below are all factual.

    // 4. Check today's attendance status
    const [todayRows]: any = await pool.query(
      "SELECT time FROM attendance WHERE member_id = ? AND date = CURDATE() LIMIT 1",
      [member.id]
    );
    let todayStatus = "Absent";
    if (todayRows && todayRows.length > 0) {
      const checkinTime = todayRows[0].time;
      todayStatus = `Checked-In at ${checkinTime.substring(0, 5)}`;
    }

    const attendanceHistory = (rows || []).map((row: any) => {
      let formattedDate = row.date;
      if (row.date instanceof Date) {
        formattedDate = row.date.toISOString().split("T")[0];
      }
      return {
        date: formattedDate,
        time: row.time.substring(0, 5),
        status: "Present"
      };
    });

    const [weekRows]: any = await pool.query(
      "SELECT COUNT(*) as count FROM attendance WHERE member_id = ? AND YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)",
      [member.id]
    );
    const [lastRows]: any = await pool.query(
      "SELECT date FROM attendance WHERE member_id = ? ORDER BY date DESC LIMIT 1",
      [member.id]
    );
    const lastVisit = lastRows?.[0]?.date
      ? (lastRows[0].date instanceof Date ? lastRows[0].date.toISOString().split("T")[0] : lastRows[0].date)
      : null;

    res.json({
      attendanceHistory,
      monthlyAttendance,
      weeklyAttendance: weekRows[0]?.count || 0,
      totalAttendance,
      lastVisit,
      todayStatus
    });
  } catch (err) {
    next(err);
  }
});

export default router;
