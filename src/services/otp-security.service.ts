import crypto from "crypto";
import { getDbPool } from "../config/db";

type Challenge = { memberId:number; requestedAt:number; expiresAt:number; attempts:number; verified:boolean };

export class OtpSecurityService {
  static readonly RESEND_COOLDOWN_SECONDS = 30;
  static readonly OTP_VALIDITY_SECONDS = 300;
  static readonly PHONE_REQUEST_LIMIT = 5;
  static readonly IP_REQUEST_LIMIT = 20;
  static readonly VERIFY_ATTEMPT_LIMIT = 5;
  constructor(private readonly poolFactory:typeof getDbPool=getDbPool, private readonly clock=()=>Date.now()) {}

  hash(kind:string,value:string) {
    const secret=process.env.OTP_HASH_SECRET || "development-only-otp-hash-secret";
    return crypto.createHmac("sha256",secret).update(`${kind}:${value}`).digest("hex");
  }

  async assertSendAllowed(phone:string,ip:string) {
    const phoneHash=this.hash("phone",phone); const ipHash=this.hash("ip",ip||"unknown"); const now=this.clock();
    const existing=await this.getChallenge(phoneHash);
    if(existing && now-existing.requestedAt < OtpSecurityService.RESEND_COOLDOWN_SECONDS*1000) {
      const retryAfter=Math.ceil((OtpSecurityService.RESEND_COOLDOWN_SECONDS*1000-(now-existing.requestedAt))/1000);
      throw Object.assign(new Error(`Please wait ${retryAfter} seconds before requesting another OTP.`),{status:429,code:"OTP_COOLDOWN",retryAfter});
    }
    await this.consumeLimit(phoneHash,"send_phone",OtpSecurityService.PHONE_REQUEST_LIMIT,15*60);
    await this.consumeLimit(ipHash,"send_ip",OtpSecurityService.IP_REQUEST_LIMIT,15*60);
    return phoneHash;
  }

  async releaseSend(phone:string,ip:string) {
    await Promise.all([this.releaseLimit(this.hash("phone",phone),"send_phone"),this.releaseLimit(this.hash("ip",ip||"unknown"),"send_ip")]);
  }

  async recordChallenge(phone:string,memberId:number,providerRequestId?:string) {
    const phoneHash=this.hash("phone",phone); const now=this.clock(); const expiresAt=now+OtpSecurityService.OTP_VALIDITY_SECONDS*1000;
    const pool=await this.poolFactory();
    await pool.query(`INSERT INTO otp_login_challenges
      (phone_hash,member_id,requested_at,expires_at,verify_attempts,verified_at,provider_request_id)
      VALUES (?,?,FROM_UNIXTIME(?/1000),FROM_UNIXTIME(?/1000),0,NULL,?)
      ON DUPLICATE KEY UPDATE member_id=VALUES(member_id),requested_at=VALUES(requested_at),expires_at=VALUES(expires_at),verify_attempts=0,verified_at=NULL,provider_request_id=VALUES(provider_request_id)`,
      [phoneHash,memberId,now,expiresAt,providerRequestId||null]);
  }

  async beginVerification(phone:string,ip:string) {
    const phoneHash=this.hash("phone",phone); const challenge=await this.getChallenge(phoneHash); const now=this.clock();
    if(!challenge) throw Object.assign(new Error("Request a new OTP and try again."),{status:400,code:"OTP_NOT_REQUESTED"});
    if(challenge.verified) throw Object.assign(new Error("This OTP has already been used."),{status:400,code:"OTP_ALREADY_USED"});
    if(challenge.expiresAt<=now) throw Object.assign(new Error("The OTP has expired. Request a new one."),{status:410,code:"OTP_EXPIRED"});
    if(challenge.attempts>=OtpSecurityService.VERIFY_ATTEMPT_LIMIT) throw Object.assign(new Error("Too many verification attempts. Request a new OTP."),{status:429,code:"OTP_ATTEMPTS_EXCEEDED"});
    await this.consumeLimit(this.hash("ip",ip||"unknown"),"verify_ip",30,15*60);
    const pool=await this.poolFactory(); await pool.query("UPDATE otp_login_challenges SET verify_attempts=verify_attempts+1 WHERE phone_hash=? AND verified_at IS NULL",[phoneHash]);
    return {memberId:challenge.memberId,phoneHash};
  }

  async releaseVerification(phone:string,ip:string) {
    const phoneHash=this.hash("phone",phone);
    const pool=await this.poolFactory();await pool.query("UPDATE otp_login_challenges SET verify_attempts=GREATEST(verify_attempts-1,0) WHERE phone_hash=?",[phoneHash]);
    await this.releaseLimit(this.hash("ip",ip||"unknown"),"verify_ip");
  }

  async markVerified(phoneHash:string) {
    const pool=await this.poolFactory(); await pool.query("UPDATE otp_login_challenges SET verified_at=CURRENT_TIMESTAMP WHERE phone_hash=? AND verified_at IS NULL",[phoneHash]);
  }

  private async getChallenge(phoneHash:string):Promise<Challenge|undefined>{
    const pool=await this.poolFactory();const [rows]:any=await pool.query("SELECT member_id,requested_at,expires_at,verify_attempts,verified_at FROM otp_login_challenges WHERE phone_hash=? LIMIT 1",[phoneHash]);const row=rows?.[0];
    return row?{memberId:Number(row.member_id),requestedAt:new Date(row.requested_at).getTime(),expiresAt:new Date(row.expires_at).getTime(),attempts:Number(row.verify_attempts||0),verified:Boolean(row.verified_at)}:undefined;
  }

  private async consumeLimit(scopeKey:string,action:string,max:number,windowSeconds:number){
    const pool=await this.poolFactory();
    await pool.query(`INSERT INTO otp_rate_limits(scope_key,action_name,window_started_at,request_count) VALUES (?,?,CURRENT_TIMESTAMP,1)
      ON DUPLICATE KEY UPDATE request_count=IF(window_started_at<DATE_SUB(CURRENT_TIMESTAMP,INTERVAL ? SECOND),1,request_count+1),window_started_at=IF(window_started_at<DATE_SUB(CURRENT_TIMESTAMP,INTERVAL ? SECOND),CURRENT_TIMESTAMP,window_started_at)`,[scopeKey,action,windowSeconds,windowSeconds]);
    const [rows]:any=await pool.query("SELECT request_count FROM otp_rate_limits WHERE scope_key=? AND action_name=? LIMIT 1",[scopeKey,action]);
    if(Number(rows?.[0]?.request_count||0)>max)throw Object.assign(new Error("Too many OTP requests. Please try again later."),{status:429,code:"OTP_RATE_LIMIT"});
  }

  private async releaseLimit(scopeKey:string,action:string){
    const pool=await this.poolFactory();await pool.query("UPDATE otp_rate_limits SET request_count=GREATEST(request_count-1,0) WHERE scope_key=? AND action_name=?",[scopeKey,action]);
  }
}
