import test from "node:test";
import assert from "node:assert/strict";
import { daysUntilMembershipExpiry, deriveMemberPresentationStatus } from "./member-presentation";

const today = new Date("2026-08-25T12:00:00+05:30");
const paidActive = {
  registration_status: "Approved",
  payment_status: "Paid",
  membership_status: "Active",
  login_enabled: 1
};

test("member directory presentation status follows the complete lifecycle", async t => {
  await t.test("active paid member is Active", () => {
    assert.equal(deriveMemberPresentationStatus({ ...paidActive, membership_end_date: "2026-10-25" }, today), "Active");
  });
  await t.test("approved unpaid member is Pending Payment", () => {
    assert.equal(deriveMemberPresentationStatus({ ...paidActive, payment_status: "Pending" }, today), "Pending Payment");
  });
  await t.test("expired date overrides a stale Active database value", () => {
    assert.equal(deriveMemberPresentationStatus({ ...paidActive, membership_end_date: "2026-08-24" }, today), "Expired");
  });
  await t.test("active member inside seven-day window is Expiring Soon", () => {
    assert.equal(deriveMemberPresentationStatus({ ...paidActive, membership_end_date: "2026-08-31" }, today), "Expiring Soon");
  });
  await t.test("inactive, login-disabled and rejected records are not presented as active", () => {
    assert.equal(deriveMemberPresentationStatus({ ...paidActive, login_enabled: 0 }, today), "Inactive");
    assert.equal(deriveMemberPresentationStatus({ ...paidActive, membership_status: "Inactive" }, today), "Inactive");
    assert.equal(deriveMemberPresentationStatus({ ...paidActive, registration_status: "Rejected" }, today), "Rejected");
  });
});

test("expiry calculation is date-based and deterministic", () => {
  assert.equal(daysUntilMembershipExpiry("2026-08-25", today), 0);
  assert.equal(daysUntilMembershipExpiry("2026-09-01", today), 7);
  assert.equal(daysUntilMembershipExpiry(null, today), null);
});
