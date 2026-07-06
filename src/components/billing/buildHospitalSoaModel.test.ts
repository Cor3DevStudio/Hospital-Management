import assert from "node:assert/strict";
import { buildHospitalSoaModel } from "./buildHospitalSoaModel";
import type { AppState, Bill } from "@/lib/store";

const emptyState = {
  prices: [],
  medicines: [],
} as AppState;

const bill: Bill = {
  id: "bill-149638",
  patientId: "p1",
  date: "2023-08-19",
  patientType: "In-Patient",
  items: [
    { description: "Room & Board — Private · 5 days @ ₱800", amount: 4000, qty: 5, unitPrice: 800, category: "Room" },
    { description: "Paracetamol", amount: 2392, category: "Medicine" },
    { description: "CBC", amount: 3936, category: "Lab" },
    { description: "Chest X-Ray", amount: 1200, category: "Radiology" },
    { description: "Gauze", amount: 823, category: "Supplies" },
    { description: "Delivery Room Fee", amount: 1110, category: "Other", priceItemId: "misc-dr" },
    { description: "PETER MANUEL M. OLIVA M.D", amount: 6375, category: "PF" },
  ],
  philhealthDeduction: 8000,
  amountPaid: 0,
  caseRateCode: "L02.8",
  notes: "ABSCESS OCCIPITAL AREA, VIRAL EXANTHEM",
};

const state = {
  ...emptyState,
  prices: [
    {
      id: "misc-dr",
      code: "MISC-DR",
      description: "Delivery Room Fee",
      category: "Miscellaneous",
      caseRate: 1110,
      effectiveDate: "2023-01-01",
    },
  ],
} as AppState;

const model = buildHospitalSoaModel({
  bill,
  state,
  patient: {
    id: "p1",
    firstName: "Zydel",
    middleName: "Matthew",
    lastName: "Cadag Llagas",
    birthDate: "2022-01-01",
    gender: "Male",
    civilStatus: "Single",
    contactNumber: "",
    address: {
      street: "Sentro Street",
      barangay: "Buluang",
      city: "Baao",
      province: "Camarines Sur",
    },
  },
  hospital: {
    name: "Villanueva-Tanchuling Hospital",
    address: "Highway San Jose Pili Camarines Sur Philippines 4401",
    phone: "(054) 299-2122",
  },
  caseRate: {
    id: "1",
    code: "L02.8",
    description: "ABSCESS OCCIPITAL AREA",
    amount: 8000,
    category: "Medical",
    healthFacilityFee: 5600,
    professionalFeeAmount: 2400,
    hospitalSharePct: 70,
    professionalFeePct: 30,
  },
});

assert.equal(model.soaReference, "2023-149638");
assert.equal(model.hciRows.find((r) => r.label === "Room and Board")?.actual, 4000);
assert.equal(model.hciRows.find((r) => r.label === "Pharmacy")?.actual, 2392);
assert.equal(model.hciRows.find((r) => r.label === "Laboratory")?.actual, 3936);
assert.equal(model.hciRows.find((r) => r.label === "Radiology")?.actual, 1200);
assert.equal(model.hciRows.find((r) => r.label === "Supplies")?.actual, 823);
assert.equal(model.hciRows.find((r) => r.label === "Miscellaneous")?.actual, 1110);
assert.equal(model.hciRows.find((r) => r.label === "Room and Board")?.phicFirst, 4000);
assert.equal(model.hciRows.find((r) => r.label === "Pharmacy")?.phicFirst, 0);
assert.equal(model.hciSubtotal.actual, 13461);
assert.equal(model.total.actual, 19836);
assert.equal(model.pfSubtotal.actual, 6375);
assert.equal(model.total.phicFirst, 8000);
assert.equal(model.hciSubtotal.phicFirst, 5600);
assert.equal(model.pfSubtotal.phicFirst, 2400);
assert.equal(model.total.outOfPocket, 11836);
assert.ok(model.phicCoverage);
assert.equal(model.phicCoverage!.totalBenefit, 8000);
assert.equal(model.phicCoverage!.patientExcess, 11836);
assert.equal(model.phicCoverage!.hciBenefit, 5600);
assert.equal(model.phicCoverage!.pfBenefit, 2400);

console.log("buildHospitalSoaModel.test.ts: all assertions passed");
