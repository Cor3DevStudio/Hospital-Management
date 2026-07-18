import { strict as assert } from "assert";
import { createLabOrder, ensureDefaultLabPrices } from "./laboratoryService";
import { createRadiologyOrder, ensureDefaultRadiologyPrices } from "./radiologyService";
import { createPriceItem } from "./priceListService";
import { canPostCharges } from "./chargePostingService";
import type { AppState } from "../store";

function baseState(): AppState {
  return {
    patients: [{ id: "P1", firstName: "Juan", lastName: "Cruz", birthDate: "1990-01-01" }],
    bills: [],
    admissions: [],
    medicines: [],
    prices: [],
    priceHistories: [],
    laboratoryRecords: [],
    radiologyRecords: [],
    users: [{ id: "D1", name: "Dr. Test", role: "Doctor", active: true }],
    hospital: { name: "Test", address: "" },
    authedUser: null,
    appointments: [],
    consultations: [],
    erRecords: [],
    opdRecords: [],
    pharmacyRecords: [],
    suppliesRecords: [],
    miscellaneousRecords: [],
    cashierTransactions: [],
    medicalRecords: [],
    caseRates: [],
    eClaims: [],
    attachments: [],
    inactivityTimeoutMinutes: 15,
    inactivityWarningSeconds: 60,
  } as AppState;
}

function dischargedPatientState(state: AppState): AppState {
  return {
    ...state,
    admissions: [
      {
        id: "ADM1",
        patientId: "P1",
        admissionDate: "2026-06-01",
        dischargeDate: "2026-06-05",
        status: "Discharged",
        roomTypeId: "",
        roomWard: "",
        roomStays: [],
        attendingPhysician: "D1",
        diagnosis: "",
        notes: "",
      },
    ],
  };
}

function run() {
  let state = baseState();
  state = createPriceItem(state, {
    code: "CBC",
    description: "Complete Blood Count",
    caseRate: 350,
    category: "Laboratory",
    effectiveDate: "2026-07-05",
  });
  const labPrice = state.prices[0];

  const labResult = createLabOrder(
    state,
    {
      patientId: "P1",
      testName: "Complete Blood Count",
      priceItemId: labPrice.id,
      quantity: 1,
      requestedBy: "D1",
      requestDate: "2026-07-05",
      status: "Pending",
      notes: "",
    },
    true,
  );

  assert.ok(
    !("error" in labResult),
    `lab should succeed: ${"error" in labResult ? labResult.error : ""}`,
  );
  assert.ok(labResult.record.billId, "lab should have billId");
  assert.equal(labResult.state.bills.length, 1);
  assert.equal(labResult.state.bills[0].items[0].category, "Lab");

  state = createPriceItem(labResult.state, {
    code: "XRAY",
    description: "Chest X-ray",
    caseRate: 450,
    category: "Procedure",
    effectiveDate: "2026-07-05",
  });
  const radPrice = state.prices.find((p) => p.code === "XRAY")!;

  const radResult = createRadiologyOrder(
    state,
    {
      patientId: "P1",
      imagingType: "Chest X-ray",
      examType: "X-ray",
      priceItemId: radPrice.id,
      quantity: 1,
      requestedBy: "D1",
      requestDate: "2026-07-05",
      status: "Pending",
      notes: "",
    },
    true,
  );

  assert.ok(
    !("error" in radResult),
    `rad should succeed: ${"error" in radResult ? radResult.error : ""}`,
  );
  assert.equal(radResult.state.bills[0].items.length, 2);

  const discharged = dischargedPatientState(radResult.state);
  assert.ok(
    canPostCharges(discharged, "P1").allowed,
    "outpatient charges allowed after prior discharge",
  );

  const postDischargeLab = createLabOrder(
    discharged,
    {
      patientId: "P1",
      testName: "Complete Blood Count",
      priceItemId: labPrice.id,
      quantity: 1,
      requestedBy: "D1",
      requestDate: "2026-07-05",
      status: "Pending",
      notes: "",
    },
    true,
  );
  assert.ok(
    !("error" in postDischargeLab),
    `discharged outpatient lab should bill: ${"error" in postDischargeLab ? postDischargeLab.error : ""}`,
  );
  assert.ok(postDischargeLab.record.billId, "new bill should be created for outpatient lab");

  const emptyLab = ensureDefaultLabPrices(baseState());
  assert.equal(emptyLab.prices.filter((p) => p.category === "Laboratory").length, 3);

  const emptyRad = ensureDefaultRadiologyPrices(baseState());
  assert.equal(emptyRad.prices.filter((p) => p.category === "Procedure").length, 3);

  const apiPriceState = {
    ...baseState(),
    prices: [
      {
        id: "pr-api",
        code: "FBS",
        description: "Fasting Blood Sugar",
        caseRate: 180,
        category: "Laboratory" as const,
        effectiveDate: "2026-01-01",
      },
    ],
    priceHistories: [],
  };
  const apiLab = createLabOrder(
    apiPriceState,
    {
      patientId: "P1",
      testName: "Fasting Blood Sugar",
      priceItemId: "pr-api",
      quantity: 1,
      requestedBy: "D1",
      requestDate: "2026-07-05",
      status: "Pending",
      notes: "",
    },
    true,
  );
  assert.ok(
    !("error" in apiLab),
    `API price should work: ${"error" in apiLab ? apiLab.error : ""}`,
  );

  const seeded = ensureDefaultLabPrices(baseState());
  const seededPrice = seeded.prices[0];
  const retroLab = createLabOrder(
    seeded,
    {
      patientId: "P1",
      testName: seededPrice.description,
      priceItemId: seededPrice.id,
      quantity: 1,
      requestedBy: "D1",
      requestDate: "2026-01-01",
      status: "Pending",
      notes: "",
    },
    true,
  );
  assert.ok(
    !("error" in retroLab),
    `retroactive lab order should bill: ${"error" in retroLab ? retroLab.error : ""}`,
  );

  console.log("labRadCharge.test.ts: all passed");
}

run();
