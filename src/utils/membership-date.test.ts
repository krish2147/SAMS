import assert from "node:assert/strict";
import test from "node:test";
import {
  addCalendarMonthsClamped, calculateActivationMembershipPeriod,
  calculateMembershipPeriod, calendarDaysBetween, toDateOnlyString
} from "./membership-date";

for (const [start, months, expected] of [
  ["04/06/2026", 1, "2026-07-03"],
  ["26/08/2026", 1, "2026-09-25"],
  ["01/01/2026", 1, "2026-01-31"],
  ["04/06/2026", 3, "2026-09-03"],
  ["01/01/2026", 3, "2026-03-31"],
  ["10/02/2026", 6, "2026-08-09"],
  ["04/06/2026", 12, "2027-06-03"]
] as const) {
  test(`${start} plus ${months} calendar month(s) is inclusive through ${expected}`, () => {
    assert.equal(calculateMembershipPeriod(start, { durationMonths: months }).expiryDateStr, expected);
  });
}

test("month-end addition clamps before subtracting the inclusive day", () => {
  assert.equal(addCalendarMonthsClamped("2026-01-31", 1), "2026-02-28");
  assert.equal(calculateMembershipPeriod("2026-01-31", { durationMonths: 1 }).expiryDateStr, "2026-02-27");
  assert.equal(calculateMembershipPeriod("2026-02-28", { durationMonths: 1 }).expiryDateStr, "2026-03-27");
  assert.equal(calculateMembershipPeriod("2026-03-31", { durationMonths: 1 }).expiryDateStr, "2026-04-29");
});

test("leap-day membership calculation stays on calendar dates", () => {
  assert.equal(addCalendarMonthsClamped("2028-02-29", 1), "2028-03-29");
  assert.equal(calculateMembershipPeriod("2028-02-29", { durationMonths: 1 }).expiryDateStr, "2028-03-28");
  assert.equal(calculateMembershipPeriod("2028-02-29", { durationMonths: 12 }).expiryDateStr, "2029-02-27");
});

test("day-based periods use duration days minus one without pretending days are months", () => {
  assert.equal(calculateMembershipPeriod("2026-06-04", { durationDays: 30 }).expiryDateStr, "2026-07-03");
  assert.equal(calculateMembershipPeriod("2026-06-04", { durationDays: 1 }).expiryDateStr, "2026-06-04");
});

test("renewal starts the day after an inclusive current expiry", () => {
  assert.deepEqual(calculateActivationMembershipPeriod({
    activationDate: "2026-06-20", currentExpiry: "2026-07-03", durationMonths: 1
  }), { startDateStr: "2026-07-04", expiryDateStr: "2026-08-03" });
  assert.deepEqual(calculateActivationMembershipPeriod({
    activationDate: "2026-08-10", currentExpiry: "2026-07-03", durationMonths: 1
  }), { startDateStr: "2026-08-10", expiryDateStr: "2026-09-09" });
});

test("date-only parsing and arithmetic cannot shift through UTC serialization", () => {
  assert.equal(toDateOnlyString("2026-06-04T00:00:00.000Z"), "2026-06-04");
  assert.equal(toDateOnlyString("04/06/2026"), "2026-06-04");
  assert.equal(calendarDaysBetween("2026-06-04", "2026-07-03"), 29);
});
