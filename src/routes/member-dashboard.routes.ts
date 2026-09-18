import { Router, Response } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import { getDbPool } from "../config/db";
import { ActivityService } from "../services/activity.service";


const router = Router();

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
      `SELECT m.*, p.name as plan_name, p.duration_months as plan_duration, 
              p.registration_fee, p.renewal_fee, p.co_charge,
              b.batch_name, b.start_time, b.end_time 
       FROM members m 
       LEFT JOIN membership_plans p ON m.membership_plan_id = p.id 
       LEFT JOIN batches b ON m.selected_batch_id = b.id 
       WHERE m.id = ?`,
      [parseInt(idOrNo, 10)]
    );
    if (rows && rows.length > 0) return rows[0];
  }

  // 2. Try search by membershipNo
  const [rowsByNo]: any = await pool.query(
    `SELECT m.*, p.name as plan_name, p.duration_months as plan_duration, 
            p.registration_fee, p.renewal_fee, p.co_charge,
            b.batch_name, b.start_time, b.end_time 
     FROM members m 
     LEFT JOIN membership_plans p ON m.membership_plan_id = p.id 
     LEFT JOIN batches b ON m.selected_batch_id = b.id 
     WHERE m.membershipNo = ?`,
    [idOrNo]
  );
  if (rowsByNo && rowsByNo.length > 0) return rowsByNo[0];

  // 3. Try search by mobileNo fallback
  if (req.user.phoneNumber) {
    const cleanPhone = req.user.phoneNumber.replace(/\D/g, "");
    const [rowsByPhone]: any = await pool.query(
      `SELECT m.*, p.name as plan_name, p.duration_months as plan_duration, 
              p.registration_fee, p.renewal_fee, p.co_charge,
              b.batch_name, b.start_time, b.end_time 
       FROM members m 
       LEFT JOIN membership_plans p ON m.membership_plan_id = p.id 
       LEFT JOIN batches b ON m.selected_batch_id = b.id 
       WHERE REPLACE(m.mobileNo, ' ', '') LIKE ? 
          OR ? LIKE CONCAT('%', REPLACE(m.mobileNo, ' ', ''), '%')`,
      [`%${cleanPhone}%`, cleanPhone]
    );
    if (rowsByPhone && rowsByPhone.length > 0) return rowsByPhone[0];
  }

  return null;
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

    // Default coach assignment for swimming academy
    const coachName = member.gender === "female" ? "Coach Hetvi Shah" : "Coach Sanjay Mehta";

    // Calculate plan expiry & days remaining
    let expiryDate: string | null = null;
    let daysRemaining = 0;
    if (member.membership_status === "Active" && member.plan_name) {
      const regOrPayDate = member.paymentDate || member.registrationDate || new Date().toISOString();
      try {
        let baseDate = new Date(regOrPayDate);
        if (isNaN(baseDate.getTime())) {
          // Try parse Indian format DD/MM/YYYY
          const parts = regOrPayDate.split("/");
          if (parts.length === 3) {
            baseDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
        }
        if (!isNaN(baseDate.getTime())) {
          baseDate.setMonth(baseDate.getMonth() + (member.plan_duration || 1));
          expiryDate = baseDate.toISOString().split("T")[0];
          const diffTime = baseDate.getTime() - Date.now();
          daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
      } catch (e) {
        // Safe fallback
      }
    }

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
        planName: member.plan_name || "No Active Plan",
        expiryDate,
        daysRemaining
      },
      todayBatch: member.batch_name ? {
        batchTime: `${member.start_time} - ${member.end_time}`,
        batchName: member.batch_name,
        coachName
      } : {
        batchTime: "07:00 AM - 08:00 AM",
        batchName: "Morning Sunrise Batch (A)",
        coachName
      },
      upcomingEvent: upcomingEvents[0],
      upcomingHoliday: upcomingHolidays[0],
      recentNotifications: recentNotifications.slice(0, 3)
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

    res.json({
      payments: payments || [],
      registrationFee: member.registration_fee || 1500,
      renewalFee: member.renewal_fee || 2500,
      membershipFee: member.renewal_fee || 2500
    });
  } catch (err) {
    next(err);
  }
});

// 6. GET /api/member/notifications
router.get("/member/notifications", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    const pool = await getDbPool();
    const memberId = member ? member.id : 0;
    const [notifications]: any = await pool.query(
      "SELECT * FROM notifications WHERE member_id IS NULL OR member_id = ? ORDER BY id DESC LIMIT 20",
      [memberId]
    );
    res.json(notifications || []);
  } catch (err) {
    next(err);
  }
});

// 7. GET /api/member/membership
router.get("/member/membership", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return res.status(404).json({ error: "Authenticated member record not found" });
    }

    // Default start/expiry calculation
    const startStr = member.paymentDate || member.registrationDate || new Date().toISOString().split("T")[0];
    let expiryStr: string | null = null;
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
        expiryStr = baseDate.toISOString().split("T")[0];
        const diffTime = baseDate.getTime() - Date.now();
        daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
    } catch (e) {}

    // Dynamic but realistic benefits based on plan
    const planNameLower = (member.plan_name || "").toLowerCase();
    let benefits = [
      "Access to standard training pool lanes during allocated batch times",
      "Assigned certified head coach supervision",
      "Locker room and high-end temperature-controlled shower facilities",
      "Complimentary entry to Baroda local tournaments"
    ];

    if (planNameLower.includes("gold") || planNameLower.includes("premium") || planNameLower.includes("annual")) {
      benefits.push(
        "Priority personal stroke correction review sessions",
        "Free guest entry pass once per month",
        "Discounts on official academy speedo caps & goggles"
      );
    }

    // Construct registration, approval, activation timeline
    const regDate = member.registrationDate || "15/06/2026";
    let appDate = "16/06/2026";
    let actDate = "16/06/2026";

    try {
      let baseDate = new Date(startStr);
      if (!isNaN(baseDate.getTime())) {
        const d1 = new Date(baseDate);
        d1.setDate(d1.getDate() - 1); // Approved 1 day before start
        appDate = d1.toISOString().split("T")[0];
        actDate = baseDate.toISOString().split("T")[0];
      }
    } catch (e) {}

    res.json({
      summary: {
        membershipNo: member.membershipNo || `MEM-${String(member.id).padStart(5, "0")}`,
        status: member.membership_status || "Inactive",
        planName: member.plan_name || "No Active Plan",
        startDate: startStr,
        expiryDate: expiryStr || startStr,
        daysRemaining: member.membership_status === "Active" ? daysRemaining : 0
      },
      benefits,
      timeline: {
        registrationDate: regDate,
        approvalDate: appDate,
        activationDate: actDate,
        nextRenewalDate: expiryStr || startStr
      }
    });
  } catch (err) {
    next(err);
  }
});

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
router.post("/member/renew", requireAuth(["member", "parent"]), async (req: any, res: Response, next) => {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return res.status(404).json({ error: "Authenticated member record not found" });
    }

    const pool = await getDbPool();
    const todayStr = new Date().toISOString().split("T")[0];
    const txnId = `pay_ren_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const renewAmount = parseFloat(req.body.amount || member.amountPaid || "2500.00");

    // 1. Update the members table
    await pool.query(
      `UPDATE members 
       SET membership_status = 'Active', 
           payment_status = 'Paid', 
           paymentDate = ?, 
           txnId = ?, 
           amountPaid = ? 
       WHERE id = ?`,
      [todayStr, txnId, renewAmount, member.id]
    );

    // 2. Insert into the payments table
    await pool.query(
      `INSERT INTO payments (member_id, membership_plan_id, amount, payment_status, payment_method, razorpay_payment_id, payment_date) 
       VALUES (?, ?, ?, 'Paid', 'UPI', ?, CURRENT_TIMESTAMP)`,
      [member.id, member.membership_plan_id || 1, renewAmount, txnId]
    );

    await ActivityService.logActivity(member.fullName, "Membership Renewal Completed", "Success", "Self");

    res.json({
      success: true,
      message: "Membership renewed successfully! Plan extended.",
      transactionId: txnId
    });
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

    // Attendance percentage calculation
    const attendancePercentage = monthlyAttendance > 0 ? Math.min(100, Math.round((monthlyAttendance / 22) * 100)) : (totalAttendance > 0 ? 80 : 0);

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

    res.json({
      attendanceHistory,
      attendancePercentage,
      monthlyAttendance,
      todayStatus
    });
  } catch (err) {
    next(err);
  }
});

export default router;
