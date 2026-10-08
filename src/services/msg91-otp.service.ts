import axios from "axios";
import crypto from "crypto";

export type OtpProviderResult = { success: boolean; reason?: "invalid" | "expired" | "provider"; requestId?: string; otp?: string };
export interface OtpProvider { send(mobile: string): Promise<OtpProviderResult>; }

const SEND_ENDPOINT = "https://control.msg91.com/api/sendhttp.php";

function config() {
  const authKey = (process.env.MSG91_AUTH_KEY || process.env.MSG91_AUTHKEY || "").trim();
  const senderId = (process.env.MSG91_SENDER_ID || "").trim();
  const dltTemplateId = (process.env.MSG91_OTP_DLT_TEMPLATE_ID || "").trim();
  if (!authKey || !senderId || !dltTemplateId) {
    throw Object.assign(new Error("OTP delivery is not configured."), { code: "OTP_NOT_CONFIGURED" });
  }
  return { authKey, senderId, dltTemplateId };
}

// Must stay character-identical to the DLT-approved template body, or the telco silently drops it.
export function buildOtpMessage(otp: string) {
  return `Your OTP for Baroda Swim Front login is ${otp}. It is valid for 5 minutes. Do not share this OTP with anyone. - Baroda Swim Front`;
}

export function generateOtp(length = 6) {
  const max = 10 ** length;
  return String(crypto.randomInt(0, max)).padStart(length, "0");
}

export class Msg91OtpService implements OtpProvider {
  constructor(private readonly http: Pick<typeof axios, "get" | "post"> = axios) {}

  async send(mobile: string): Promise<OtpProviderResult> {
    const { authKey, senderId, dltTemplateId } = config();
    const otp = generateOtp();
    try {
      const response = await this.http.get(SEND_ENDPOINT, {
        params: {
          authkey: authKey,
          mobiles: mobile,
          message: buildOtpMessage(otp),
          sender: senderId,
          route: "4",
          country: "91",
          DLT_TE_ID: dltTemplateId
        },
        timeout: 15000
      });
      // A successful submission returns a bare request id; anything containing an error
      // marker means the gateway rejected it outright.
      const body = String(response.data ?? "").trim();
      if (!body || /error|invalid|failure/i.test(body)) {
        console.error(`[OTP] MSG91 rejected send: ${body.slice(0, 180)}`);
        return { success: false, reason: "provider" };
      }
      return { success: true, requestId: body.slice(0, 120), otp };
    } catch (error: any) {
      console.error(`[OTP] MSG91 send failed: ${String(error.response?.data || error.message || "provider error").slice(0, 180)}`);
      return { success: false, reason: "provider" };
    }
  }
}
