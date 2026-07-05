import { strict as assert } from "assert";
import {
  ALL_PAGE_PATHS,
  firstAllowedPage,
  normalizePageAccess,
  parsePageAccessJson,
  resolveAccessUser,
  userCanAccessPage,
  userHasFullPageAccess,
} from "./pageAccess";

function run() {
  const billingOnly = { role: "Cashier", pageAccess: ["/billing"] };
  assert.ok(userCanAccessPage(billingOnly, "/billing"));
  assert.ok(!userCanAccessPage(billingOnly, "/dashboard"));
  assert.ok(!userCanAccessPage(billingOnly, "/opd"));
  assert.equal(firstAllowedPage(billingOnly), "/billing");

  const admin = { role: "Administrator", pageAccess: ["/billing"] };
  assert.ok(userCanAccessPage(admin, "/settings"));
  assert.ok(userHasFullPageAccess(admin));

  assert.deepEqual(normalizePageAccess(["/billing", "/not-a-page"]), ["/billing"]);
  assert.equal(normalizePageAccess(null).length, ALL_PAGE_PATHS.length);
  assert.equal(normalizePageAccess(["/opd"]).length, 1);

  assert.deepEqual(parsePageAccessJson(["/opd"]), ["/opd"]);
  assert.equal(parsePageAccessJson(null).length, ALL_PAGE_PATHS.length);

  const fromStore = resolveAccessUser(
    {
      authedUser: "cashier1",
      users: [{ username: "cashier1", role: "Cashier", pageAccess: ["/cashier"] }],
    },
    null
  );
  assert.ok(fromStore);
  assert.ok(userCanAccessPage(fromStore, "/cashier"));

  const fromSession = resolveAccessUser(
    { authedUser: "cashier1", users: [] },
    { username: "cashier1", role: "Cashier", pageAccess: ["/cashier"] }
  );
  assert.ok(fromSession);
  assert.ok(userCanAccessPage(fromSession, "/cashier"));
  assert.ok(!userCanAccessPage(fromSession, "/billing"));

  console.log("pageAccess.test.ts: all passed");
}

run();
