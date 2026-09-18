import axios from "axios";

export type OtpProviderResult = { success: boolean; reason?: "invalid" | "expired" | "provider"; requestId?: string };
export interface OtpProvider { send(mobile: string): Promise<OtpProviderResult>; verify(mobile: string, otp: string): Promise<OtpProviderResult>; }

function config() {
  const authKey = (process.env.MSG91_AUTH_KEY || process.env.MSG91_AUTHKEY || "").trim();
  const templateId = (process.env.MSG91_OTP_TEMPLATE_ID || "").trim();
  if (!authKey || !templateId) throw Object.assign(new Error("OTP delivery is not configured."), { code: "OTP_NOT_CONFIGURED" });
  return { authKey, templateId };
}

function accepted(data: any) {
  const type = String(data?.type || data?.status || "").toLowerCase();
  const message = String(data?.message || "").toLowerCase();
  return !data?.hasError && (type === "success" || message.includes("otp verified success") || message.includes("sent successfully"));
}

export class Msg91OtpService implements OtpProvider {
  constructor(private readonly http: Pick<typeof axios,"get"|"post"> = axios) {}

  async send(mobile: string): Promise<OtpProviderResult> {
    const { authKey, templateId } = config();
    try {
      const response = await this.http.post("https://control.msg91.com/api/v5/otp", {}, {
        headers: { "Content-Type": "application/json", authkey: authKey },
        params: { template_id: templateId, mobile, otp_expiry: 5, otp_length: 6 }, timeout: 15000
      });
      if (!accepted(response.data)) return { success:false, reason:"provider" };
      return { success:true, requestId:String(response.data?.request_id || response.data?.message || "").slice(0,120) };
    } catch (error:any) {
      console.error(`[OTP] MSG91 send failed: ${String(error.response?.data?.message || error.message || "provider error").slice(0,180)}`);
      return { success:false, reason:"provider" };
    }
  }

  async verify(mobile: string, otp: string): Promise<OtpProviderResult> {
    const { authKey } = config();
    try {
      const response = await this.http.get("https://control.msg91.com/api/v5/otp/verify", {
        headers: { authkey: authKey }, params: { mobile, otp }, timeout: 15000
      });
      if (accepted(response.data)) return { success:true };
      const message = String(response.data?.message || "").toLowerCase();
      return { success:false, reason:message.includes("expir") ? "expired" : "invalid" };
    } catch (error:any) {
      const message = String(error.response?.data?.message || "").toLowerCase();
      if (message.includes("expir")) return { success:false, reason:"expired" };
      if (message.includes("invalid") || message.includes("incorrect")) return { success:false, reason:"invalid" };
      console.error(`[OTP] MSG91 verify failed: ${String(error.message || "provider error").slice(0,180)}`);
      return { success:false, reason:"provider" };
    }
  }
}
