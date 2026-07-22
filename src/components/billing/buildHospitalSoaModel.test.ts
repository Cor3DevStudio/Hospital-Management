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
    {
      description: "Room & Board — Private · 5 days @ ₱800",
      amount: 4000,
      qty: 5,
      unitPrice: 800,
      category: "Room",
    },
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
assert.equal(model.admittingDiagnosis.includes("L02.8 - ABSCESS OCCIPITAL AREA"), true);
assert.equal(
  model.finalDiagnoses.some((d) => d.includes("L02.8 - ABSCESS OCCIPITAL AREA")),
  true,
);
assert.ok(model.phicCoverage);
assert.equal(model.phicCoverage!.totalBenefit, 8000);
assert.equal(model.phicCoverage!.patientExcess, 11836);
assert.equal(model.phicCoverage!.hciBenefit, 5600);
assert.equal(model.phicCoverage!.pfBenefit, 2400);

// RVS 44960 — Appendectomy sample (7 days × ₱600 room, PhilHealth HF ₱28,080 / PF ₱18,720)
const appendectomyBill: Bill = {
  id: "bill-44853",
  patientId: "p2",
  date: "2026-07-07",
  patientType: "In-Patient",
  dischargeDate: "2026-07-05",
  items: [
    {
      description: "ROOM - Surgical Nurse Station Room 14 (7 day/s) (600.00)",
      amount: 4200,
      qty: 7,
      unitPrice: 600,
      category: "Room",
    },
    { description: "Paracetamol", amount: 13454, category: "Medicine" },
    { description: "Gauze", amount: 9437.3, category: "Supplies" },
    { description: "CBC", amount: 2520, category: "Lab" },
    { description: "Chest AP/PA", amount: 365, category: "Radiology" },
    { description: "Admission Fee", amount: 13090, category: "Other", priceItemId: "misc-adm" },
    { description: "Operating Room Fee", amount: 3500, category: "Other", priceItemId: "misc-or" },
    { description: "DR. Harper, Emily R.", amount: 13104, category: "PF" },
    { description: "DR. Santos, Ruth C.", amount: 5616, category: "PF" },
  ],
  philhealthDeduction: 46800,
  amountPaid: 0,
  caseRateCode: "44960",
};

const appendectomyState = {
  ...emptyState,
  admissions: [
    {
      id: "adm-1",
      patientId: "p2",
      admissionDate: "2026-06-28",
      dischargeDate: "2026-07-05",
      status: "Discharged",
      roomWard: "Surgical Nurse Station Room 14",
      roomTypeId: "rb-ward",
    },
  ],
  prices: [
    {
      id: "misc-adm",
      code: "MISC-ADM",
      description: "Admission Fee",
      category: "Miscellaneous",
      caseRate: 300,
      effectiveDate: "2026-01-01",
    },
    {
      id: "misc-or",
      code: "MISC-OR",
      description: "Operating Room Fee",
      category: "Miscellaneous",
      caseRate: 3500,
      effectiveDate: "2026-01-01",
    },
  ],
} as AppState;

const appendectomy = buildHospitalSoaModel({
  bill: appendectomyBill,
  state: appendectomyState,
  patient: {
    id: "p2",
    firstName: "Jose",
    lastName: "Rizal",
    birthDate: "2008-01-01",
    gender: "Male",
    civilStatus: "Single",
    contactNumber: "",
    address: {},
  },
  hospital: { name: "Medical Center", address: "Manila", phone: "" },
  caseRate: {
    id: "44960",
    code: "44960",
    description: "APPENDECTOMY; FOR RUPTURED APPENDIX W/ ABSCESS OR GENERALIZED PERITONITIS",
    amount: 46800,
    category: "Surgical",
    healthFacilityFee: 28080,
    professionalFeeAmount: 18720,
    hospitalSharePct: 70,
    professionalFeePct: 30,
  },
});

assert.equal(appendectomy.hciRows.find((r) => r.label === "Room and Board")?.actual, 4200);
assert.equal(appendectomy.hciRows.find((r) => r.label === "Pharmacy")?.actual, 13454);
assert.equal(appendectomy.hciSubtotal.phicFirst, 28080);
assert.equal(appendectomy.pfSubtotal.phicFirst, 18720);
assert.equal(appendectomy.total.phicFirst, 46800);
assert.equal(appendectomy.phicCoverage!.caseRateCode, "44960");
assert.equal(appendectomy.phicCoverage!.hciBenefit, 28080);
assert.equal(appendectomy.phicCoverage!.pfBenefit, 18720);

// Case-rate PF fallback uses attending physician from admission
const pfFallbackBill: Bill = {
  id: "bill-pf",
  patientId: "p3",
  date: "2026-07-07",
  patientType: "In-Patient",
  items: [
    { description: "Paracetamol", amount: 200, category: "Medicine" },
    { description: "Operating Room Fee", amount: 8000, category: "Other", priceItemId: "misc-or" },
  ],
  philhealthDeduction: 14774.5,
  amountPaid: 0,
  caseRateCode: "M00.98",
};

const pfFallbackState = {
  ...emptyState,
  priceHistories: [],
  admissions: [
    {
      id: "adm-pf",
      patientId: "p3",
      admissionDate: "2026-07-07",
      dischargeDate: "2026-07-07",
      status: "Discharged",
      roomWard: "Ward",
      roomTypeId: "rb-ward",
      attendingDoctor: "Dr. Maria Santos",
    },
  ],
  prices: [
    {
      id: "rb-ward",
      code: "RB-WARD",
      description: "Ward",
      category: "Room Rate",
      caseRate: 800,
      effectiveDate: "2026-01-01",
    },
    {
      id: "misc-or",
      code: "MISC-OR",
      description: "Operating Room Fee",
      category: "Miscellaneous",
      caseRate: 8000,
      effectiveDate: "2026-01-01",
    },
  ],
  users: [
    {
      id: "doc-1",
      username: "msantos",
      fullName: "Dr. Maria Santos",
      role: "Doctor",
      active: true,
      philhealthAccreditation: "1234567890",
    },
  ],
} as AppState;

const pfFallback = buildHospitalSoaModel({
  bill: pfFallbackBill,
  state: pfFallbackState,
  patient: {
    id: "p3",
    firstName: "Jose",
    lastName: "Rizal",
    birthDate: "2008-01-01",
    gender: "Male",
    civilStatus: "Single",
    contactNumber: "",
    address: {},
  },
  hospital: { name: "Hospital", address: "Manila", phone: "" },
  caseRate: {
    id: "M00.98",
    code: "M00.98",
    description: "PYOGENIC ARTHRITIS, UNSPECIFIED",
    amount: 14774.5,
    category: "Medical",
    healthFacilityFee: 9100,
    professionalFeeAmount: 5674.5,
    hospitalSharePct: 70,
    professionalFeePct: 30,
  },
});

assert.equal(pfFallback.hciRows.find((r) => r.label === "Room and Board")?.actual, 800);
assert.equal(pfFallback.professionalFees.length, 1);
assert.equal(pfFallback.professionalFees[0]?.name, "Dr. Maria Santos");
assert.equal(pfFallback.professionalFees[0]?.accreditation, "1234567890");
assert.equal(pfFallback.professionalFees[0]?.row.actual, 5674.5);
assert.equal(pfFallback.pfSubtotal.actual, 5674.5);

// "Room and Board" must always be included and be the first Particulars entry —
// even with zero room charge, and even when the room line is not first in bill.items.
assert.equal(pfFallback.itemizedLines[0]?.itemName.startsWith("ROOM"), true);

const noRoomBill: Bill = {
  id: "bill-no-room",
  patientId: "p4",
  date: "2026-07-08",
  patientType: "Out-Patient",
  items: [
    { description: "Paracetamol", amount: 200, category: "Medicine" },
    { description: "CBC", amount: 500, category: "Lab" },
  ],
  philhealthDeduction: 0,
  amountPaid: 0,
};

const noRoomModel = buildHospitalSoaModel({
  bill: noRoomBill,
  state: emptyState,
  patient: {
    id: "p4",
    firstName: "Ana",
    lastName: "Reyes",
    birthDate: "1990-01-01",
    gender: "Female",
    civilStatus: "Single",
    contactNumber: "",
    address: {},
  },
  hospital: { name: "Hospital", address: "Manila", phone: "" },
});

assert.equal(noRoomModel.hciRows[0]?.label, "Room and Board");
assert.equal(noRoomModel.hciRows[0]?.actual, 0);
assert.equal(noRoomModel.itemizedLines[0]?.itemName, "Paracetamol");

// Mandatory discount on TOTAL; PhilHealth must not appear in discountAgency / Mandatory Discount
const withMandatoryBill: Bill = {
  id: "bill-sc",
  patientId: "p5",
  date: "2026-07-09",
  patientType: "Out-Patient",
  items: [
    { description: "CBC", amount: 10000, category: "Lab" },
    { description: "X-Ray", amount: 5000, category: "Radiology" },
  ],
  philhealthDeduction: 3000,
  amountPaid: 0,
  mandatoryDiscountType: "senior",
  mandatoryDiscountAmount: 3000, // 20% of 15000
};

const withMandatory = buildHospitalSoaModel({
  bill: withMandatoryBill,
  state: emptyState,
  patient: {
    id: "p5",
    firstName: "Lola",
    lastName: "Santos",
    birthDate: "1940-01-01",
    gender: "Female",
    civilStatus: "Widowed",
    contactNumber: "",
    address: {},
  },
  hospital: { name: "Hospital", address: "Manila", phone: "" },
});

assert.equal(withMandatory.total.discountScPwd, 3000);
assert.equal(withMandatory.total.discountAgency, 0);
// PhilHealth stays in phicFirst only (HCI share of case-rate split when no case rate)
assert.equal(withMandatory.total.phicFirst, 2100);
assert.notEqual(withMandatory.total.discountScPwd, withMandatory.total.phicFirst);
assert.equal(withMandatory.discountChecks.doh, false);
// balance uses full bill.philhealthDeduction: 15000 - 3000 SC - 3000 PHIC = 9000
assert.equal(withMandatory.total.outOfPocket, 9000);

console.log("buildHospitalSoaModel.test.ts: all assertions passed");
