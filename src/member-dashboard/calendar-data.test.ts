import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calendarDateBadge, eventTimeRange, formatCalendarDate } from "./calendar-data";

test("member calendar formats stored dates without timezone shifts", () => {
  assert.equal(formatCalendarDate("2026-09-10"), "Thu, 10 Sept, 2026");
  assert.deepEqual(calendarDateBadge("2026-09-10"), { month: "Sept", day: "10" });
});

test("event times remain academy-local and all-day defaults are omitted", () => {
  assert.equal(eventTimeRange("08:00:00", "11:30:00"), "8:00 AM – 11:30 AM");
  assert.equal(eventTimeRange("00:00:00", "23:59:59"), null);
});

test("member event and holiday APIs require authentication and return safe presentation fields", async () => {
  const source = await readFile(new URL("../routes/member-dashboard.routes.ts", import.meta.url), "utf8");
  for (const routeName of ["events", "holidays"]) {
    const start = source.indexOf(`router.get("/member/${routeName}"`);
    const end = source.indexOf("router.get(", start + 20);
    const route = source.slice(start, end);
    assert.match(route, /requireAuth\(\["member", "parent"\]\)/);
    assert.match(route, /getAuthenticatedMember\(req\)/);
    assert.doesNotMatch(route, /created_by|applicable_batch_ids|applicable_plan_categories|\bid:/);
  }
});

test("Calendar and Events is available in desktop navigation and the mobile More menu", async () => {
  const [navigation, mobile, shell] = await Promise.all([
    readFile(new URL("member-navigation.ts", import.meta.url), "utf8"),
    readFile(new URL("MobileNavigation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/MemberDashboardShell.tsx", import.meta.url), "utf8")
  ]);
  assert.match(navigation, /Calendar & Events/);
  assert.match(mobile, /item\.id === "calendar"/);
  assert.match(shell, /activeSection === "calendar"/);
});
