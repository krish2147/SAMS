import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { MemberDeletionError, MemberDeletionService } from "./member-deletion.service";
import { MemberController } from "../controllers/member.controller";
import { requireAuth } from "../middleware/authMiddleware";
import { UserService } from "./user.service";
import { getDbPool } from "../config/db";

const actor = { userId: "usr_admin_7", name: "Academy Admin", role: "admin", academyId: "swim" };

function harness(memberOverrides: Record<string, unknown> = {}, options: { failArchive?: boolean } = {}) {
  const member = {
    id: 42, membershipNo: "BSF-OLD-42", fullName: "Old Member", academyId: "swim",
    registration_status: "Approved", payment_status: "Paid", membership_status: "Inactive",
    membership_end_date: "2025-01-01", selected_batch_id: 3, deleted_at: null,
    ...memberOverrides
  };
  const queries: { sql: string; params: any[] }[] = [];
  let commits = 0; let rollbacks = 0;
  const connection = {
    beginTransaction: async () => {},
    query: async (sql: string, params: any[] = []) => {
      queries.push({ sql, params });
      if (sql.includes("FROM members WHERE membershipNo")) return [[memberOverrides.missing ? undefined : member].filter(Boolean), null];
      if (sql.includes("UPDATE members")) {
        if (options.failArchive) throw new Error("database write failed");
        return [{ affectedRows: 1 }, null];
      }
      return [{ affectedRows: 1 }, null];
    },
    commit: async () => { commits += 1; },
    rollback: async () => { rollbacks += 1; },
    release: () => {}
  };
  const service = new MemberDeletionService(async () => ({ getConnection: async () => connection }) as any);
  return { service, queries, get commits() { return commits; }, get rollbacks() { return rollbacks; } };
}

for (const eligible of [
  { name: "Rejected", registration_status: "Rejected", membership_status: "Inactive", membership_end_date: null },
  { name: "Expired", registration_status: "Approved", membership_status: "Expired", membership_end_date: "2025-01-01" },
  { name: "Inactive", registration_status: "Approved", membership_status: "Inactive", membership_end_date: null },
  { name: "Pending", registration_status: "Approved", payment_status: "Pending", membership_status: "Inactive", membership_end_date: null }
]) {
  test(`admin archives an eligible ${eligible.name} member transactionally`, async () => {
    const subject = harness(eligible);
    const result = await subject.service.archiveMember("BSF-OLD-42", actor);
    assert.equal(result.action, "MEMBER_ARCHIVED");
    assert.equal(result.releasedBatchId, 3);
    assert.equal(subject.commits, 1);
    assert.equal(subject.rollbacks, 0);
    assert.ok(subject.queries.some(entry => entry.sql.includes("login_enabled = 0") && entry.sql.includes("selected_batch_id = NULL")));
    assert.ok(subject.queries.some(entry => entry.sql.includes("UPDATE member_batches") && entry.params[0] === 42));
    assert.ok(subject.queries.some(entry => entry.sql.includes("DELETE FROM otp_login_challenges") && entry.params[0] === 42));
    assert.ok(subject.queries.some(entry => entry.sql.includes("DELETE FROM user_sessions") && entry.params[0] === "usr_member_42"));
    assert.ok(subject.queries.some(entry => entry.sql.includes("INSERT INTO activities") && entry.params[1].includes("MEMBER_ARCHIVED")));
    assert.equal(subject.queries.some(entry => /DELETE FROM (payments|renewals|attendance)/i.test(entry.sql)), false);
    assert.equal(subject.queries.some(entry => /UPDATE payments/i.test(entry.sql)), false);
  });
}

test("admin archives an Active member after explicit acknowledgement", async () => {
  const subject = harness({ membership_status: "Active", membership_end_date: "2099-01-01" });
  const result = await subject.service.archiveMember("BSF-OLD-42", actor, { acknowledgeActiveMembership: true });
  assert.equal(result.previousMembershipStatus, "Active");
  assert.equal(subject.commits, 1);
  const audit = subject.queries.find(entry => entry.sql.includes("INSERT INTO activities"));
  assert.match(String(audit?.params[1]), /previousMembershipStatus=Active/);
  assert.match(String(audit?.params[1]), /activeMembershipAdministrativelyRemoved=true/);
});

test("Active-member acknowledgement is re-checked after the member row is locked", async () => {
  const subject = harness({ membership_status: "Active", membership_end_date: "2099-01-01" });
  await assert.rejects(() => subject.service.archiveMember("BSF-OLD-42", actor), (error: any) => {
    assert.equal(error.code, "ACTIVE_DELETE_ACKNOWLEDGEMENT_REQUIRED"); assert.equal(error.status, 400); return true;
  });
  assert.ok(subject.queries[0].sql.includes("FROM members WHERE membershipNo"));
  assert.equal(subject.commits, 0);
  assert.equal(subject.rollbacks, 1);
});

test("super_admin can archive an Active member", async () => {
  const subject = harness({ membership_status: "Active" });
  const result = await subject.service.archiveMember("BSF-OLD-42", { ...actor, role: "super_admin" }, { acknowledgeActiveMembership: true });
  assert.equal(result.action, "MEMBER_ARCHIVED");
  assert.equal(subject.commits, 1);
});

for (const role of ["member", "coach", "receptionist"]) {
  test(`${role} is rejected by the deletion service`, async () => {
    const subject = harness();
    await assert.rejects(
      () => subject.service.archiveMember("BSF-OLD-42", { ...actor, role }),
      (error: any) => error.code === "FORBIDDEN" && error.status === 403
    );
    assert.equal(subject.commits, 0);
    assert.equal(subject.rollbacks, 1);
  });
}

test("cross-academy deletion is forbidden", async () => {
  const subject = harness({ academyId: "cricket" });
  await assert.rejects(() => subject.service.archiveMember("BSF-OLD-42", actor), (error: any) => {
    assert.equal(error.code, "CROSS_ACADEMY"); assert.equal(error.status, 403); return true;
  });
});

test("duplicate deletion reports not found and database failures roll back", async () => {
  const missing = harness({ missing: true });
  await assert.rejects(() => missing.service.archiveMember("BSF-OLD-42", actor), (error: any) => error instanceof MemberDeletionError && error.code === "MEMBER_NOT_FOUND");
  assert.equal(missing.rollbacks, 1);
  const failure = harness({}, { failArchive: true });
  await assert.rejects(() => failure.service.archiveMember("BSF-OLD-42", actor), /database write failed/);
  assert.equal(failure.commits, 0); assert.equal(failure.rollbacks, 1);
});

test("historical payment, invoice, receipt, refund, gateway, and Razorpay data are never rewritten", async () => {
  const financialRecord = Object.freeze({ payment_status: "Paid", invoice_no: "BSF-INV-2026-0099", receipt_no: "BSF-REC-2026-0099", razorpay_payment_id: "pay_history_99", razorpay_order_id: "order_history_99", razorpay_payment_link_id: "plink_history_99", refund_status: "Processed", refund_txn_id: "rfnd_history_99", gateway_response: "{}", amount: 3500 });
  const before = JSON.stringify(financialRecord);
  const subject = harness();
  await subject.service.archiveMember("BSF-OLD-42", actor);
  assert.equal(JSON.stringify(financialRecord), before);
  assert.equal(subject.queries.some(entry => /(?:UPDATE|DELETE)\s+(?:payments|renewals)/i.test(entry.sql)), false);
  assert.equal(subject.queries.some(entry => /invoice_no\s*=|receipt_no\s*=|razorpay_payment_id\s*=|amount\s*=/i.test(entry.sql)), false);
});

test("controller requires exact typed confirmation", async () => {
  const controller: any = new MemberController();
  let called = false;
  controller.memberService = { deleteMember: async () => { called = true; } };
  const state: any = {};
  const response: any = { status(code: number) { state.status = code; return this; }, json(body: any) { state.body = body; return this; } };
  await controller.delete({ params: { membershipNo: "BSF-OLD-42" }, body: { confirmation: "delete" }, user: actor } as any, response, (error: any) => { throw error; });
  assert.equal(state.status, 400); assert.equal(state.body.code, "DELETE_CONFIRMATION_REQUIRED"); assert.equal(called, false);
});

test("controller forwards the Active-member acknowledgement to the transactional service", async () => {
  const controller: any = new MemberController();
  let receivedOptions: any;
  controller.memberService = { deleteMember: async (_membershipNo: string, _actor: any, options: any) => {
    receivedOptions = options;
    return { action: "MEMBER_ARCHIVED", memberId: 42, membershipNo: "BSF-OLD-42", memberName: "Old Member", academyId: "swim", releasedBatchId: 3, previousMembershipStatus: "Active" };
  } };
  const state: any = {};
  const response: any = { status(code: number) { state.status = code; return this; }, json(body: any) { state.body = body; return this; } };
  await controller.delete({ params: { membershipNo: "BSF-OLD-42" }, body: { confirmation: "DELETE", acknowledgeActiveMembership: true }, user: actor } as any, response, (error: any) => { throw error; });
  assert.deepEqual(receivedOptions, { acknowledgeActiveMembership: true });
  assert.equal(state.body.success, true);
});

test("member deletion route permits only admin and super_admin", async () => {
  const source = await readFile(new URL("../routes/member.routes.ts", import.meta.url), "utf8");
  const route = source.split("\n").find(line => line.includes('router.delete("/members/:membershipNo"')) || "";
  assert.match(route, /requireAuth\(\["admin", "super_admin"\]\)/);
  assert.doesNotMatch(route, /"member"|"coach"|"receptionist"|"staff"/);
});

test("deletion authorization rejects unauthenticated, member, coach, and receptionist sessions", {
  skip: process.env.RUN_MYSQL_INTEGRATION !== "1"
}, async () => {
  const middleware = requireAuth(["admin", "super_admin"]);
  const invoke = async (token?: string) => {
    const state: any = { next: false };
    const response: any = { status(code: number) { state.status = code; return this; }, json(body: any) { state.body = body; return this; } };
    await middleware({ headers: token ? { "x-session-token": token } : {} } as any, response, () => { state.next = true; });
    return state;
  };
  assert.equal((await invoke()).status, 401);
  for (const role of ["member", "coach", "receptionist"]) {
    const token = await UserService.createSession({ userId: `usr_${role}_99`, email: `${role}@example.test`, role, name: role, academyId: "swim", expiresAt: Date.now() + 60_000 });
    const state = await invoke(token);
    assert.equal(state.status, 403); assert.equal(state.next, false);
  }
  for (const role of ["admin", "super_admin"]) {
    const token = await UserService.createSession({ userId: `usr_${role}_100`, email: `${role}@example.test`, role, name: role, academyId: "swim", expiresAt: Date.now() + 60_000 });
    assert.equal((await invoke(token)).next, true);
  }
});

test("member-session invalidation affects only the archived member", {
  skip: process.env.RUN_MYSQL_INTEGRATION !== "1"
}, async () => {
  const first = await UserService.createSession({ userId: "usr_member_501", email: "one@example.test", role: "member", name: "One", academyId: "swim", expiresAt: Date.now() + 60_000 });
  const second = await UserService.createSession({ userId: "usr_member_502", email: "two@example.test", role: "member", name: "Two", academyId: "swim", expiresAt: Date.now() + 60_000 });
  const pool = await getDbPool();
  await pool.query("DELETE FROM user_sessions WHERE user_id = ?", ["usr_member_501"]);
  assert.equal(await UserService.getSession(first), null);
  assert.ok(await UserService.getSession(second));
});

test("profile UI uses typed confirmation, immediately updates directory state, and refreshes bounded batch data", async () => {
  const source = await readFile(new URL("../components/MembersDirectory.tsx", import.meta.url), "utf8");
  assert.match(source, /Danger Zone/);
  assert.match(source, /Type DELETE to confirm/);
  assert.match(source, /body:JSON\.stringify\(\{confirmation,acknowledgeActiveMembership\}\)/);
  assert.match(source, /I understand this member currently has an active membership/);
  assert.match(source, /Historical payment and invoice records will be retained/);
  assert.match(source, /setItems\(previous => previous\.filter/);
  assert.match(source, /setPagination\(previous =>/);
  assert.match(source, /sams_batch_assignment_changed/);
  assert.doesNotMatch(source, /window\.location\.reload/);
});

test("archive-aware uniqueness and access guards support a clean re-registration lifecycle", async () => {
  const [schema, repository, dashboard, payment] = await Promise.all([
    readFile(new URL("../config/schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../repositories/member.repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../routes/member-dashboard.routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./payment.service.ts", import.meta.url), "utf8")
  ]);
  assert.doesNotMatch(schema, /mobileNo\s+VARCHAR\(15\)\s+UNIQUE/i);
  assert.match(schema, /active_mobile_no[\s\S]*CASE WHEN deleted_at IS NULL THEN mobile_normalized ELSE NULL END/i);
  assert.match(schema, /UNIQUE KEY uq_members_active_mobile \(active_mobile_no\)/i);
  assert.match(repository, /m\.mobile_normalized = \?[\s\S]*m\.deleted_at IS NULL/i);
  assert.match(dashboard, /WHERE m\.id = \? AND m\.deleted_at IS NULL/i);
  assert.match(payment, /WHERE id = \? AND deleted_at IS NULL/i);
  assert.match(payment, /if \(payment\?\.deleted_at\)/i);
});
