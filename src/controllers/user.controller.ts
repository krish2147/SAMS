import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";
import { ActivityService } from "../services/activity.service";
import { getDbPool, getConnectionError } from "../config/db";
import bcrypt from "bcryptjs";



export class UserController {
  private userService = new UserService();

  sendOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.userService.sendOtp(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.userService.login(req.body);
      if (!result.success) {
        return res.status(result.error?.includes("Invalid") ? 401 : 400).json({ error: result.error });
      }

      // Set cookie
      if (result.token) {
        res.cookie("sams_session_token", result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          maxAge: 2 * 60 * 60 * 1000,
          path: "/"
        });
      }

      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  verify = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(401).json({ error: "No session token provided" });
      }
      const session = await this.userService.verifySession(token);
      if (!session) {
        return res.status(401).json({ error: "Session expired or invalid. Please login again." });
      }
      res.json({ success: true, user: session });
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      if (token) {
        await this.userService.logout(token);
      }
      res.clearCookie("sams_session_token");
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  getAllStaff = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffList = await this.userService.getAllStaff();
      res.json(staffList);
    } catch (err) {
      next(err);
    }
  };

  registerStaff = async (req: any, res: Response, next: NextFunction) => {
    try {
      const requesterRole = req.user?.role;
      const targetRole = req.body?.role;

      if (requesterRole === "admin") {
        if (targetRole === "admin" || targetRole === "super_admin") {
          return res.status(403).json({ error: "Access denied. Admins can only create Staff, Receptionist, or Coach accounts." });
        }
      }

      const newStaff = await this.userService.registerStaff(req.body);
      res.status(201).json({ success: true, staff: newStaff });
    } catch (err) {
      next(err);
    }
  };

  deleteStaff = async (req: any, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const requesterId = req.user?.userId;
      const requesterRole = req.user?.role;

      // 1. Cannot delete own account
      if (String(requesterId) === String(id)) {
        return res.status(403).json({ error: "Access denied. You cannot delete your own account." });
      }

      // 2. Fetch target user to check permissions
      const pool = await getDbPool();
      const [rows]: any = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
      
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "Staff member not found." });
      }

      const target = rows[0];

      // 3. Admin permissions check
      if (requesterRole === "admin") {
        if (target.role === "super_admin" || target.role === "admin") {
          return res.status(403).json({ error: "Access denied. Admins cannot delete Super Admins or other Admins." });
        }
      }

      const success = await this.userService.deleteStaff(id);
      if (success) {
        res.json({ success: true, message: "Staff account deleted successfully." });
      } else {
        res.status(404).json({ error: "Staff member not found." });
      }
    } catch (err) {
      next(err);
    }
  };

  getActivities = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activities = await ActivityService.getAllActivities();
      res.json(activities);
    } catch (err) {
      next(err);
    }
  };

  getPaymentsDashboard = async (req: Request, res: Response, next: NextFunction) => {
    const isConnectionError = (err: any): boolean => {
      if (!err) return false;
      const msg = (err.message || "").toLowerCase();
      const code = (err.code || "").toUpperCase();
      return (
        code === "ECONNREFUSED" ||
        code === "ENOTFOUND" ||
        code === "ETIMEDOUT" ||
        code === "EHOSTUNREACH" ||
        code === "PROTOCOL_CONNECTION_LOST" ||
        code === "PROTOCOL_SEQUENCE_TIMEOUT" ||
        code === "ER_ACCESS_DENIED_ERROR" ||
        msg.includes("connect econnrefused") ||
        msg.includes("connection lost") ||
        msg.includes("access denied") ||
        msg.includes("not found")
      );
    };

    try {
      let pool;
      try {
        pool = await getDbPool();
      } catch (dbErr: any) {
        return res.status(503).json({
          success: false,
          connectionFailed: true,
          error: "Database connection failed. Please contact the system administrator or check if the MySQL database is running."
        });
      }

      // Check if there is an active database connection error recorded
      const connErr = getConnectionError();
      if (connErr && isConnectionError(connErr)) {
        return res.status(503).json({
          success: false,
          connectionFailed: true,
          error: "Database connection failed. Please contact the system administrator or check if the MySQL database is running."
        });
      }

      try {
        // 1. Transactions list
        const [transactions]: any = await pool.query(`
          SELECT p.id, p.amount, p.payment_status, p.payment_method, 
                 p.razorpay_payment_id as transaction_id, 
                 COALESCE(p.payment_date, p.created_at) as payment_date, 
                 m.fullName as member_name, m.membershipNo
          FROM payments p
          INNER JOIN members m ON p.member_id = m.id
          ORDER BY p.id DESC
        `);

        // 2. Total revenue (successful payments)
        const [revResult]: any = await pool.query(
          "SELECT SUM(amount) as total FROM payments WHERE payment_status = 'Paid' OR payment_status = 'Successful'"
        );
        const totalRevenue = Number(revResult[0]?.total || 0);

        // 3. Today's collection
        const todayStart = new Date();
        todayStart.setHours(0,0,0,0);
        const [todayResult]: any = await pool.query(
          "SELECT SUM(amount) as total FROM payments WHERE (payment_status = 'Paid' OR payment_status = 'Successful') AND (payment_date >= ? OR created_at >= ?)",
          [todayStart, todayStart]
        );
        const todaysCollection = Number(todayResult[0]?.total || 0);

        // 4. Pending payments count from members
        const [pendingResult]: any = await pool.query(
          "SELECT COUNT(*) as count FROM members WHERE payment_status = 'Pending'"
        );
        const pendingPayments = Number(pendingResult[0]?.count || 0);

        // 5. Successful payments count from payments
        const [successResult]: any = await pool.query(
          "SELECT COUNT(*) as count FROM payments WHERE payment_status = 'Paid' OR payment_status = 'Successful'"
        );
        const successfulPaymentsCount = Number(successResult[0]?.count || 0);

        // 6. Failed payments count
        const [failedResult]: any = await pool.query(
          "SELECT COUNT(*) as count FROM payments WHERE payment_status = 'Failed'"
        );
        const failedPaymentsCount = Number(failedResult[0]?.count || 0);

        // 7. Total members paid
        const [paidMembersResult]: any = await pool.query(
          "SELECT COUNT(DISTINCT member_id) as count FROM payments WHERE payment_status = 'Paid' OR payment_status = 'Successful'"
        );
        const totalMembersPaid = Number(paidMembersResult[0]?.count || 0);

        // 8. Approved but payment pending
        const [approvedPendingResult]: any = await pool.query(
          "SELECT COUNT(*) as count FROM members WHERE registration_status = 'Approved' AND payment_status = 'Pending'"
        );
        const approvedPendingCount = Number(approvedPendingResult[0]?.count || 0);

        res.json({
          success: true,
          summary: {
            totalRevenue,
            todaysCollection,
            pendingPayments,
            successfulPaymentsCount,
            failedPaymentsCount,
            totalMembersPaid,
            approvedPendingCount
          },
          transactions: (transactions || []).map((t: any) => ({
            id: t.id,
            memberName: t.member_name,
            membershipId: t.membershipNo,
            amount: Number(t.amount),
            paymentMethod: t.payment_method || "UPI",
            transactionId: t.transaction_id || `TXN-${t.id}`,
            dateTime: t.payment_date,
            status: t.payment_status
          }))
        });
      } catch (queryErr: any) {
        if (isConnectionError(queryErr)) {
          return res.status(503).json({
            success: false,
            connectionFailed: true,
            error: "Database connection failed. Please contact the system administrator or check if the MySQL database is running."
          });
        }

        console.warn("⚠️ Query execution failed, handling empty database gracefully:", queryErr.message);
        res.json({
          success: true,
          summary: {
            totalRevenue: 0,
            todaysCollection: 0,
            pendingPayments: 0,
            successfulPaymentsCount: 0,
            failedPaymentsCount: 0,
            totalMembersPaid: 0,
            approvedPendingCount: 0
          },
          transactions: []
        });
      }
    } catch (err) {
      next(err);
    }
  };

  getRenewalsList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = await getDbPool();
      const [rows]: any = await pool.query(
        "SELECT r.id, r.member_id, r.due_date, r.amount, r.status, m.fullName, m.membershipNo, m.typeOfMembership FROM renewals r INNER JOIN members m ON r.member_id = m.id ORDER BY r.id DESC"
      );
      res.json(rows || []);
    } catch (err) {
      console.warn("⚠️ Query renewals failed, handling empty gracefully:", err);
      res.json([]);
    }
  };

  updateProfile = async (req: any, res: Response, next: NextFunction) => {
    try {
      const userIdStr = req.user?.userId?.split("_").pop();
      if (!userIdStr) {
        return res.status(401).json({ error: "Unauthorized. Session is invalid." });
      }

      const { name, email, phoneNumber, photoUrl } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required fields." });
      }

      const success = await this.userService.updateProfile(userIdStr, {
        name,
        email,
        phoneNumber: phoneNumber || "+91 00000 00000",
        photoUrl
      });

      if (!success) {
        return res.status(404).json({ error: "User profile not found or could not be updated." });
      }

      res.json({ success: true, message: "Profile details updated successfully." });
    } catch (err: any) {
      next(err);
    }
  };

  updatePassword = async (req: any, res: Response, next: NextFunction) => {
    try {
      const userIdStr = req.user?.userId?.split("_").pop();
      if (!userIdStr) {
        return res.status(401).json({ error: "Unauthorized. Session is invalid." });
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required fields." });
      }

      // Verify current password
      const pool = await getDbPool();
      const [rows]: any = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [userIdStr]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: "User not found." });
      }
      const user = rows[0];

      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password does not match our records." });
      }

      const success = await this.userService.resetStaffPassword(userIdStr, newPassword);
      if (!success) {
        return res.status(500).json({ error: "Could not update password. Please try again." });
      }

      res.json({ success: true, message: "Password updated successfully!" });
    } catch (err: any) {
      next(err);
    }
  };

  getCoachDashboardData = async (req: any, res: Response, next: NextFunction) => {
    try {
      const academyId = req.user?.academyId || "swim";
      const pool = await getDbPool();

      // 1. Get Batches
      const [batches]: any = await pool.query(
        "SELECT * FROM batches WHERE academy_id = ?",
        [academyId]
      );

      // 2. Get Members assigned to these batches
      const [members]: any = await pool.query(
        `SELECT m.*, p.name as planName, b.batch_name as batchName, b.start_time, b.end_time
         FROM members m
         LEFT JOIN membership_plans p ON m.membership_plan_id = p.id
         LEFT JOIN batches b ON m.selected_batch_id = b.id
         WHERE m.academyId = ?`,
        [academyId]
      );

      // 3. Get Attendance logs
      const [allAttendance]: any = await pool.query(
        `SELECT a.*, m.fullName, m.membershipNo, m.selected_batch_id
         FROM attendance a
         INNER JOIN members m ON a.member_id = m.id
         WHERE m.academyId = ?`,
        [academyId]
      );

      // 4. Get Upcoming Events
      const [events]: any = await pool.query(
        "SELECT * FROM events ORDER BY event_date ASC LIMIT 10"
      );

      // 5. Get Upcoming Holidays
      const [holidays]: any = await pool.query(
        "SELECT * FROM holidays ORDER BY holiday_date ASC LIMIT 10"
      );

      // 6. Get Announcements & Notifications
      const [notifications]: any = await pool.query(
        "SELECT * FROM notifications ORDER BY id DESC LIMIT 30"
      );

      // Calculate stats for Today
      const todayStr = new Date().toISOString().split("T")[0];
      const todayAttendance = allAttendance.filter((a: any) => {
        const aDate = a.date instanceof Date ? a.date.toISOString().split("T")[0] : String(a.date);
        return aDate === todayStr;
      });

      // Today's batches are active batches
      const todayBatches = batches.map((b: any) => {
        const batchMembers = members.filter((m: any) => m.selected_batch_id === b.id && m.membership_status === "Active");
        const checkedInCount = todayAttendance.filter((a: any) => a.selected_batch_id === b.id).length;
        
        return {
          id: b.id,
          batch_name: b.batch_name,
          start_time: b.start_time,
          end_time: b.end_time,
          capacity: b.capacity,
          current_strength: batchMembers.length,
          available_seats: Math.max(0, b.capacity - batchMembers.length),
          presentCount: checkedInCount,
          absentCount: Math.max(0, batchMembers.length - checkedInCount)
        };
      });

      // Stats aggregation
      const totalMembersInTodayBatches = todayBatches.reduce((acc: number, curr: any) => acc + curr.current_strength, 0);
      const membersPresentToday = todayBatches.reduce((acc: number, curr: any) => acc + curr.presentCount, 0);
      const membersAbsentToday = Math.max(0, totalMembersInTodayBatches - membersPresentToday);

      res.json({
        success: true,
        batches: todayBatches,
        members: members.map((m: any) => ({
          id: m.id,
          fullName: m.fullName,
          membershipNo: m.membershipNo,
          age: m.age || (m.dateOfBirth ? (new Date().getFullYear() - new Date(m.dateOfBirth).getFullYear()) : "N/A"),
          gender: m.gender,
          photoUrl: m.photoUrl,
          membership_status: m.membership_status,
          batchName: m.batchName || "Not Assigned",
          remarks: m.remarks || "",
          selected_batch_id: m.selected_batch_id
        })),
        attendanceLogs: allAttendance,
        events: events || [],
        holidays: holidays || [],
        notifications: notifications || [],
        stats: {
          totalMembersInTodayBatches,
          membersPresentToday,
          membersAbsentToday
        }
      });
    } catch (err: any) {
      console.error("Coach Dashboard API Error:", err);
      next(err);
    }
  };
}
