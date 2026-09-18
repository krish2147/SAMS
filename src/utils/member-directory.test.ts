import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildMemberDirectoryParams, MEMBER_DIRECTORY_PAGE_SIZE } from "./member-directory";
import { MemberRepository } from "../repositories/member.repository";

test("member directory builds a bounded server-side query", () => {
  const params = buildMemberDirectoryParams({
    page: 3,
    academyId: "swim",
    search: "  BSF-2026  ",
    status: "Expiring Soon",
    planId: "27",
    batchId: "4",
    archiveState: "archived"
  });
  assert.equal(MEMBER_DIRECTORY_PAGE_SIZE, 25);
  assert.equal(params.get("page"), "3");
  assert.equal(params.get("pageSize"), "25");
  assert.equal(params.get("search"), "BSF-2026");
  assert.equal(params.get("status"), "Expiring Soon");
  assert.equal(params.get("planId"), "27");
  assert.equal(params.get("batchId"), "4");
  assert.equal(params.get("archiveState"), "archived");
});

test("member directory rejects invalid filter identifiers and normalizes bad pages", () => {
  const params = buildMemberDirectoryParams({ page: -20, academyId: "swim", planId: "1 OR 1=1", batchId: "x" });
  assert.equal(params.get("page"), "1");
  assert.equal(params.has("planId"), false);
  assert.equal(params.has("batchId"), false);
});

test("directory row mapping preserves the real plan, batch schedule and expiry", () => {
  const mapped = (new MemberRepository() as any).mapRowToMember({
    id: 42,
    membershipNo: "BSF-2026-2042",
    fullName: "Directory Test Member",
    mobileNo: "9876543210",
    registration_status: "Approved",
    payment_status: "Paid",
    membership_status: "Active",
    login_enabled: 1,
    membership_end_date: "2026-10-25",
    planName: "General 3 Days - 1 Month",
    planDurationMonths: 1,
    batchName: "Morning Batch A",
    batchStartTime: "06:00",
    batchEndTime: "07:00",
    daysRemaining: 61,
    presentationStatus: "Active"
  });
  assert.equal(mapped.typeOfMembership, "General 3 Days - 1 Month");
  assert.equal(mapped.batchName, "Morning Batch A");
  assert.equal(mapped.batchSchedule, "06:00 – 07:00");
  assert.equal(mapped.membership_end_date, "2026-10-25");
  assert.equal(mapped.presentationStatus, "Active");
});

test("active-member profile contains no approval or rejection actions", async () => {
  const source = await readFile(new URL("../components/MembersDirectory.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Approve Member|Reject Member|Approve & Send Payment Link/);
  assert.doesNotMatch(source, /label="Guardian"/);
  assert.match(source, /Submitted registration record/);
  assert.match(source, /Medical declaration/);
  assert.match(source, /Emergency contact/);
  assert.match(source, /Total payable/);
  assert.match(source, /View Payments/);
  assert.match(source, /Download Latest Invoice/);
});

test("admin profile route is authenticated and unavailable to member-role callers", async () => {
  const source = await readFile(new URL("../routes/member.routes.ts", import.meta.url), "utf8");
  const profileRoute = source.split("\n").find(line => line.includes('router.get("/members/profile/:membershipNo"')) || "";
  assert.match(profileRoute, /requireAuth/);
  assert.doesNotMatch(profileRoute, /"member"/);
  assert.doesNotMatch(profileRoute, /"parent"/);
});
