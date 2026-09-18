import assert from "node:assert/strict";
import test from "node:test";
import { MemberRepository } from "../repositories/member.repository";
import { MemberService } from "./member.service";
import { getDbPool } from "../config/db";
import { MemberController } from "../controllers/member.controller";

test("rejection requires a reason, stores audit metadata, and gates permanent deletion", {
  skip: process.env.RUN_MYSQL_INTEGRATION !== "1"
}, async () => {
  const repository = new MemberRepository();
  const service = new MemberService();
  const membershipNo = `REJECT-${Date.now()}`;
  await repository.create({
    membershipNo, applicationNo:`APP-${Date.now()}`, fullName:"Rejection Audit Test", email:`reject-${Date.now()}@example.test`,
    mobileNo:`98${String(Date.now()).slice(-8)}`, gender:"female", emergencyName:"Contact", emergencyPhone:"9876500000",
    registration_status:"Pending", payment_status:"Pending", membership_status:"Inactive", login_enabled:false
  });

  await assert.rejects(() => service.rejectMember(membershipNo, { reason:"", rejectedBy:"Admin" }), /reason is required/i);

  const pool=await getDbPool();
  const [paymentsBefore]:any=await pool.query("SELECT * FROM payments WHERE member_id = ?",[(await repository.getByMembershipNo(membershipNo)).id]);

  const rejected = await service.rejectMember(membershipNo, { reason:"Required document is unreadable", adminNote:"Applicant may resubmit", rejectedBy:"Operations Admin" });
  assert.equal(rejected.registration_status,"Rejected");
  assert.equal(rejected.rejectionReason,"Required document is unreadable");
  assert.equal(rejected.rejectionAdminNote,"Applicant may resubmit");
  assert.equal(rejected.rejectedBy,"Operations Admin");
  assert.ok(rejected.rejectedAt);
  const [paymentsAfter]:any=await pool.query("SELECT * FROM payments WHERE member_id = ?",[rejected.id]);
  assert.equal(paymentsAfter.length,paymentsBefore.length,"reject must not create a Razorpay payment record");
  await assert.rejects(()=>service.rejectMember(membershipNo,{reason:"Reject twice",rejectedBy:"Admin"}),/Only pending or approved applications/);

  const controller:any=new MemberController();
  controller.memberService={rejectMember:async()=>({...rejected,id:rejected.id,registration_status:"Rejected"})};
  const invalidState:any={};
  const invalidResponse:any={status(code:number){invalidState.status=code;return this;},json(body:any){invalidState.body=body;return this;}};
  await controller.reject({body:{membershipNo,reason:""},user:{name:"Operations Admin"}} as any,invalidResponse,(error:any)=>{throw error;});
  assert.equal(invalidState.status,400);
  assert.match(invalidState.body.error,/reason is required/i);
  const responseState:any={};
  const response:any={status(code:number){responseState.status=code;return this;},json(body:any){responseState.body=body;return this;}};
  await controller.reject({body:{membershipNo,reason:"Required document is unreadable"},user:{name:"Operations Admin"}} as any,response,(error:any)=>{throw error;});
  assert.equal(responseState.body.success,true);
  assert.equal(responseState.body.memberId,rejected.id);
  assert.equal(responseState.body.status,"Rejected");
  const archived=await service.deleteMember(membershipNo,{userId:"usr_admin_1",name:"Operations Admin",role:"admin",academyId:"swim"});
  assert.equal(archived.action,"MEMBER_ARCHIVED");
  assert.equal(await repository.getByMembershipNo(membershipNo),null);
  assert.ok(await repository.getByMembershipNo(membershipNo,{includeArchived:true}));
});

test("approved unpaid applications may be rejected, but paid or active members may not", {
  skip: process.env.RUN_MYSQL_INTEGRATION !== "1"
}, async () => {
  const repository = new MemberRepository();
  const service = new MemberService();
  const seed = async (suffix:string,payment_status:string,membership_status:string) => {
    const unique=`${suffix}-${Date.now()}`;
    const membershipNo=`REJECT-APPROVED-${unique}`;
    await repository.create({
      membershipNo,applicationNo:`APP-${unique}`,fullName:`Approved ${suffix}`,
      email:`approved-${unique}@example.test`,mobileNo:`97${String(Date.now()).slice(-8)}`,
      gender:"female",emergencyName:"Contact",emergencyPhone:"9876500000",
      registration_status:"Approved",payment_status,membership_status,login_enabled:membership_status==="Active"
    });
    return membershipNo;
  };

  const unpaid=await seed("unpaid","Pending","Inactive");
  const rejected=await service.rejectMember(unpaid,{reason:"Approval entered in error",rejectedBy:"Operations Admin"});
  assert.equal(rejected.registration_status,"Rejected");

  const paid=await seed("paid","Paid","Active");
  await assert.rejects(()=>service.rejectMember(paid,{reason:"Unsafe rejection",rejectedBy:"Operations Admin"}),/paid or active member cannot be rejected/i);
  assert.equal((await repository.getByMembershipNo(paid)).registration_status,"Approved");
});
