import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calendarDaysFromToday, firstName, getMembershipDisplayStatus, greetingForHour, membershipProgress, receiptDownloadHref, receiptHref } from "./member-overview-data";
import { memberQrPayload, membershipCardFilename } from "./download-membership-card";

test("uses the authenticated full name's first word and local-hour greeting", () => {
  assert.equal(firstName("  Krish Patel "), "Krish");
  assert.equal(greetingForHour(8), "Good morning");
  assert.equal(greetingForHour(14), "Good afternoon");
  assert.equal(greetingForHour(20), "Good evening");
});

test("membership display status respects stored expiry and expiring window", () => {
  assert.equal(getMembershipDisplayStatus("Active", "2026-09-09", 5), "Active");
  assert.equal(getMembershipDisplayStatus("Active", "2026-09-08", 4), "Expiring Soon");
  assert.equal(getMembershipDisplayStatus("Active", "2026-09-04", 0), "Expiring Soon");
  assert.equal(getMembershipDisplayStatus("Active", "2026-11-24", 81), "Active");
  assert.equal(getMembershipDisplayStatus("Active", "2026-09-03", -1), "Expired");
  assert.equal(getMembershipDisplayStatus("Inactive", null, null), "Pending");
});

test("membership progress uses stored boundaries and clamps the display", () => {
  assert.equal(membershipProgress("2026-09-01", "2026-09-11", new Date(2026, 8, 6)), 50);
  assert.equal(membershipProgress("2026-09-01", "2026-09-11", new Date(2026, 7, 1)), 0);
  assert.equal(membershipProgress("2026-09-01", "2026-09-11", new Date(2026, 9, 1)), 100);
  assert.equal(membershipProgress(null, "2026-09-11"), null);
});

test("receipt links are only created for generated member-owned references", () => {
  assert.equal(receiptHref({ amount: 100, status: "Paid", hasReceipt: true, receiptNo: "BSF REC/42" }), "/api/member/payments/receipt/BSF%20REC%2F42");
  assert.equal(receiptHref({ amount: 100, status: "Paid", hasReceipt: false, receiptNo: "BSF-REC-42" }), null);
  assert.equal(receiptDownloadHref({ amount: 100, status: "Paid", hasReceipt: true, receiptNo: "BSF-REC-42" }), "/api/member/payments/receipt/BSF-REC-42?download=true");
});

test("future membership starts use calendar-day arithmetic without timezone shifting", () => {
  assert.equal(calendarDaysFromToday("2026-09-06", new Date(2026, 8, 4, 23, 30)), 2);
});

test("membership card download exports the rendered authenticated card without a second backend document route", async () => {
  const source = await readFile(new URL("MyMembershipPage.tsx", import.meta.url), "utf8");
  assert.match(source, /Download membership card/);
  assert.match(source, /downloadMembershipCardPng\(data\)/);
  assert.doesNotMatch(source, /fetch\([^)]*membership-card/);
});

test("downloaded membership card uses the existing scanner-compatible member identity payload", () => {
  assert.deepEqual(JSON.parse(memberQrPayload("BSF-2026-42")), { type: "BSF_MEMBER_PASS", membershipNo: "BSF-2026-42", v: 1 });
  assert.equal(membershipCardFilename("BSF/2026 42"), "BSF-2026-42-membership-card.png");
});
