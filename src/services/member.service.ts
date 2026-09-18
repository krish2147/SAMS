import { MemberRepository } from "../repositories/member.repository";
import { BatchRepository } from "../repositories/batch.repository";
import { PlanRepository } from "../repositories/plan.repository";
import { getDbPool } from "../config/db";
import { ActivityService } from "./activity.service";
import { sendEventNotification } from "./communication.service";


export class MemberService {
  private memberRepository = new MemberRepository();
  private batchRepository = new BatchRepository();
  private planRepository = new PlanRepository();

  async getAllMembers(): Promise<any[]> {
    return this.memberRepository.getAll();
  }

  async getMemberByNo(membershipNo: string): Promise<any | null> {
    return this.memberRepository.getByMembershipNo(membershipNo);
  }

  async registerMember(payload: any, photoPath: string | null): Promise<any> {
    const full_name = payload.full_name || payload.fullName;
    const date_of_birth = payload.date_of_birth || payload.dateOfBirth;
    const gender = payload.gender;
    const mobile_number = payload.mobile_number || payload.mobileNumber || payload.mobileNo;
    const whatsapp_number = payload.whatsapp_number || payload.whatsappNumber;
    const email = payload.email;
    const address = payload.address || payload.addressLine1;
    const city = payload.city;
    const state = payload.state;
    const pincode = payload.pincode;
    const emergency_contact_name = payload.emergency_contact_name || payload.emergencyContactName || payload.emergencyName;
    const emergency_contact_number = payload.emergency_contact_number || payload.emergencyContactNumber || payload.emergencyPhone;
    const member_type = payload.member_type || payload.memberType;
    const batchSelection = payload.batch;
    const academy_id = payload.academyId || payload.academy_id || "swim";
    const blood_group = payload.blood_group || payload.bloodGroup;
    const has_medical_condition = payload.has_medical_condition || payload.hasMedicalCondition;
    const medical_details = payload.medical_details || payload.medicalDetails;

    // Validate inputs
    const validationErrors: { field: string; message: string }[] = [];

    if (!full_name || !full_name.trim()) {
      validationErrors.push({ field: "full_name", message: "Full name is required" });
    } else if (full_name.trim().length < 3) {
      validationErrors.push({ field: "full_name", message: "Name must be at least 3 characters" });
    }

    if (!date_of_birth) {
      validationErrors.push({ field: "date_of_birth", message: "Date of birth is required" });
    } else {
      const dobDate = new Date(date_of_birth);
      const now = new Date();
      if (isNaN(dobDate.getTime())) {
        validationErrors.push({ field: "date_of_birth", message: "Invalid date of birth format" });
      } else {
        let calculatedAge = now.getFullYear() - dobDate.getFullYear();
        const m = now.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dobDate.getDate())) {
          calculatedAge--;
        }
        if (calculatedAge < 3) {
          validationErrors.push({ field: "date_of_birth", message: "Member must be at least 3 years old to register" });
        } else if (calculatedAge > 100) {
          validationErrors.push({ field: "date_of_birth", message: "Please provide a valid date of birth" });
        }
      }
    }

    if (!gender) {
      validationErrors.push({ field: "gender", message: "Gender is required" });
    } else if (!["Male", "Female", "Other", "male", "female", "other"].includes(gender)) {
      validationErrors.push({ field: "gender", message: "Gender must be one of: Male, Female, Other" });
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!mobile_number) {
      validationErrors.push({ field: "mobile_number", message: "Mobile number is required" });
    } else if (!phoneRegex.test(mobile_number.replace(/\s+/g, ""))) {
      validationErrors.push({ field: "mobile_number", message: "Must be a valid mobile number (up to 15 digits)" });
    }

    if (whatsapp_number && !phoneRegex.test(whatsapp_number.replace(/\s+/g, ""))) {
      validationErrors.push({ field: "whatsapp_number", message: "WhatsApp number must be a valid phone number" });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        validationErrors.push({ field: "email", message: "Must be a valid email address" });
      }
    }

    if (!address || !address.trim()) {
      validationErrors.push({ field: "address", message: "Address is required" });
    }

    if (!city || !city.trim()) {
      validationErrors.push({ field: "city", message: "City is required" });
    }

    if (!state || !state.trim()) {
      validationErrors.push({ field: "state", message: "State is required" });
    }

    const pinRegex = /^\d{6}$/;
    if (!pincode || !pincode.trim()) {
      validationErrors.push({ field: "pincode", message: "PIN Code is required" });
    } else if (!pinRegex.test(pincode.trim())) {
      validationErrors.push({ field: "pincode", message: "Must be a 6-digit PIN Code" });
    }

    if (!emergency_contact_name || !emergency_contact_name.trim()) {
      validationErrors.push({ field: "emergency_contact_name", message: "Emergency contact name is required" });
    }

    if (!emergency_contact_number) {
      validationErrors.push({ field: "emergency_contact_number", message: "Emergency phone number is required" });
    } else if (!phoneRegex.test(emergency_contact_number.replace(/\s+/g, ""))) {
      validationErrors.push({ field: "emergency_contact_number", message: "Must be a valid contact number" });
    }

    if (!member_type || (typeof member_type === "string" && !member_type.trim())) {
      validationErrors.push({ field: "member_type", message: "Please select a membership plan" });
    }

    if (!batchSelection || !batchSelection.trim()) {
      validationErrors.push({ field: "batch", message: "Please select a training session batch" });
    }

    if (validationErrors.length > 0) {
      const error: any = new Error("Validation Failed");
      error.status = 400;
      error.validationErrors = validationErrors;
      throw error;
    }

    // Check if duplicate mobile number exists in DB
    const existingMember = await this.memberRepository.getByPhone(mobile_number);
    if (existingMember) {
      const error: any = new Error("Mobile number is already registered in the system.");
      error.status = 400;
      throw error;
    }

    // Check if duplicate email exists in DB if email is provided
    if (email && email.trim().length > 0) {
      const existingEmail = await this.memberRepository.getByEmail(email);
      if (existingEmail) {
        const error: any = new Error("Email address is already registered in the system.");
        error.status = 400;
        throw error;
      }
    }

    // Resolve plan
    const plan = await this.planRepository.findByName(member_type);
    if (!plan) {
      throw new Error(`Membership plan with name ${member_type} could not be resolved.`);
    }

    // Resolve batch
    const batch = await this.batchRepository.findByNameOrTime(batchSelection);
    if (!batch) {
      throw new Error(`Training batch slot ${batchSelection} could not be resolved.`);
    }

    // Step 6: Prevent registration if batch status is CLOSED
    if (batch.status === "CLOSED" || batch.current_strength >= batch.capacity) {
      const error: any = new Error(`The selected training slot (${batch.batch_name}) is currently FULL or CLOSED. Please select another batch.`);
      error.status = 400;
      throw error;
    }

    const uniqueAppNo = `APP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const membershipNo = `${academy_id === "swim" ? "BSF" : "TCA"}-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newMemberRecord = {
      membershipNo,
      applicationNo: uniqueAppNo,
      fullName: full_name.trim(),
      dateOfBirth: date_of_birth,
      gender: gender.toLowerCase(),
      bloodGroup: blood_group || "O+",
      mobileNo: mobile_number,
      whatsappNumber: whatsapp_number || mobile_number,
      email: email || null,
      addressLine1: address,
      city: city || "",
      state: state || "",
      pincode: pincode || "",
      emergencyName: emergency_contact_name,
      emergencyPhone: emergency_contact_number,
      emergencyMobile: emergency_contact_number,
      emergencyRelation: payload.emergencyRelation || payload.parentRelation || "Contact",
      hasMedicalCondition: (has_medical_condition === "true" || has_medical_condition === true) ? "Yes" : "No",
      medicalDetails: medical_details || "",
      academyId: academy_id,
      selected_batch_id: batch.id,
      membership_plan_id: plan.id,
      registration_status: "Pending",
      payment_status: "Pending",
      membership_status: "Inactive",
      login_enabled: false,
      registrationDate: new Date().toLocaleDateString(),
      photoUrl: photoPath,
      amountPaid: 0,
      paymentMethod: null,
      paymentDate: null,
      txnId: null
    };

    const created = await this.memberRepository.create(newMemberRecord);
    await ActivityService.logActivity(newMemberRecord.fullName, "New Registration Form Submitted", "Submitted", "Self");
    
    // Automated Communication Center Notification
    sendEventNotification("registration_submitted", {
      id: created.id,
      memberName: created.fullName,
      mobileNo: created.mobileNo,
      email: created.email
    }, {
      membershipNo: created.membershipNo,
      batch: batchSelection || "Standard Morning Batch"
    }).catch(err => console.error("Comm notification error:", err));

    return created;
  }

  async directRegister(memberData: any): Promise<any> {
    try {
      // Lookup matching plan and batch ID
      const plan = await this.planRepository.findByName(memberData.typeOfMembership || memberData.memberType || "General");
      const batch = await this.batchRepository.findByNameOrTime(memberData.batchTiming || memberData.batch || "Morning Sunrise Batch (A)");

      // A public registration can never approve or activate itself.
      const finalRegStatus = "Pending";
      const finalPaymentStatus = "Pending";
      const finalMembershipStatus = "Inactive";
      const finalLoginEnabled = false;

      const record = {
        membershipNo: memberData.membershipNo || memberData.id || `${(memberData.academyId || "swim") === "swim" ? "BSF" : "TCA"}-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        applicationNo: memberData.applicationNo || memberData.application_number || `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: memberData.fullName || memberData.full_name || memberData.name || "Member",
        email: memberData.email || null,
        mobileNo: memberData.mobileNo || memberData.mobile_number || memberData.phone || "",
        gender: memberData.gender || "male",
        age: memberData.age ? Number(memberData.age) : null,
        dateOfBirth: memberData.dateOfBirth || memberData.date_of_birth || null,
        addressLine1: memberData.addressLine1 || memberData.address || "Baroda Residence",
        city: memberData.city || "Vadodara",
        state: memberData.state || "Gujarat",
        pincode: memberData.pincode || "390001",
        emergencyName: memberData.emergencyName || memberData.emergency_contact_name || "Emergency Contact",
        emergencyPhone: memberData.emergencyPhone || memberData.emergency_contact_number || memberData.mobileNo || "",
        emergencyRelation: memberData.emergencyRelation || "Contact",
        hasMedicalCondition: (memberData.hasMedicalCondition === true || memberData.hasMedicalCondition === "Yes") ? "Yes" : "No",
        medicalDetails: memberData.medicalDetails || "",
        bloodGroup: memberData.bloodGroup || "O+",
        academyId: memberData.academyId || "swim",
        membership_plan_id: plan ? plan.id : null,
        selected_batch_id: batch ? batch.id : null,
        registration_status: finalRegStatus,
        payment_status: finalPaymentStatus,
        membership_status: finalMembershipStatus,
        login_enabled: finalLoginEnabled,
        registrationDate: memberData.registrationDate || new Date().toLocaleDateString(),
        photoUrl: memberData.photoUrl || null
      };

      // Check if member already exists by phone
      const existing = record.mobileNo ? await this.memberRepository.getByPhone(record.mobileNo) : null;
      if (existing) {
        const error: any = new Error("Mobile number is already registered in the system.");
        error.status = 400;
        throw error;
      }
      const result = await this.memberRepository.create(record);

      // Sync strength
      if (record.selected_batch_id && record.membership_status === "Active") {
        await this.batchRepository.updateStrengthAndStatus(record.selected_batch_id);
      }

      await ActivityService.logActivity(record.fullName, "New Registration Submitted", "Submitted", "Self");

      return result;
    } catch (err: any) {
      console.error("❌ Error in directRegister memberService:", err);
      throw err;
    }
  }

  async updateProfile(membershipNo: string, details: any): Promise<any> {
    const updated = await this.memberRepository.update(membershipNo, details);
    // If batch was changed, sync batch strengths
    if (updated && updated.selected_batch_id) {
      await this.batchRepository.updateStrengthAndStatus(updated.selected_batch_id);
    }
    if (updated) {
      await ActivityService.logActivity(updated.fullName, "Profile Details Updated", "Success", "Self");
    }
    return updated;
  }

  async approveMember(membershipNo: string): Promise<any> {
    // Idempotent approval: if already approved, return existing record flagged as alreadyApproved
    const existing = await this.memberRepository.getByMembershipNo(membershipNo);
    if (!existing) return null;

    if (existing.registration_status === "Approved") {
      // Already approved - do not duplicate actions
      return { ...existing, alreadyApproved: true };
    }

    const updated = await this.memberRepository.update(membershipNo, {
      registration_status: "Approved"
    });
    if (updated) {
      await ActivityService.logActivity(updated.fullName, "Member Application Approved", "Approved", "Admin");
      // The controller creates the Razorpay order after approval and sends the
      // real order-specific payment URL. Do not dispatch a placeholder link here.
    }
    return updated;
  }

  async rejectMember(membershipNo: string, remarks: string): Promise<any> {
    const updated = await this.memberRepository.update(membershipNo, {
      registration_status: "Rejected",
      remarks: remarks || "Registration application rejected by administrator."
    });
    if (updated) {
      await ActivityService.logActivity(updated.fullName, "Member Application Rejected", "Rejected", "Admin");
      sendEventNotification("registration_rejected", {
        id: updated.id,
        memberName: updated.fullName,
        mobileNo: updated.mobileNo,
        email: updated.email
      }, {
        membershipNo: updated.membershipNo
      }).catch(err => console.error("Rejection comm error:", err));
    }
    return updated;
  }

  async payMember(membershipNo: string, payload: { paymentMethod?: string; amountPaid?: number; txnId?: string }): Promise<any> {
    const original = await this.memberRepository.getByMembershipNo(membershipNo);
    if (!original) {
      throw new Error("Member not found");
    }

    const updated = await this.memberRepository.update(membershipNo, {
      payment_status: "Paid",
      registration_status: "Approved",
      membership_status: "Active",
      paymentMethod: payload.paymentMethod || "UPI",
      amountPaid: payload.amountPaid || 120,
      paymentDate: new Date().toISOString().split("T")[0],
      txnId: payload.txnId || `pay_rzp_${Math.random().toString(36).substring(2, 11)}`,
      login_enabled: true
    });

    // Sync strength and update status of batch to CLOSED if full
    if (updated.selected_batch_id) {
      await this.batchRepository.updateStrengthAndStatus(updated.selected_batch_id);
    }

    // Insert payment record into payments table
    try {
      const pool = await getDbPool();
      await pool.query(
        "INSERT INTO payments (member_id, membership_plan_id, amount, payment_status, payment_method, razorpay_payment_id, payment_date) VALUES (?, ?, ?, 'Paid', ?, ?, CURRENT_TIMESTAMP)",
        [original.id, original.membership_plan_id || 1, payload.amountPaid || updated.amountPaid || 120, payload.paymentMethod || "UPI", updated.txnId]
      );
    } catch (paymentErr) {
      console.error("Failed to insert payment record during payMember:", paymentErr);
    }

    if (updated) {
      await ActivityService.logActivity(updated.fullName, `Payment of ₹${payload.amountPaid || updated.amountPaid || 120} Received`, "Success", "System");
      
      // Dispatch Payment Successful & Membership Activated Notifications
      sendEventNotification("payment_successful", {
        id: updated.id,
        memberName: updated.fullName,
        mobileNo: updated.mobileNo,
        email: updated.email
      }, {
        membershipNo: updated.membershipNo,
        amount: payload.amountPaid || updated.amountPaid || 120,
        receiptNo: `BSF-REC-2026-${String(updated.id || 1).padStart(4, "0")}`
      }).catch(err => console.error("Payment comm error:", err));

      sendEventNotification("membership_activated", {
        id: updated.id,
        memberName: updated.fullName,
        mobileNo: updated.mobileNo,
        email: updated.email
      }, {
        membershipNo: updated.membershipNo,
        batch: updated.batchTiming || "Morning Sunrise Batch",
        expiryDate: updated.membershipExpiry || "31-Dec-2026"
      }).catch(err => console.error("Activation comm error:", err));
    }

    return updated;
  }

  async deleteMember(membershipNo: string): Promise<boolean> {
    const member = await this.memberRepository.getByMembershipNo(membershipNo);
    const success = await this.memberRepository.delete(membershipNo);
    if (success && member && member.selected_batch_id) {
      await this.batchRepository.updateStrengthAndStatus(member.selected_batch_id);
    }
    return success;
  }

  async deleteMultipleMembers(membershipNos: string[]): Promise<boolean> {
    for (const no of membershipNos) {
      if (no) {
        await this.deleteMember(no);
      }
    }
    return true;
  }

  async deleteAllRejectedMembers(academyId?: string): Promise<boolean> {
    const allMembers = await this.memberRepository.getAll();
    const curAcademy = (academyId || "swim").toLowerCase();
    const rejected = allMembers.filter((m: any) => {
      const rStatus = m.registration_status || m.status || "";
      const mAcad = (m.academyId || academyId || "swim").toLowerCase();
      return (rStatus === "Rejected" || m.admin_approval === "Rejected") && mAcad === curAcademy;
    });
    for (const m of rejected) {
      if (m.membershipNo) {
        await this.deleteMember(m.membershipNo);
      }
    }
    return true;
  }

  async assignBatch(membershipNo: string, batchId: number | string): Promise<any> {
    const batch = await this.batchRepository.getById(batchId);
    if (!batch) {
      throw new Error("Selected training batch not found");
    }
    if (batch.status === "CLOSED" || batch.current_strength >= batch.capacity) {
      throw new Error("Selected batch is closed/at full capacity");
    }

    const member = await this.memberRepository.getByMembershipNo(membershipNo);
    const oldBatchId = member ? member.selected_batch_id : null;

    const updated = await this.memberRepository.update(membershipNo, {
      selected_batch_id: Number(batchId)
    });

    if (oldBatchId) {
      await this.batchRepository.updateStrengthAndStatus(oldBatchId);
    }
    await this.batchRepository.updateStrengthAndStatus(batchId);

    if (updated) {
      await ActivityService.logActivity(updated.fullName, `Training Batch Changed to ${batch.batch_name}`, "Success", "Admin");
      
      sendEventNotification("batch_changed", {
        id: updated.id,
        memberName: updated.fullName,
        mobileNo: updated.mobileNo,
        email: updated.email
      }, {
        membershipNo: updated.membershipNo,
        batch: `${batch.batch_name} (${batch.time_slot})`
      }).catch(err => console.error("Batch change comm error:", err));
    }

    return updated;
  }

  async changeMembership(membershipNo: string, planId: number | string): Promise<any> {
    const plan = await this.planRepository.getById(planId);
    if (!plan) {
      throw new Error("Selected membership plan not found");
    }

    return this.memberRepository.update(membershipNo, {
      membership_plan_id: Number(planId)
    });
  }

  async changeBatch(membershipNo: string, batchId: number | string): Promise<any> {
    return this.assignBatch(membershipNo, batchId);
  }

  async suspendMember(membershipNo: string): Promise<any> {
    const member = await this.memberRepository.getByMembershipNo(membershipNo);
    const updated = await this.memberRepository.update(membershipNo, {
      membership_status: "Suspended",
      login_enabled: false
    });

    if (member && member.selected_batch_id) {
      await this.batchRepository.updateStrengthAndStatus(member.selected_batch_id);
    }
    return updated;
  }

  async activateMember(membershipNo: string): Promise<any> {
    const member = await this.memberRepository.getByMembershipNo(membershipNo);
    const updated = await this.memberRepository.update(membershipNo, {
      membership_status: "Active",
      login_enabled: true
    });

    if (member && member.selected_batch_id) {
      await this.batchRepository.updateStrengthAndStatus(member.selected_batch_id);
    }
    return updated;
  }

  async deactivateMember(membershipNo: string): Promise<any> {
    const member = await this.memberRepository.getByMembershipNo(membershipNo);
    const updated = await this.memberRepository.update(membershipNo, {
      membership_status: "Inactive",
      login_enabled: false
    });

    if (member && member.selected_batch_id) {
      await this.batchRepository.updateStrengthAndStatus(member.selected_batch_id);
    }
    return updated;
  }

  async getMemberProfile(membershipNo: string): Promise<any> {
    const member = await this.memberRepository.getByMembershipNo(membershipNo);
    if (!member) return null;

    // Get Payment History
    const pool = await getDbPool();
    const [payments]: any = await pool.query("SELECT * FROM payments WHERE member_id = ?", [member.id]);
    
    // Get Renewal History
    const [renewals]: any = await pool.query("SELECT * FROM renewals WHERE member_id = ?", [member.id]);

    // Batch details
    const batch = member.selected_batch_id ? await this.batchRepository.getById(member.selected_batch_id) : null;

    // Plan details
    const plan = member.membership_plan_id ? await this.planRepository.getById(member.membership_plan_id) : null;

    return {
      personalDetails: {
        id: member.id,
        membershipNo: member.membershipNo,
        applicationNumber: member.applicationNumber,
        fullName: member.fullName,
        dateOfBirth: member.dateOfBirth,
        gender: member.gender,
        bloodGroup: member.bloodGroup,
        mobileNo: member.mobileNo,
        whatsappNumber: member.whatsappNumber,
        email: member.email,
        addressLine1: member.addressLine1,
        addressLine2: member.addressLine2,
        city: member.city,
        state: member.state,
        pincode: member.pincode,
        photoUrl: member.photoUrl,
        registrationDate: member.registrationDate
      },
      guardianDetails: {
        parentName: member.parentName,
        parentMobile: member.parentMobile,
        parentRelation: member.parentRelation
      },
      medicalInformation: {
        hasMedicalCondition: member.hasMedicalCondition,
        medicalDetails: member.medicalDetails,
        disability: member.disability,
        height: member.height,
        weight: member.weight
      },
      emergencyContact: {
        emergencyName: member.emergencyName,
        emergencyPhone: member.emergencyPhone,
        emergencyMobile: member.emergencyMobile,
        emergencyRelation: member.emergencyRelation
      },
      membershipDetails: plan ? {
        id: plan.id,
        name: plan.name,
        duration_months: plan.duration_months,
        registration_fee: plan.registration_fee,
        renewal_fee: plan.renewal_fee,
        co_charge: plan.co_charge,
        description: plan.description,
        is_active: plan.is_active,
        status: member.membership_status
      } : null,
      batchDetails: batch,
      paymentHistory: payments || [],
      renewalHistory: renewals || [],
      uploadedDocuments: {
        photoUrl: member.photoUrl,
        signatureDataUrl: member.signatureDataUrl
      }
    };
  }

  async getMemberDashboard(membershipNo: string): Promise<any> {
    const member = await this.memberRepository.getByMembershipNo(membershipNo);
    if (!member) return null;

    const batch = member.selected_batch_id ? await this.batchRepository.getById(member.selected_batch_id) : null;
    const plan = member.membership_plan_id ? await this.planRepository.getById(member.membership_plan_id) : null;

    // Calculate expiry and remaining days
    let expiryDate: string | null = null;
    let remainingDays = 0;
    
    if (member.membership_status === "Active" && plan) {
      const regOrPayDate = member.paymentDate || member.registrationDate;
      if (regOrPayDate) {
        try {
          const baseDate = new Date(regOrPayDate);
          if (!isNaN(baseDate.getTime())) {
            baseDate.setMonth(baseDate.getMonth() + plan.duration_months);
            expiryDate = baseDate.toISOString().split("T")[0];
            const diffTime = baseDate.getTime() - Date.now();
            remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    // Get upcoming events & holidays
    const pool = await getDbPool();
    const today = new Date().toISOString().split("T")[0];
    const [events]: any = await pool.query("SELECT * FROM events WHERE event_date >= ? ORDER BY event_date ASC LIMIT 5", [today]);
    const [holidays]: any = await pool.query("SELECT * FROM holidays WHERE holiday_date >= ? ORDER BY holiday_date ASC LIMIT 5", [today]);

    return {
      currentMembership: plan ? {
        name: plan.name,
        duration_months: plan.duration_months,
        status: member.membership_status
      } : null,
      expiryDate,
      remainingDays,
      assignedBatch: batch,
      upcomingEvents: events || [],
      upcomingHolidays: holidays || [],
      renewMembershipButton: member.membership_status === "Active" && remainingDays <= 15,
      paymentStatus: member.payment_status
    };
  }

  async getAdminDashboardStats(): Promise<any> {
    const allMembers = await this.memberRepository.getAll();
    
    const pendingMembers = allMembers.filter(m => m.registration_status === "Pending");
    const approvedMembers = allMembers.filter(m => m.registration_status === "Approved");
    const rejectedMembers = allMembers.filter(m => m.registration_status === "Rejected");
    const expiredMembers = allMembers.filter(m => m.membership_status === "Expired");

    // Renewals due
    const pool = await getDbPool();
    const [renewalsDueRows]: any = await pool.query("SELECT * FROM renewals WHERE status = 'Pending'");

    return {
      counts: {
        pending: pendingMembers.length,
        approved: approvedMembers.length,
        rejected: rejectedMembers.length,
        expired: expiredMembers.length,
        renewalsDue: renewalsDueRows ? renewalsDueRows.length : 0
      },
      pendingMembers: pendingMembers.slice(0, 10),
      approvedMembers: approvedMembers.slice(0, 10),
      rejectedMembers: rejectedMembers.slice(0, 10),
      expiredMembers: expiredMembers.slice(0, 10),
      renewalsDue: renewalsDueRows || []
    };
  }

  async updateMemberRemarks(membershipNo: string, remarks: string): Promise<any> {
    return this.memberRepository.update(membershipNo, { remarks });
  }
}
