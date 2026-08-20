import { getDbPool } from "../config/db";

export class MemberRepository {
  private mapRowToMember(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      membershipNo: row.membershipNo,
      applicationNumber: row.applicationNo,
      fullName: row.fullName,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      bloodGroup: row.bloodGroup,
      mobileNo: row.mobileNo,
      whatsappNumber: row.whatsappNumber || row.mobileNo,
      email: row.email,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      parentName: row.parentName,
      parentMobile: row.parentMobile,
      parentRelation: row.parentRelation,
      emergencyName: row.emergencyName,
      emergencyPhone: row.emergencyPhone,
      emergencyMobile: row.emergencyMobile || row.emergencyPhone,
      emergencyRelation: row.emergencyRelation,
      hasMedicalCondition: row.hasMedicalCondition,
      medicalDetails: row.medicalDetails,
      disability: row.disability,
      height: row.height,
      weight: row.weight,
      relationToUndertaker: row.relationToUndertaker,
      undertakerParentName: row.undertakerParentName,
      typedSignature: row.typedSignature,
      signatureDataUrl: row.signatureDataUrl,
      photoUrl: row.photoUrl,
      registrationDate: row.registrationDate,
      amountPaid: row.amountPaid ? Number(row.amountPaid) : 0,
      paymentMethod: row.paymentMethod,
      paymentDate: row.paymentDate,
      txnId: row.txnId,
      remarks: row.remarks,
      academyId: row.academyId,
      membership_plan_id: row.membership_plan_id,
      selected_batch_id: row.selected_batch_id,
      registration_status: row.registration_status,
      payment_status: row.payment_status,
      membership_status: row.membership_status,
      login_enabled: Boolean(row.login_enabled),
      // Mapped legacy compatibility fields
      status: row.registration_status,
      paymentStatus: row.payment_status,
      typeOfMembership: row.planName || "General",
      batchSchedule: row.batchName?.includes("Morning") ? "MWF" : "TTS",
      batchTiming: row.batchName || "Morning Sunrise Batch (A)"
    };
  }

  async getAll(): Promise<any[]> {
    const pool = await getDbPool();
    const [rows]: any = await pool.query(`
      SELECT m.*, p.name as planName, b.batch_name as batchName 
      FROM members m
      LEFT JOIN membership_plans p ON m.membership_plan_id = p.id
      LEFT JOIN batches b ON m.selected_batch_id = b.id
      ORDER BY m.id DESC
    `);
    return rows.map((r: any) => this.mapRowToMember(r));
  }

  async getByPhone(phoneNumber: string): Promise<any | null> {
    const pool = await getDbPool();
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    
    const [rows]: any = await pool.query(`
      SELECT m.*, p.name as planName, b.batch_name as batchName 
      FROM members m
      LEFT JOIN membership_plans p ON m.membership_plan_id = p.id
      LEFT JOIN batches b ON m.selected_batch_id = b.id
      WHERE REPLACE(m.mobileNo, ' ', '') LIKE ? 
         OR ? LIKE CONCAT('%', REPLACE(m.mobileNo, ' ', ''), '%')
      LIMIT 1
    `, [`%${cleanPhone}%`, cleanPhone]);

    return rows && rows.length > 0 ? this.mapRowToMember(rows[0]) : null;
  }

  async getByEmail(email: string): Promise<any | null> {
    const pool = await getDbPool();
    const [rows]: any = await pool.query(`
      SELECT m.*, p.name as planName, b.batch_name as batchName 
      FROM members m
      LEFT JOIN membership_plans p ON m.membership_plan_id = p.id
      LEFT JOIN batches b ON m.selected_batch_id = b.id
      WHERE LOWER(m.email) = LOWER(?)
      LIMIT 1
    `, [email.trim()]);
    return rows && rows.length > 0 ? this.mapRowToMember(rows[0]) : null;
  }

  async getByMembershipNo(membershipNo: string): Promise<any | null> {
    const pool = await getDbPool();
    const [rows]: any = await pool.query(`
      SELECT m.*, p.name as planName, b.batch_name as batchName 
      FROM members m
      LEFT JOIN membership_plans p ON m.membership_plan_id = p.id
      LEFT JOIN batches b ON m.selected_batch_id = b.id
      WHERE m.membershipNo = ?
      LIMIT 1
    `, [membershipNo]);

    return rows && rows.length > 0 ? this.mapRowToMember(rows[0]) : null;
  }

  async create(member: any): Promise<any> {
    try {
      const pool = await getDbPool();
      
      const [result]: any = await pool.query(`
        INSERT INTO members (
          membershipNo, applicationNo, fullName, email, mobileNo, gender, age, dateOfBirth,
          addressLine1, city, state, pincode, emergencyName, emergencyPhone, emergencyMobile,
          emergencyRelation, hasMedicalCondition, medicalDetails, bloodGroup,
          academyId, selected_batch_id, membership_plan_id,
          registration_status, payment_status, membership_status, login_enabled,
          registrationDate, photoUrl, amountPaid, paymentMethod, paymentDate, txnId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        member.membershipNo,
        member.applicationNo,
        member.fullName,
        member.email || null,
        member.mobileNo,
        member.gender,
        member.age || null,
        member.dateOfBirth || null,
        member.addressLine1 || null,
        member.city || null,
        member.state || null,
        member.pincode || null,
        member.emergencyName,
        member.emergencyPhone,
        member.emergencyMobile || member.emergencyPhone,
        member.emergencyRelation || null,
        member.hasMedicalCondition || "No",
        member.medicalDetails || "",
        member.bloodGroup || "O+",
        member.academyId || "swim",
        member.selected_batch_id || null,
        member.membership_plan_id || null,
        member.registration_status || "Pending",
        member.payment_status || "Pending",
        member.membership_status || "Inactive",
        member.login_enabled ? 1 : 0,
        member.registrationDate || new Date().toLocaleDateString(),
        member.photoUrl || null,
        member.amountPaid || 0,
        member.paymentMethod || null,
        member.paymentDate || null,
        member.txnId || null
      ]);

      const insertedId = result?.insertId;
      let insertedRow: any = [];
      if (insertedId) {
        [insertedRow] = await pool.query(`
          SELECT m.*, p.name as planName, b.batch_name as batchName 
          FROM members m
          LEFT JOIN membership_plans p ON m.membership_plan_id = p.id
          LEFT JOIN batches b ON m.selected_batch_id = b.id
          WHERE m.id = ?
        `, [insertedId]);
      }
      if (!insertedRow || !insertedRow[0]) {
        [insertedRow] = await pool.query(`
          SELECT m.*, p.name as planName, b.batch_name as batchName 
          FROM members m
          LEFT JOIN membership_plans p ON m.membership_plan_id = p.id
          LEFT JOIN batches b ON m.selected_batch_id = b.id
          WHERE m.membershipNo = ?
        `, [member.membershipNo]);
      }

      console.log(`✅ Member record created in database: ${member.fullName} (${member.membershipNo}) - Status: ${member.registration_status || 'Pending'}`);
      return (insertedRow && insertedRow[0]) ? this.mapRowToMember(insertedRow[0]) : member;
    } catch (err) {
      console.error("❌ Database Insert Error in MemberRepository.create:", err);
      throw err;
    }
  }

  async update(membershipNo: string, details: any): Promise<any> {
    const pool = await getDbPool();

    // Dynamically build the UPDATE query based on fields provided
    const fieldsToUpdate: string[] = [];
    const values: any[] = [];

    const fieldMap: { [key: string]: string } = {
      fullName: "fullName",
      email: "email",
      gender: "gender",
      age: "age",
      dateOfBirth: "dateOfBirth",
      addressLine1: "addressLine1",
      addressLine2: "addressLine2",
      city: "city",
      state: "state",
      pincode: "pincode",
      parentName: "parentName",
      parentMobile: "parentMobile",
      parentRelation: "parentRelation",
      emergencyName: "emergencyName",
      emergencyPhone: "emergencyPhone",
      emergencyMobile: "emergencyMobile",
      emergencyRelation: "emergencyRelation",
      hasMedicalCondition: "hasMedicalCondition",
      medicalDetails: "medicalDetails",
      bloodGroup: "bloodGroup",
      photoUrl: "photoUrl",
      mobileNo: "mobileNo",
      registrationDate: "registrationDate",
      selected_batch_id: "selected_batch_id",
      membership_plan_id: "membership_plan_id",
      registration_status: "registration_status",
      payment_status: "payment_status",
      membership_status: "membership_status",
      login_enabled: "login_enabled",
      remarks: "remarks"
    };

    for (const [key, colName] of Object.entries(fieldMap)) {
      if (details[key] !== undefined) {
        fieldsToUpdate.push(`${colName} = ?`);
        if (key === "login_enabled") {
          values.push(details[key] ? 1 : 0);
        } else {
          values.push(details[key]);
        }
      }
    }

    if (fieldsToUpdate.length === 0) {
      return this.getByMembershipNo(membershipNo);
    }

    values.push(membershipNo);
    await pool.query(`
      UPDATE members 
      SET ${fieldsToUpdate.join(", ")} 
      WHERE membershipNo = ?
    `, values);

    return this.getByMembershipNo(membershipNo);
  }

  async delete(membershipNo: string): Promise<boolean> {
    const pool = await getDbPool();
    const [result]: any = await pool.query("DELETE FROM members WHERE membershipNo = ?", [membershipNo]);
    return result.affectedRows > 0;
  }
}
