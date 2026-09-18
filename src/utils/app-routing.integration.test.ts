import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const loadSources = async () => Promise.all([
  readFile(new URL("../App.tsx", import.meta.url), "utf8"),
  readFile(new URL("../../server.ts", import.meta.url), "utf8"),
  readFile(new URL("../middleware/authMiddleware.ts", import.meta.url), "utf8")
]);

test("persisted BSF selection cannot bypass root or root refresh", async () => {
  const [app] = await loadSources();
  assert.match(app, /const initialRoute = parseAppRoute\(window\.location\.pathname\)/);
  assert.match(app, /useState<AcademyId \| null>\(initialRoute\.academyId\)/);
  assert.doesNotMatch(app, /getItem\(["']sams_academy["']\)/);
});

test("academy selection and direct login are URL-driven and browser history aware", async () => {
  const [app] = await loadSources();
  assert.match(app, /navigateTo\(academyPath\(id\)\)/);
  assert.match(app, /navigateTo\(academyPath\(selectedAcademyId, ["']login["']\)\)/);
  assert.match(app, /window\.addEventListener\(["']popstate["']/);
  assert.match(app, /applyRoute\(parseAppRoute\(window\.location\.pathname\)\)/);
});

test("logout returns to root and clears only routing/session persistence", async () => {
  const [app] = await loadSources();
  assert.match(app, /fetch\(["']\/api\/auth\/logout["']/);
  assert.match(app, /localStorage\.removeItem\(["']sams_session["']\)/);
  assert.match(app, /localStorage\.removeItem\(["']sams_academy["']\)/);
  assert.match(app, /navigateTo\(["']\/["'], true\)/);
});

test("protected dashboard restoration still verifies the server session", async () => {
  const [app, , auth] = await loadSources();
  assert.match(app, /fetch\(["']\/api\/auth\/verify["']/);
  assert.match(app, /restoredRoute\.view === ["']dashboard["']/);
  assert.match(app, /academyPath\(sessionAcademy, ["']dashboard["']\)/);
  assert.match(auth, /UserService\.getSession/);
});

test("development and production fallbacks serve the SPA, not a login page", async () => {
  const [, server] = await loadSources();
  assert.match(server, /appType:\s*["']spa["']/);
  assert.match(server, /app\.get\(["']\*["']/);
  assert.match(server, /sendFile\(path\.join\(distPath, ["']index\.html["']\)\)/);
  assert.doesNotMatch(server, /sendFile\([^\n]*login/i);
});
