import assert from "node:assert/strict";
import test from "node:test";
import { academyPath, parseAppRoute } from "./app-routing";

test("the root URL is always the academy selector route", () => {
  assert.deepEqual(parseAppRoute("/"), { view: "root", academyId: null });
  assert.deepEqual(parseAppRoute("/?ignored=1"), { view: "root", academyId: null });
});

test("academy routes preserve intentional entry, login, registration, and dashboard navigation", () => {
  assert.deepEqual(parseAppRoute("/academy/swim"), { view: "academy", academyId: "swim" });
  assert.deepEqual(parseAppRoute("/academy/swim/login"), { view: "login", academyId: "swim" });
  assert.deepEqual(parseAppRoute("/academy/swim/register/"), { view: "register", academyId: "swim" });
  assert.deepEqual(parseAppRoute("/academy/swim/dashboard"), { view: "dashboard", academyId: "swim" });
  assert.equal(academyPath("swim", "login"), "/academy/swim/login");
});

test("unknown academies and paths fail safely to Select Academy without redirect loops", () => {
  assert.deepEqual(parseAppRoute("/academy/unknown/login"), { view: "root", academyId: null });
  assert.deepEqual(parseAppRoute("/login"), { view: "root", academyId: null });
  assert.deepEqual(parseAppRoute("/not-a-route"), { view: "root", academyId: null });
});
