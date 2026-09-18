import assert from "node:assert/strict";
import test from "node:test";
import { assertRejectedResponse, canPermanentlyDeleteApplication, commitRejectedApplication, rejectionExitMotion, REJECTION_REDUCED_MOTION_DURATION_MS, statusCountsFor } from "./approval-workflow";

test("confirmed rejection state changes only after a successful API result",()=>{
  const pending=[{membershipNo:"APP-1",registration_status:"Pending",academyId:"swim"}];
  assert.throws(()=>assertRejectedResponse({success:false,error:"Database unavailable"}),/Database unavailable/);
  assert.equal(pending.length,1,"API failure must leave the pending card intact");

  const response=assertRejectedResponse({success:true,status:"Rejected",member:{membershipNo:"APP-1",registration_status:"Rejected"}});
  const updated=commitRejectedApplication(pending,"APP-1",response.member);
  assert.equal(updated[0].registration_status,"Rejected");
  assert.deepEqual(statusCountsFor(updated,"swim"),{Pending:0,Approved:0,Rejected:1});
});

test("permanent delete visibility is restricted to rejected applications and authorized roles",()=>{
  assert.equal(canPermanentlyDeleteApplication("Pending","super_admin"),false);
  assert.equal(canPermanentlyDeleteApplication("Rejected","staff"),false);
  assert.equal(canPermanentlyDeleteApplication("Rejected","admin"),true);
  assert.equal(canPermanentlyDeleteApplication("Rejected","super_admin"),true);
});

test("reduced motion replaces the tear with a short fade and scale",()=>{
  const reduced=rejectionExitMotion(true,"left");
  assert.equal(reduced.duration,REJECTION_REDUCED_MOTION_DURATION_MS/1000);
  assert.equal(reduced.animate.opacity,0);
  assert.equal("x" in reduced.animate,false);
  const left=rejectionExitMotion(false,"left");
  const right=rejectionExitMotion(false,"right");
  assert.equal((left.animate as any).x,-28);
  assert.equal((right.animate as any).x,28);
});
