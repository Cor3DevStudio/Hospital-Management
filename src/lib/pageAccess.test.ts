import { strict as assert } from "assert";
import {
  ALL_PAGE_PATHS,
  firstAllowedPage,
  isAdmissionLocked,
  isConsultationLocked,
  isERRecordLocked,
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
    null,
  );
  assert.ok(fromStore);
  assert.ok(userCanAccessPage(fromStore, "/cashier"));

  const fromSession = resolveAccessUser(
    { authedUser: "cashier1", users: [] },
    { username: "cashier1", role: "Cashier", pageAccess: ["/cashier"] },
  );
  assert.ok(fromSession);
  assert.ok(userCanAccessPage(fromSession, "/cashier"));
  assert.ok(!userCanAccessPage(fromSession, "/billing"));

  // Item 5 — records are read-only once closed/discharged, except for Administrators.
  assert.ok(isAdmissionLocked({ status: "Discharged" }, "Receptionist"));
  assert.ok(isAdmissionLocked({ status: "Discharged" }, "Doctor"));
  assert.ok(!isAdmissionLocked({ status: "Discharged" }, "Administrator"));
  assert.ok(!isAdmissionLocked({ status: "Admitted" }, "Receptionist"));
  assert.ok(!isAdmissionLocked(undefined, "Receptionist"));

  assert.ok(isERRecordLocked({ status: "Released" }, "Receptionist"));
  assert.ok(isERRecordLocked({ status: "Admitted" }, "Receptionist"));
  assert.ok(!isERRecordLocked({ status: "Released" }, "Administrator"));
  assert.ok(!isERRecordLocked({ status: "In Triage" }, "Receptionist"));
  assert.ok(!isERRecordLocked({ status: "Under Treatment" }, "Receptionist"));

  assert.ok(isConsultationLocked({ status: "Seen" }, "Doctor"));
  assert.ok(isConsultationLocked({ status: "Pending", discharged: true }, "Doctor"));
  assert.ok(!isConsultationLocked({ status: "Seen" }, "Administrator"));
  assert.ok(!isConsultationLocked({ status: "Pending" }, "Receptionist"));

  console.log("pageAccess.test.ts: all passed");
}

run();
