import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { batchDuration, presentBatchStatus } from "./batch-data";

test("batch status reflects only the stored OPEN and CLOSED values", () => {
  assert.equal(presentBatchStatus("OPEN"), "Open");
  assert.equal(presentBatchStatus("CLOSED"), "Closed");
  assert.equal(presentBatchStatus("PAUSED"), null);
  assert.equal(presentBatchStatus(null), null);
});

test("duration is derived only from valid stored start and end times", () => {
  assert.equal(batchDuration("06:00:00", "07:00:00"), "1 hr");
  assert.equal(batchDuration("6:15 AM", "7:45 AM"), "1 hr 30 min");
  assert.equal(batchDuration("07:00", "06:00"), null);
  assert.equal(batchDuration("", "07:00"), null);
});

test("member batch route is authenticated and academy scoped through selected_batch_id", async () => {
  const source = await readFile(new URL("../routes/member-dashboard.routes.ts", import.meta.url), "utf8");
  const start = source.indexOf('router.get("/member/batch"');
  const end = source.indexOf("// 3. GET /api/member/events", start);
  const route = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(route, /requireAuth\(\["member", "parent"\]\)/);
  assert.match(route, /member\.selected_batch_id/);
  assert.match(route, /WHERE b\.id = \? AND b\.academy_id = \?/);
  assert.match(route, /\[member\.selected_batch_id, member\.academyId\]/);
  assert.doesNotMatch(route, /req\.params|req\.query|req\.body/);
});

test("member batch API distinguishes no assignment from an unavailable assignment without returning private fields", async () => {
  const source = await readFile(new URL("../routes/member-dashboard.routes.ts", import.meta.url), "utf8");
  const start = source.indexOf('router.get("/member/batch"');
  const end = source.indexOf("// 3. GET /api/member/events", start);
  const route = source.slice(start, end);
  assert.match(route, /if \(!member\.selected_batch_id\)/);
  assert.match(route, /res\.json\(\{ batch: null \}\)/);
  assert.match(route, /res\.status\(409\)\.json\(\{ error: "Assigned batch unavailable" \}\)/);
  const responseShape = route.slice(route.indexOf("return res.json({", route.indexOf("const batch = rows[0]")));
  assert.doesNotMatch(responseShape, /capacity|current_strength|memberId|selectedBatchId|academyId/);
});

test("member batch UI does not invent schedule, coach, lane, pool, capacity or next-session data", async () => {
  const files = await Promise.all([
    "BatchHeroCard.tsx",
    "BatchSessionDetails.tsx",
    "MyBatchPage.tsx"
  ].map((name) => readFile(new URL(name, import.meta.url), "utf8")));
  const ui = files.join("\n");
  assert.doesNotMatch(ui, /Monday|Saturday|coach|lane|pool|capacity|next session|countdown/i);
});
