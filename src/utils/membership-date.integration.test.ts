import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("all operational membership-date fallbacks use the shared calendar helper", async () => {
  const [payment, member, dashboard, attendance, receptionist] = await Promise.all([
    readFile(new URL("../services/payment.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../services/member.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../routes/member-dashboard.routes.ts", import.meta.url), "utf8"),
    readFile(new URL("../controllers/member.controller.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/ReceptionistDashboard.tsx", import.meta.url), "utf8")
  ]);
  const operationalSources = [payment, member, dashboard, attendance, receptionist].join("\n");
  assert.doesNotMatch(operationalSources, /\.setMonth\s*\(/);
  assert.match(payment, /calculateActivationMembershipPeriod/);
  assert.match(member, /calculateMembershipPeriod/);
  assert.match(dashboard, /membershipPeriodSummary/);
  assert.match(attendance, /calculateMembershipPeriod/);
  assert.match(receptionist, /calculateMembershipPeriod/);
});

test("initial, offline, manual, and self-renewal writers persist the canonical dates", async () => {
  const [payment, member, dashboard] = await Promise.all([
    readFile(new URL("../services/payment.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../services/member.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../routes/member-dashboard.routes.ts", import.meta.url), "utf8")
  ]);
  assert.match(payment, /membership_start_date = \?[\s\S]*membership_end_date = \?[\s\S]*next_renewal_date = \?/);
  assert.match(member, /membership_start_date: period\.startDateStr/);
  assert.match(member, /async activateMember[\s\S]*calculateMembershipPeriod/);
  assert.match(dashboard, /POST \/member\/renew[\s\S]*calculateActivationMembershipPeriod/);
  assert.match(dashboard, /membership_start_date = \?[\s\S]*membership_end_date = \?[\s\S]*next_renewal_date = \?/);
});

test("invoice, directory, profile, reminders, and status checks consume stored end dates", async () => {
  const [payment, invoice, repository, member, communication] = await Promise.all([
    readFile(new URL("../services/payment.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../services/pdf-invoice.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../repositories/member.repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../services/member.service.ts", import.meta.url), "utf8"),
    readFile(new URL("../services/communication.service.ts", import.meta.url), "utf8")
  ]);
  assert.match(payment, /membershipEndDate: p\.membership_end_date/);
  assert.match(invoice, /formatDate\(data\.membershipEndDate\)/);
  assert.match(repository, /membership_end_date: row\.membership_end_date/);
  assert.match(member, /expiryDate: member\.membership_end_date/);
  assert.match(communication, /ExpiryDate/);
});
