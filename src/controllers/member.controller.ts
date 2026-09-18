import { Request, Response, NextFunction } from "express";
import { MemberService } from "../services/member.service";
import { PaymentService } from "../services/payment.service";
import { sendPaymentReminder } from "../services/whatsapp.service";
import { getDbPool } from "../config/db";
import { persistUploadedFile } from "../services/object-storage.service";

export class MemberController {
  private memberService = new MemberService();

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await this.memberService.getAllMembers();
      res.json(members);
    } catch (err) {
      next(err);
    }
  };

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const photoPath = req.file ? await persistUploadedFile(req.file) : null;
      const registered = await this.memberService.registerMember(req.body, photoPath);
      
      res.status(201).json({
        success: true,
        message: "Registration submitted successfully. Please wait for admin approval.",
        data: {
          id: registered.membershipNo,
          application_number: registered.applicationNumber,
          full_name: registered.fullName,
          registration_status: "Pending",
          admin_approval: "Pending",
          payment_status: "Pending",
          photoUrl: registered.photoUrl
        }
      });
    } catch (err) {
      next(err);
    }
  };

  directRegister = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const registered = await this.memberService.directRegister(req.body);

      res.status(201).json({
        ...registered,
        success: true,
        pendingApproval: true,
        message: "Registration submitted successfully. Please wait for admin approval and the WhatsApp payment link."
      });
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { 
        membershipNo, 
        mobileNo, 
        photoUrl, 
        emergencyName, 
        emergencyPhone, 
        emergencyRelation,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        hasMedicalCondition,
        medicalDetails,
        parentName,
        parentMobile,
        parentRelation,
        bloodGroup
      } = req.body;

      if (!membershipNo) {
        return res.status(400).json({ success: false, error: "Membership ID is required" });
      }

      const updated = await this.memberService.updateProfile(membershipNo, {
        mobileNo,
        photoUrl,
        emergencyName,
        emergencyPhone,
        emergencyRelation,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        hasMedicalCondition,
        medicalDetails,
        parentName,
        parentMobile,
        parentRelation,
        bloodGroup
      });

      if (updated) {
        res.json({ success: true, member: updated });
      } else {
        res.status(404).json({ success: false, error: "Member profile not found." });
      }
    } catch (err) {
      next(err);
    }
  };

  approve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNo } = req.body;
      if (!membershipNo) {
        return res.status(400).json({ error: "Membership number is required." });
      }
      const approved = await this.memberService.approveMember(membershipNo);
      if (approved) {
        const targetMobile = approved.mobileNo || approved.whatsappNumber || approved.mobile || approved.emergencyContactNumber || approved.undertakerParentPhone || "";
        const memberName = approved.fullName || approved.name || "Member";

        const paymentService = new PaymentService();
        const paymentResult = await paymentService.sendPaymentLink({
          memberId: approved.id,
          membershipNo: approved.membershipNo,
          channel: "whatsapp",
          approvedBy: (req as any).user?.name || (req as any).user?.fullName || "Admin"
        });

        res.json({ 
          success: true, 
          member: approved, 
          paymentId: paymentResult.paymentId,
          orderId: paymentResult.orderId,
          paymentLink: paymentResult.paymentLink,
          payment_link_url: paymentResult.payment_link_url,
          whatsappStatus: paymentResult.whatsappStatus,
          whatsappResponse: paymentResult.whatsappResponse,
          message: paymentResult.whatsappStatus === "Delivered"
            ? `Member ${memberName} approved successfully. Payment link sent by WhatsApp to ${targetMobile}.`
            : paymentResult.whatsappStatus === "Queued"
              ? `Member ${memberName} approved successfully. The payment link is queued for automatic WhatsApp retry to ${targetMobile}.`
            : `Member ${memberName} was approved and the payment link was created, but WhatsApp delivery failed. Use Resend WhatsApp after checking MSG91 configuration.`
        });
      } else {
        res.status(404).json({ error: "Member not found" });
      }
    } catch (err) {
      console.error("❌ Error in member approval payment workflow:", err);
      next(err);
    }
  };

  resendWhatsApp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNo, mobileNo } = req.body;
      const member = await this.memberService.getMemberByNo(membershipNo);
      if (!member) {
        return res.status(404).json({ error: "Member not found for WhatsApp dispatch." });
      }

      const targetMobile = mobileNo || member.mobileNo || member.whatsappNumber || member.mobile || member.emergencyContactNumber || "";
      if (!targetMobile) {
        return res.status(400).json({ error: "Member does not have a registered mobile or WhatsApp phone number." });
      }

      const paymentService = new PaymentService();
        const paymentResult = await paymentService.sendPaymentLink({
          memberId: member.id,
          membershipNo: member.membershipNo,
          channel: "whatsapp",
          approvedBy: (req as any).user?.name || (req as any).user?.fullName || "Admin"
        });

      res.json({
        success: true,
        message: paymentResult.whatsappStatus === "Delivered"
          ? `WhatsApp payment reminder successfully sent to ${targetMobile}.`
          : paymentResult.whatsappStatus === "Queued"
            ? `WhatsApp is temporarily unavailable. The payment reminder is queued for automatic retry to ${targetMobile}.`
          : `Payment link is ready, but WhatsApp delivery failed. Check MSG91 configuration and try again.`,
        paymentId: paymentResult.paymentId,
        orderId: paymentResult.orderId,
        paymentLink: paymentResult.paymentLink,
        payment_link_url: paymentResult.payment_link_url,
        whatsappStatus: paymentResult.whatsappStatus,
        whatsappResponse: paymentResult.whatsappResponse
      });
    } catch (err: any) {
      console.error("Failed to resend WhatsApp payment link:", err);
      res.status(500).json({ error: err.message || "Failed to dispatch WhatsApp message via MSG91." });
    }
  };

  reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNo, remarks } = req.body;
      const rejected = await this.memberService.rejectMember(membershipNo, remarks);
      if (rejected) {
        res.json({ success: true, member: rejected });
      } else {
        res.status(404).json({ error: "Member not found" });
      }
    } catch (err) {
      next(err);
    }
  };

  pay = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNo, paymentMethod, amountPaid, txnId } = req.body;
      const paid = await this.memberService.payMember(membershipNo, {
        paymentMethod,
        amountPaid,
        txnId
      });
      if (paid) {
        res.json({ success: true, member: paid });
      } else {
        res.status(404).json({ error: "Member not found" });
      }
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNo } = req.params;
      const success = await this.memberService.deleteMember(membershipNo);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Member not found" });
      }
    } catch (err) {
      next(err);
    }
  };

  deleteBatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNos, deleteAllRejected, academyId } = req.body;
      if (deleteAllRejected) {
        await this.memberService.deleteAllRejectedMembers(academyId);
        return res.json({ success: true, message: "All rejected applications deleted successfully." });
      }
      if (Array.isArray(membershipNos) && membershipNos.length > 0) {
        await this.memberService.deleteMultipleMembers(membershipNos);
        return res.json({ success: true, message: "Selected applications deleted successfully." });
      }
      res.status(400).json({ error: "No applications specified for deletion." });
    } catch (err) {
      next(err);
    }
  };

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNo } = req.params;
      const profile = await this.memberService.getMemberProfile(membershipNo);
      if (!profile) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json(profile);
    } catch (err) {
      next(err);
    }
  };

  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNo } = req.params;
      const dashboard = await this.memberService.getMemberDashboard(membershipNo);
      if (!dashboard) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json(dashboard);
    } catch (err) {
      next(err);
    }
  };

  getAdminStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.memberService.getAdminDashboardStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  };

  assignBatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNo } = req.params;
      const { batchId } = req.body;
      if (!batchId) {
        return res.status(400).json({ error: "Batch ID is required" });
      }
      const updated = await this.memberService.assignBatch(membershipNo, batchId);
      res.json({ success: true, member: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  changeMembership = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNo } = req.params;
      const { planId } = req.body;
      if (!planId) {
        return res.status(400).json({ error: "Plan ID is required" });
      }
      const updated = await this.memberService.changeMembership(membershipNo, planId);
      res.json({ success: true, member: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  changeBatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNo } = req.params;
      const { batchId } = req.body;
      if (!batchId) {
        return res.status(400).json({ error: "Batch ID is required" });
      }
      const updated = await this.memberService.changeBatch(membershipNo, batchId);
      res.json({ success: true, member: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  suspend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNo } = req.params;
      const updated = await this.memberService.suspendMember(membershipNo);
      res.json({ success: true, member: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  activate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNo } = req.params;
      const updated = await this.memberService.activateMember(membershipNo);
      res.json({ success: true, member: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  deactivate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNo } = req.params;
      const updated = await this.memberService.deactivateMember(membershipNo);
      res.json({ success: true, member: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  getAttendanceLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = await getDbPool();
      const [rows]: any = await pool.query(
        "SELECT a.id, a.member_id, a.date, a.time, a.checked_in_by, m.fullName, m.membershipNo, m.mobileNo, m.typeOfMembership, m.allottedTiming FROM attendance a INNER JOIN members m ON a.member_id = m.id ORDER BY a.id DESC"
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  };

  scanQrCode = async (req: any, res: Response, next: NextFunction) => {
    try {
      const { qrData, scannedBy } = req.body;
      if (!qrData) {
        return res.status(400).json({ success: false, error: "QR Code data is required." });
      }

      const pool = await getDbPool();

      // Clean QR payload
      let rawToken = String(qrData).trim();
      let extractedMembershipNo = rawToken;

      try {
        if (rawToken.startsWith("{") && rawToken.endsWith("}")) {
          const parsed = JSON.parse(rawToken);
          extractedMembershipNo = parsed.membershipNo || parsed.membership_no || parsed.memberId || parsed.id || rawToken;
        }
      } catch (e) {
        // preserve rawToken
      }

      extractedMembershipNo = extractedMembershipNo
        .replace(/^BSF-MEMBER-/, "")
        .replace(/^BSF-QR-/, "")
        .replace(/^MEMBER_/, "")
        .replace(/^SWIM_/, "")
        .trim();

      const [rows]: any = await pool.query(
        "SELECT * FROM members WHERE membershipNo = ? OR id = ? OR applicationNumber = ? OR mobileNo = ? LIMIT 1",
        [extractedMembershipNo, extractedMembershipNo, extractedMembershipNo, extractedMembershipNo]
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Member not found. Scanned QR code does not match any registered swimmer in SAMS database."
        });
      }

      const member = rows[0];

      let batchName = member.allottedTiming || member.selected_batch_id || "General Batch";
      if (member.selected_batch_id) {
        const [batchRows]: any = await pool.query("SELECT * FROM batches WHERE id = ? LIMIT 1", [member.selected_batch_id]);
        if (batchRows && batchRows.length > 0) {
          batchName = `${batchRows[0].batch_name} (${batchRows[0].start_time} - ${batchRows[0].end_time})`;
        }
      }

      let planName = member.typeOfMembership || member.membership_plan_id || "Standard Membership";
      if (member.membership_plan_id) {
        const [planRows]: any = await pool.query("SELECT * FROM membership_plans WHERE id = ? LIMIT 1", [member.membership_plan_id]);
        if (planRows && planRows.length > 0) {
          planName = planRows[0].name;
        }
      }

      const memberSummary = {
        id: member.id,
        membershipNo: member.membershipNo,
        fullName: member.fullName,
        photoUrl: member.photoUrl,
        mobileNo: member.mobileNo,
        email: member.email,
        registrationStatus: member.registration_status || "Approved",
        membershipStatus: member.membership_status || "Active",
        paymentStatus: member.payment_status || "Paid",
        batchName,
        planName
      };

      // 1. Validate Membership Status
      const currentStatus = (member.membership_status || "Active").toLowerCase();
      const currentRegStatus = (member.registration_status || "Approved").toLowerCase();

      if (currentRegStatus === "pending") {
        return res.status(400).json({
          success: false,
          reason: "STATUS_PENDING",
          member: memberSummary,
          error: `Access Denied: Swimmer registration for ${member.fullName} is pending admin approval.`
        });
      }

      if (currentRegStatus === "rejected") {
        return res.status(400).json({
          success: false,
          reason: "STATUS_REJECTED",
          member: memberSummary,
          error: `Access Denied: Registration for ${member.fullName} was rejected.`
        });
      }

      if (currentStatus === "suspended") {
        return res.status(400).json({
          success: false,
          reason: "SUSPENDED",
          member: memberSummary,
          error: `Access Denied: Swimmer membership for ${member.fullName} is currently SUSPENDED.`
        });
      }

      if (currentStatus === "inactive") {
        return res.status(400).json({
          success: false,
          reason: "INACTIVE",
          member: memberSummary,
          error: `Access Denied: Membership for ${member.fullName} is INACTIVE.`
        });
      }

      // 2. Validate Payment Status
      const paymentStatus = (member.payment_status || "Paid").toLowerCase();
      if (paymentStatus === "pending" || paymentStatus === "unpaid") {
        return res.status(400).json({
          success: false,
          reason: "PAYMENT_PENDING",
          member: memberSummary,
          error: `Access Denied: Membership payment is pending for ${member.fullName}. Please settle dues at reception.`
        });
      }

      // 3. Validate Membership Expiry Date
      let expiryDateStr = member.endDate || member.expiryDate;
      if (!expiryDateStr && member.registrationDate) {
        try {
          const regDate = new Date(member.registrationDate);
          if (!isNaN(regDate.getTime())) {
            regDate.setMonth(regDate.getMonth() + 1);
            expiryDateStr = regDate.toISOString().split("T")[0];
          }
        } catch (e) {}
      }

      if (expiryDateStr) {
        const todayStr = new Date().toISOString().split("T")[0];
        if (expiryDateStr < todayStr) {
          return res.status(400).json({
            success: false,
            reason: "EXPIRED",
            member: memberSummary,
            expiryDate: expiryDateStr,
            error: `Access Denied: Membership for ${member.fullName} EXPIRED on ${expiryDateStr}. Renewal required before entry.`
          });
        }
      }

      // 4. Check for duplicate check-in today
      const todayDateStr = new Date().toISOString().split("T")[0];
      const [existingRows]: any = await pool.query(
        "SELECT * FROM attendance WHERE member_id = ? AND date = ? LIMIT 1",
        [member.id, todayDateStr]
      );

      if (existingRows && existingRows.length > 0) {
        const checkInTime = existingRows[0].time || existingRows[0].created_at || "earlier today";
        return res.status(200).json({
          success: false,
          alreadyCheckedIn: true,
          member: memberSummary,
          date: todayDateStr,
          checkInTime,
          message: `${member.fullName} is ALREADY checked in for today (at ${checkInTime}).`,
          error: `Already Checked In Today at ${checkInTime}`
        });
      }

      // 5. Success Check-In
      const currentTimeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const checkedInBy = scannedBy || req.user?.name || "Reception QR Scanner";
      const staffIdStr = req.user?.userId ? String(req.user.userId).split("_").pop() : "1";
      const staffId = parseInt(staffIdStr || "1", 10) || 1;

      await pool.query(
        "INSERT INTO attendance (member_id, date, time, checked_in_by) VALUES (?, ?, ?, ?)",
        [member.id, todayDateStr, currentTimeStr, staffId]
      );

      // Audit Log Activity
      await pool.query(
        "INSERT INTO activities (userName, action, status, performedBy) VALUES (?, ?, 'Success', ?)",
        [member.fullName, `QR Code Swimmer Check-In (${member.membershipNo})`, checkedInBy]
      );

      // Notification entry
      try {
        await pool.query(
          "INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, 'attendance', 0)",
          [member.id, "Lobby Attendance Logged", `Welcome ${member.fullName}! You checked in at ${currentTimeStr}.`]
        );
      } catch (e) {}

      res.status(200).json({
        success: true,
        message: `Access Granted: ${member.fullName} successfully checked in!`,
        data: {
          memberId: member.id,
          fullName: member.fullName,
          membershipNo: member.membershipNo,
          photoUrl: member.photoUrl,
          batchName,
          planName,
          date: todayDateStr,
          time: currentTimeStr,
          checkedInBy
        }
      });
    } catch (err) {
      next(err);
    }
  };

  checkInMember = async (req: any, res: Response, next: NextFunction) => {
    try {
      const { memberId } = req.body;
      if (!memberId) {
        return res.status(400).json({ error: "Member ID is required." });
      }
      const pool = await getDbPool();

      // 1. Verify member exists
      const [memberRows]: any = await pool.query(
        "SELECT * FROM members WHERE id = ? OR membershipNo = ? LIMIT 1",
        [memberId, memberId]
      );
      if (!memberRows || memberRows.length === 0) {
        return res.status(404).json({ error: "Swimmer profile not found in SAMS database." });
      }
      const member = memberRows[0];

      // 2. Check if already checked in for today
      const todayDateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const [existingRows]: any = await pool.query(
        "SELECT * FROM attendance WHERE member_id = ? AND date = ? LIMIT 1",
        [member.id, todayDateStr]
      );

      if (existingRows && existingRows.length > 0) {
        return res.status(400).json({ error: `${member.fullName} is already checked in for today.` });
      }

      // 3. Perform Check-In insert
      const currentTimeStr = new Date().toTimeString().split(" ")[0]; // HH:MM:SS
      const checkedInBy = req.user?.name || "Staff";
      const staffIdStr = req.user?.userId ? req.user.userId.split("_").pop() : "1";
      const staffId = parseInt(staffIdStr || "1", 10) || 1;

      await pool.query(
        "INSERT INTO attendance (member_id, date, time, checked_in_by) VALUES (?, ?, ?, ?)",
        [member.id, todayDateStr, currentTimeStr, staffId]
      );

      // Log Activity
      await pool.query(
        "INSERT INTO activities (userName, action, status, performedBy) VALUES (?, ?, 'Success', ?)",
        [member.fullName, `Swimmer Checked In (Lobby)`, checkedInBy]
      );

      res.status(201).json({
        success: true,
        message: `${member.fullName} successfully checked in.`,
        data: {
          memberId: member.id,
          fullName: member.fullName,
          membershipNo: member.membershipNo,
          date: todayDateStr,
          time: currentTimeStr,
          checkedInBy
        }
      });
    } catch (err) {
      next(err);
    }
  };

  updateNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { membershipNo } = req.params;
      const { remarks } = req.body;
      const updated = await this.memberService.updateMemberRemarks(membershipNo, remarks);
      if (updated) {
        res.json({ success: true, member: updated });
      } else {
        res.status(404).json({ error: "Member not found" });
      }
    } catch (err) {
      next(err);
    }
  };
}
