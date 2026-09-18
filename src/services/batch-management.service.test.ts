import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { requireAuth } from "../middleware/authMiddleware";
import { OPERATIONAL_BATCH_LIST_SQL } from "../repositories/batch.repository";
import { BatchService, toOperationalBatch } from "./batch.service";

test("operational batches are loaded from the repository for the authenticated academy", async () => {
  const calls: string[] = [];
  const repository = {
    getOperationalByAcademy: async (academyId: string) => {
      calls.push(academyId);
      return [{
        id: 14,
        batch_name: "Morning Batch",
        start_time: "06:00:00",
        end_time: "07:00:00",
        capacity: 30,
        status: "OPEN",
        active_member_count: 8
      }];
    }
  };
  const service = new BatchService(repository as any);

  const batches = await service.getOperationalBatches("swim");

  assert.deepEqual(calls, ["swim"]);
  assert.deepEqual(batches, [{
    id: 14,
    batchName: "Morning Batch",
    startTime: "06:00:00",
    endTime: "07:00:00",
    capacity: 30,
    status: "OPEN",
    activeMemberCount: 8,
    availableSeats: 22
  }]);
});

test("empty academy batch result stays empty", async () => {
  const service = new BatchService({ getOperationalByAcademy: async () => [] } as any);
  assert.deepEqual(await service.getOperationalBatches("swim"), []);
});

test("available seats never becomes negative and response has no fabricated fields", () => {
  const batch = toOperationalBatch({
    id: "9",
    batch_name: "Full Batch",
    start_time: "08:00",
    end_time: "09:00",
    capacity: "20",
    status: "OPEN",
    active_member_count: "24"
  });

  assert.equal(batch.availableSeats, 0);
  assert.equal(batch.activeMemberCount, 24);
  assert.equal(typeof batch.id, "number");
  for (const fabricatedField of ["days", "schedule", "level", "coach", "category", "currentStrength"]) {
    assert.equal(fabricatedField in batch, false);
  }
});

test("operational query is academy scoped and counts only active selected-batch members", () => {
  assert.match(OPERATIONAL_BATCH_LIST_SQL, /LEFT JOIN members m ON m\.selected_batch_id = b\.id/i);
  assert.match(OPERATIONAL_BATCH_LIST_SQL, /m\.membership_status = 'Active'/i);
  assert.match(OPERATIONAL_BATCH_LIST_SQL, /WHERE b\.academy_id = \?/i);
  assert.match(OPERATIONAL_BATCH_LIST_SQL, /GROUP BY b\.id/i);
  assert.doesNotMatch(OPERATIONAL_BATCH_LIST_SQL, /current_strength/i);
});

test("admin batch route is authenticated and fake frontend batch initialization is removed", () => {
  const routes = readFileSync(new URL("../routes/batch.routes.ts", import.meta.url), "utf8");
  const dashboard = readFileSync(new URL("../components/AdminDashboard.tsx", import.meta.url), "utf8");
  const management = readFileSync(new URL("../components/BatchManagementTab.tsx", import.meta.url), "utf8");

  assert.match(routes, /"\/admin\/batches\/operations"[\s\S]*requireAuth\(\["admin", "super_admin"\]\)/);
  assert.doesNotMatch(dashboard, /const \[batches, setBatches\]/);
  assert.match(management, /fetch\("\/api\/admin\/batches\/operations"/);
  assert.doesNotMatch(management, /\b(?:MWF|TTS|Beginner|Intermediate|Advanced|Elite Squad|Sanjay|Hetvi)\b/);
});

test("unauthenticated operational batch access is rejected", async () => {
  let statusCode = 200;
  let payload: any;
  let nextCalled = false;
  const response = {
    status(code: number) { statusCode = code; return this; },
    json(value: any) { payload = value; return this; }
  };

  await requireAuth(["admin", "super_admin"])({ headers: {} } as any, response as any, () => { nextCalled = true; });

  assert.equal(statusCode, 401);
  assert.equal(nextCalled, false);
  assert.match(payload.error, /session expired or invalid/i);
});
