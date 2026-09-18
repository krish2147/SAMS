import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { getDbPool } from "../config/db";
import { BatchAssignmentService } from "./batch-assignment.service";

test("real MySQL serializes two concurrent registrations for the final seat", {
  skip: process.env.RUN_MYSQL_BATCH_CONCURRENCY !== "1"
}, async () => {
  const pool = await getDbPool();
  const suffix = randomBytes(4).toString("hex");
  const mobileStem = String(randomBytes(4).readUInt32BE(0) % 100_000_000).padStart(8, "0");
  const membershipNumbers = [`CH4-A-${suffix}`, `CH4-B-${suffix}`];
  let batchId = 0;

  try {
    const [batchResult]: any = await pool.query(
      `INSERT INTO batches (academy_id, batch_name, start_time, end_time, capacity, current_strength, status)
       VALUES ('swim', ?, '23:55', '23:56', 1, 0, 'OPEN')`,
      [`CHUNK4 concurrency ${suffix}`]
    );
    batchId = Number(batchResult.insertId);
    const assignment = new BatchAssignmentService();

    const createMember = (membershipNo: string, mobileNo: string) => (connection: any) => connection.query(
      `INSERT INTO members (membershipNo, applicationNo, fullName, mobileNo, gender, academyId,
        selected_batch_id, registration_status, payment_status, membership_status, login_enabled)
       VALUES (?, ?, ?, ?, 'other', 'swim', ?, 'Pending', 'Pending', 'Inactive', 0)`,
      [membershipNo, `APP-${membershipNo}`, `Concurrency ${membershipNo}`, mobileNo, batchId]
    );

    const results = await Promise.allSettled([
      assignment.registerWithReservedSeat(batchId, "swim", createMember(membershipNumbers[0], `8${mobileStem}1`)),
      assignment.registerWithReservedSeat(batchId, "swim", createMember(membershipNumbers[1], `8${mobileStem}2`))
    ]);

    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.filter(result => result.status === "rejected" && result.reason?.code === "BATCH_FULL").length, 1);
    const [countRows]: any = await pool.query("SELECT COUNT(*) AS total FROM members WHERE selected_batch_id = ?", [batchId]);
    assert.equal(Number(countRows[0].total), 1);
  } finally {
    if (batchId) {
      await pool.query("DELETE FROM members WHERE membershipNo IN (?, ?)", membershipNumbers);
      await pool.query("DELETE FROM batches WHERE id = ?", [batchId]);
    }
  }
});
