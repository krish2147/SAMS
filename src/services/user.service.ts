import bcrypt from "bcryptjs";
import crypto from "crypto";
import { UserRepository } from "../repositories/user.repository";
import { MemberRepository } from "../repositories/member.repository";
import { getDbPool, isMockDatabase } from "../config/db";
import { ActivityService } from "./activity.service";
import { Msg91OtpService, type OtpProvider } from "./msg91-otp.service";
import { OtpSecurityService } from "./otp-security.service";
import { normalizeIndianMobile } from "../utils/phone";
import { toDateOnlyString, calendarToday } from "../utils/membership-date";


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
  private memberRepository: MemberRepository;
  private otpProvider: OtpProvider;
  private otpSecurity: OtpSecurityService;

  // In-memory sessions map
  private static activeSessions = new Map<string, SessionData>();

  constructor(deps?: { memberRepository?: MemberRepository; otpProvider?: OtpProvider; otpSecurity?: OtpSecurityService }) {
    this.memberRepository = deps?.memberRepository || new MemberRepository();
    this.otpProvider = deps?.otpProvider || new Msg91OtpService();
    this.otpSecurity = deps?.otpSecurity || new OtpSecurityService();
  }

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

  /**
   * A member is eligible for OTP login only once admin-approved, paid, and
   * actively within their membership window — the same gate the legacy flow
   * used, plus an inclusive membership_end_date check via membership-date.ts.
   */
  private isMemberEligibleForOtpLogin(member: any): boolean {
    if (!member) return false;
    if (member.blocked) return false;
    if (member.is_deleted) return false;
    if (member.registration_status !== "Approved") return false;
    if (member.payment_status !== "Paid") return false;
    if (member.membership_status !== "Active") return false;
    if (!member.login_enabled) return false;
    const endDateStr = toDateOnlyString(member.membership_end_date);
    if (endDateStr && endDateStr < calendarToday()) return false;
    return true;
  }

  async sendOtp(payload: { phoneNumber: string; role: string; ipAddress?: string }): Promise<{ success: boolean; error?: string; message?: string; code?: string }> {
    const { phoneNumber, role, ipAddress } = payload;
    if (role !== "member" && role !== "parent") {
      return { success: false, error: "OTP login is only available for members.", code: "OTP_ROLE_UNSUPPORTED" };
    }

    let phone: string;
    try {
      phone = normalizeIndianMobile(phoneNumber).international;
    } catch (err: any) {
      return { success: false, error: err.message || "Enter a valid Indian mobile number.", code: "INVALID_PHONE" };
    }

    // Same generic denial whether the member is missing or simply ineligible,
    // so this endpoint can't be used to enumerate registered phone numbers.
    const member = await this.memberRepository.getByPhone(phone);
    if (!this.isMemberEligibleForOtpLogin(member)) {
      return { success: false, error: "This mobile number is not eligible for OTP login yet.", code: "MEMBER_INELIGIBLE" };
    }

    try {
      await this.otpSecurity.assertSendAllowed(phone, ipAddress || "unknown");
    } catch (err: any) {
      return { success: false, error: err.message, code: err.code || "OTP_SEND_BLOCKED" };
    }

    let sendResult;
    try {
      sendResult = await this.otpProvider.send(phone);
    } catch (err: any) {
      sendResult = { success: false as const, reason: "provider" as const };
    }

    if (!sendResult.success) {
      await this.otpSecurity.releaseSend(phone, ipAddress || "unknown");
      return { success: false, error: "We couldn't send the verification code. Please try again shortly.", code: "OTP_PROVIDER_FAILURE" };
    }

    await this.otpSecurity.recordChallenge(phone, member.id, sendResult.requestId, sendResult.otp);

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
    ipAddress?: string;
  }): Promise<{ success: boolean; token?: string; member?: any; staff?: any; error?: string; code?: string }> {
    const { phoneNumber, role, email, password, otpCode, ipAddress } = payload;

    if (role === "parent" || role === "member") {
      if (!phoneNumber) {
        return { success: false, error: "Phone number required" };
      }
      if (!otpCode) {
        return { success: false, error: "Verification code is required" };
      }

      let phone: string;
      try {
        phone = normalizeIndianMobile(phoneNumber).international;
      } catch (err: any) {
        return { success: false, error: err.message || "Enter a valid Indian mobile number." };
      }

      let verification: { memberId: number; phoneHash: string };
      try {
        verification = await this.otpSecurity.beginVerification(phone, ipAddress || "unknown");
      } catch (err: any) {
        return { success: false, error: err.message, code: err.code };
      }

      // Expiry/attempt/cooldown checks already ran in beginVerification above; this only
      // compares the submitted code against the hash stored when the SMS was sent.
      if (!(await this.otpSecurity.checkOtp(phone, otpCode))) {
        return { success: false, error: "The verification code is invalid. Please try again.", code: "OTP_INVALID" };
      }

      await this.otpSecurity.markVerified(verification.phoneHash);

      const member = await this.memberRepository.getByPhone(phone);
      if (!this.isMemberEligibleForOtpLogin(member)) {
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
