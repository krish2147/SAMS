import test from "node:test";
import assert from "node:assert/strict";
import { batchWithTiming, daysLeftText, dueReminderStage, indiaToday } from "./renewal-reminder.service";
import { replaceTemplateVariables, DEFAULT_TEMPLATES } from "./communication.service";

test("a reminder is due a week before and on the last day, once per stage", () => {
  const today = "2026-10-19";
  assert.equal(dueReminderStage("2026-11-05", today), null); // 17 days left
  assert.equal(dueReminderStage("2026-10-27", today), null); // 8 days left
  assert.deepEqual(dueReminderStage("2026-10-26", today), { stage: "week", daysLeft: 7 });
  assert.deepEqual(dueReminderStage("2026-10-21", today), { stage: "week", daysLeft: 2 });
  assert.deepEqual(dueReminderStage("2026-10-20", today), { stage: "last-day", daysLeft: 1 });
  assert.deepEqual(dueReminderStage("2026-10-19", today), { stage: "last-day", daysLeft: 0 });
  assert.equal(dueReminderStage("2026-10-18", today), null); // already ended
});

test("days-left wording and India date", () => {
  assert.equal(daysLeftText(7), "in 7 days");
  assert.equal(daysLeftText(1), "tomorrow");
  assert.equal(daysLeftText(0), "today");
  // 20:00 UTC on 18 Oct is 01:30 on 19 Oct in India.
  assert.equal(indiaToday(new Date("2026-10-18T20:00:00Z")), "2026-10-19");
});

test("the renewal message uses the real number of days", () => {
  const template = DEFAULT_TEMPLATES.find((t) => t.event_key === "renewal_reminder")!;
  const text = replaceTemplateVariables(template.whatsapp_content, {
    memberName: "Priya", membershipNo: "BSF-2026-0142", expiryDate: "26/10/2026", batch: "Morning A", daysLeftText: "in 7 days", paymentLink: "https://sams.up.railway.app"
  });
  assert.match(text, /ends in 7 days, on 26\/10\/2026/);
  assert.doesNotMatch(text, /3 days/);
});

test("the batch is shown with its timing", () => {
  assert.equal(batchWithTiming("Morning Batch 1 (06:00 AM - 07:00 AM)", "06:00 AM", "07:00 AM"), "Morning Batch 1 (06:00 AM - 07:00 AM)");
  assert.equal(batchWithTiming("Ladies", "07:00 AM", "08:00 AM"), "Ladies (07:00 AM - 08:00 AM)");
  assert.equal(batchWithTiming(null, null, null), "your batch");
});
