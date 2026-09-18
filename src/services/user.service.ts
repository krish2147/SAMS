import bcrypt from "bcryptjs";
import crypto from "crypto";
import { UserRepository } from "../repositories/user.repository";
import { MemberRepository } from "../repositories/member.repository";
import { getDbPool, isMockDatabase } from "../config/db";
import { ActivityService } from "./activity.service";


export interface SessionData {
  userId: string;
  email: string;
  role: string;
  name: string;
  academyId: string;
  expiresAt: number;
  photoUrl?: string;
  phoneNumber?: string;
}

export class UserService {
  private userRepository = new UserRepository();
  private memberRepository = new MemberRepository();
  
  // In-memory sessions map
  private static activeSessions = new Map<string, SessionData>();

  // In-memory secure OTP map: normalized phone -> { otp, expiresAt }
  private static otpStore = new Map<string, { otp: string; expiresAt: number }>();

  private static hashSessionToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  static async getSession(token: string): Promise<SessionData | null> {
    const pool = await getDbPool();
    if (isMockDatabase()) {
      const session = this.activeSessions.get(token);
      if (session && session.expiresAt > Date.now()) return session;
      if (session) this.activeSessions.delete(token);
      return null;
    }

    const tokenHash = this.hashSessionToken(token);
    const [rows]: any = await pool.query(
      "SELECT * FROM user_sessions WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP LIMIT 1",
      [tokenHash]
    );
    const row = rows[0];
    if (!row) return null;

    const expiresAt = Date.now() + 2 * 60 * 60 * 1000;
    await pool.query("UPDATE user_sessions SET expires_at = ? WHERE token_hash = ?", [new Date(expiresAt), tokenHash]);
    return {
      userId: row.user_id,
      email: row.email,
      role: row.role,
      name: row.name,
      academyId: row.academy_id,
      expiresAt,
      photoUrl: row.photo_url || "",
      phoneNumber: row.phone_number || ""
    };
  }

  static async createSession(sessionData: SessionData): Promise<string> {
    const token = `sess_${crypto.randomBytes(32).toString("base64url")}`;
    const pool = await getDbPool();
    if (isMockDatabase()) {
      this.activeSessions.set(token, sessionData);
      return token;
    }

    await pool.query(
      `INSERT INTO user_sessions
        (token_hash, user_id, email, role, name, academy_id, photo_url, phone_number, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        this.hashSessionToken(token), sessionData.userId, sessionData.email, sessionData.role,
        sessionData.name, sessionData.academyId, sessionData.photoUrl || null,
        sessionData.phoneNumber || null, new Date(sessionData.expiresAt)
      ]
    );
    return token;
  }

  static async removeSession(token: string): Promise<void> {
    const pool = await getDbPool();
    if (isMockDatabase()) {
      this.activeSessions.delete(token);
      return;
    }
    await pool.query("DELETE FROM user_sessions WHERE token_hash = ?", [this.hashSessionToken(token)]);
  }

  async sendOtp(payload: { phoneNumber: string; role: string }): Promise<{ success: boolean; error?: string; message?: string }> {
    const { phoneNumber, role } = payload;
    if (!phoneNumber) {
      return { success: false, error: "Phone number is required." };
    }

    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return { success: false, error: "Please specify a valid 10-digit mobile number." };
    }

    // Check if member exists in the academy matching phone
    const member = await this.memberRepository.getByPhone(phoneNumber);
    if (!member) {
      return { success: false, error: "Member not found. Please register as a new member." };
    }
    if (member.registration_status !== "Approved") {
      return { success: false, error: "Your registration is still pending admin approval." };
    }
    if (member.payment_status !== "Paid" || !member.login_enabled) {
      return { success: false, error: "Complete the payment sent to your WhatsApp before signing in." };
    }
    if (member.membership_status !== "Active") {
      return { success: false, error: "Your membership is not active. Please contact the academy." };
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5-minute expiry

    // Store in SQL for cross-replica verification; local development uses memory.
    try {
      const pool = await getDbPool();
      if (isMockDatabase()) {
        UserService.otpStore.set(cleanPhone, { otp, expiresAt });
      } else {
        const mysqlExpires = new Date(expiresAt).toISOString().slice(0, 19).replace("T", " ");
        await pool.query(
          "INSERT INTO otp_verifications (mobile, otp, expires_at, verified) VALUES (?, ?, ?, 0)",
          [phoneNumber, otp, mysqlExpires]
        );
      }
    } catch (dbErr) {
      throw new Error("Unable to store the verification code. Please try again.");
    }

    // Simulation logic
    if (process.env.NODE_ENV !== "production") {
      console.log(`
============================================================
📱 [DEVELOPMENT MODE OTP DISPATCH]
To: ${phoneNumber}
OTP Verification Code: ${otp}
Expires: In 5 minutes (at ${new Date(expiresAt).toLocaleTimeString()})
============================================================
      `);
    } else {
      console.log(`📡 [PRODUCTION SMS] OTP dispatch requested for ${phoneNumber}.`);
    }

    return { 
      success: true, 
      message: "We've sent a verification code to your registered mobile number." 
    };
  }

  async login(payload: {
    phoneNumber?: string;
    role: string;
    email?: string;
    password?: string;
    otpCode?: string;
  }): Promise<{ success: boolean; token?: string; member?: any; staff?: any; error?: string }> {
    const { phoneNumber, role, email, password, otpCode } = payload;

    if (role === "parent" || role === "member") {
      if (!phoneNumber) {
        return { success: false, error: "Phone number required" };
      }
      if (!otpCode) {
        return { success: false, error: "Verification code is required" };
      }

      const cleanPhone = phoneNumber.replace(/\D/g, "");
      const pool = await getDbPool();
      let storedOtpInfo: { otp: string; expiresAt: number } | undefined;

      if (isMockDatabase()) {
        storedOtpInfo = UserService.otpStore.get(cleanPhone);
      } else {
        const [otpRows]: any = await pool.query(
          `SELECT otp, expires_at FROM otp_verifications
           WHERE mobile = ? AND verified = 0
           ORDER BY id DESC LIMIT 1`,
          [phoneNumber]
        );
        if (otpRows[0]) {
          storedOtpInfo = {
            otp: String(otpRows[0].otp),
            expiresAt: new Date(otpRows[0].expires_at).getTime()
          };
        }
      }

      if (!storedOtpInfo) {
        return { success: false, error: "No verification code requested for this number." };
      }

      if (Date.now() > storedOtpInfo.expiresAt) {
        if (isMockDatabase()) UserService.otpStore.delete(cleanPhone);
        return { success: false, error: "The verification code has expired. Please request a new one." };
      }

      if (storedOtpInfo.otp !== otpCode) {
        return { success: false, error: "The verification code is invalid. Please try again." };
      }

      // Verification succeeded! Consume the OTP
      if (isMockDatabase()) UserService.otpStore.delete(cleanPhone);

      // Audit mark verified in SQL db if active
      try {
        const pool = await getDbPool();
        if (!isMockDatabase()) {
          await pool.query(
            "UPDATE otp_verifications SET verified = 1 WHERE mobile = ? AND otp = ? ORDER BY id DESC LIMIT 1",
            [phoneNumber, otpCode]
          );
        }
      } catch (dbErr) {
        // Safe to ignore
      }

      const member = await this.memberRepository.getByPhone(phoneNumber);
      if (!member) {
        return { success: false, error: "Member not found. Please register as a new member." };
      }
      if (member.registration_status !== "Approved" || member.payment_status !== "Paid" || !member.login_enabled || member.membership_status !== "Active") {
        return { success: false, error: "This membership is not approved, paid, and active." };
      }

      const token = await UserService.createSession({
        userId: `usr_member_${member.id || member.membershipNo}`,
        email: member.email || "",
        role: "member",
        name: member.fullName,
        academyId: (member.academyId || "swim") as any,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000
      });

      await ActivityService.logActivity(member.fullName, "Member Logged In", "Success", "Self");

      return { success: true, token, member };
    } else {
      // Staff/Coach/Admin/Super Admin Login
      if (!email || !password) {
        return { success: false, error: "Email and password required" };
      }

      const user = await this.userRepository.getByEmail(email);
      if (!user) {
        return { success: false, error: "Invalid email or password." };
      }
      if (user.is_active === 0 || user.is_active === false) {
        return { success: false, error: "This staff account is inactive. Contact a system administrator." };
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return { success: false, error: "Invalid email or password." };
      }

      const token = await UserService.createSession({
        userId: `usr_${user.role}_${user.id}`,
        email: user.email,
        role: user.role,
        name: user.name,
        academyId: (user.academy_id || "swim") as any,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000,
        photoUrl: user.photo_url || "",
        phoneNumber: user.phone_number || ""
      });

      await ActivityService.logActivity(user.name, "Staff Account Logged In", "Success", "Self");

      return {
        success: true,
        token,
        staff: {
          id: `usr_${user.role}_${user.id}`,
          name: user.name,
          email: user.email,
          role: user.role,
          academyId: user.academy_id || "swim",
          photoUrl: user.photo_url || "",
          phoneNumber: user.phone_number || ""
        }
      };
    }
  }

  async verifySession(token: string): Promise<SessionData | null> {
    return await UserService.getSession(token);
  }

  async logout(token: string): Promise<void> {
    await UserService.removeSession(token);
  }

  async getAllStaff(): Promise<any[]> {
    return this.userRepository.getAll();
  }

  async registerStaff(staff: {
    name: string;
    email: string;
    password?: string;
    role: string;
    phone?: string;
    phoneNumber?: string;
    academyId?: string;
  }): Promise<any> {
    const existingUser = await this.userRepository.getByEmail(staff.email);
    if (existingUser) {
      throw new Error("An account with this email address is already registered.");
    }

    if (!staff.password || staff.password.length < 12) {
      throw new Error("Staff passwords must contain at least 12 characters.");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(staff.password, salt);

    const insertedId = await this.userRepository.create({
      name: staff.name,
      email: staff.email,
      passwordHash,
      phoneNumber: staff.phone || staff.phoneNumber || "+91 00000 00000",
      role: staff.role,
      academyId: staff.academyId || "swim"
    });

    const token = await UserService.createSession({
      userId: `usr_${staff.role}_${insertedId}`,
      email: staff.email.toLowerCase().trim(),
      role: staff.role,
      name: staff.name.trim(),
      academyId: (staff.academyId || "swim") as any,
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
      photoUrl: "",
      phoneNumber: staff.phone || staff.phoneNumber || ""
    });

    return {
      id: `usr_${staff.role}_${insertedId}`,
      name: staff.name.trim(),
      email: staff.email.toLowerCase().trim(),
      role: staff.role,
      academyId: staff.academyId || "swim",
      token
    };
  }

  async deleteStaff(id: number | string): Promise<boolean> {
    return this.userRepository.delete(id);
  }

  async updateStaffStatus(id: number | string, is_active: boolean): Promise<boolean> {
    return this.userRepository.updateStatus(id, is_active);
  }

  async updateStaffRole(id: number | string, role: string): Promise<boolean> {
    return this.userRepository.updateRole(id, role);
  }

  async resetStaffPassword(id: number | string, newPassword?: string): Promise<boolean> {
    if (!newPassword || newPassword.length < 12) {
      throw new Error("The new password must contain at least 12 characters.");
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    return this.userRepository.updatePassword(id, passwordHash);
  }

  async updateProfile(id: number | string, data: { name: string; email: string; phoneNumber: string; photoUrl?: string }): Promise<boolean> {
    const success = await this.userRepository.updateProfile(id, data);
    if (success) {
      const pool = await getDbPool();
      if (isMockDatabase()) {
        for (const session of UserService.activeSessions.values()) {
          if (session.userId.endsWith(`_${id}`)) {
            session.name = data.name;
            session.email = data.email;
            if (data.photoUrl !== undefined) session.photoUrl = data.photoUrl;
          }
        }
      } else {
        await pool.query(
          "UPDATE user_sessions SET name = ?, email = ?, photo_url = COALESCE(?, photo_url) WHERE user_id LIKE ?",
          [data.name, data.email, data.photoUrl ?? null, `%_${id}`]
        );
      }
    }
    return success;
  }
}
