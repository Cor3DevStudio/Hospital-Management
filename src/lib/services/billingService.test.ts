import { strict as assert } from "assert";
import {
  applyCaseRateToBill,
  canCancelBillDischarge,
  createBill,
  normalizeBillPaymentMethod,
  recordPayment,
  setBillDischargeDate,
  type BillLineItem,
} from "./billingService";
import { processBillPayment } from "./cashierService";
import { truncateSoaField } from "../../components/billing/buildSoaValues";
import type { AppState, Bill, CaseRate } from "../store";

function baseState(): AppState {
  return {
    patients: [{ id: "P1", firstName: "Juan", lastName: "Dela Cruz", birthDate: "1990-01-01" }],
    bills: [],
    admissions: [],
    medicines: [],
    prices: [],
    users: [],
    hospital: { name: "Test Hospital", address: "Test City" },
    authedUser: "admin",
    cashierTransactions: [],
    eClaims: [],
    attachments: [],
    caseRates: [],
    inventoryTransactions: [],
    rooms: [],
    doctors: [],
    erVisits: [],
    labOrders: [],
    radiologyOrders: [],
    settings: {},
    priceHistories: [],
  } as unknown as AppState;
}

function sampleBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "BIL-TEST",
    patientId: "P1",
    date: "2026-07-05",
    items: [{ description: "Consultation", amount: 1000, qty: 1, unitPrice: 1000 }],
    philhealthDeduction: 0,
    amountPaid: 0,
    status: "Unpaid",
    patientType: "In-Patient",
    ...overrides,
  };
}

function run() {
  // createBill
  const items: BillLineItem[] = [
    { description: "Lab", amount: 500, qty: 1, unitPrice: 500 },
  ];
  const created = createBill(baseState(), { patientId: "P1", items, date: "2026-07-05" });
  assert(!("error" in created), "createBill should succeed");
  assert.equal(created.state.bills.length, 1);
  assert.equal(created.bill.amountPaid, 0);

  const empty = createBill(baseState(), { patientId: "", items: [] });
  assert("error" in empty, "createBill should reject empty input");

  // normalizeBillPaymentMethod
  assert.equal(normalizeBillPaymentMethod("Credit Card"), "Card");
  assert.equal(normalizeBillPaymentMethod("PayMaya"), "GCash");
  assert.equal(normalizeBillPaymentMethod("Bank Transfer"), "Credit");

  // recordPayment + processBillPayment
  const bill = sampleBill();
  const withBill = { ...baseState(), bills: [bill] };
  const paid = recordPayment(withBill, bill.id, 400, { paymentMethod: "Cash" });
  const updated = paid.bills[0];
  assert.equal(updated.amountPaid, 400);
  assert.equal(updated.status, "Partial");

  const payment = processBillPayment(withBill, {
    billId: bill.id,
    amount: 400,
    paymentMethod: "Cash",
  });
  assert(!("error" in payment), "processBillPayment should succeed");
  assert.equal(payment.state.cashierTransactions?.length, 1);

  const overpay = processBillPayment(withBill, {
    billId: bill.id,
    amount: 2000,
    paymentMethod: "Cash",
  });
  assert("error" in overpay, "processBillPayment should reject overpayment");

  // canCancelBillDischarge
  const dischargedBill = sampleBill({ dischargeDate: "2026-07-05" });
  const admittedState = {
    ...baseState(),
    bills: [dischargedBill],
    admissions: [
      {
        id: "ADM1",
        patientId: "P1",
        admissionDate: "2026-07-01",
        status: "Admitted",
      },
    ],
  } as unknown as AppState;
  const canCancelWhileAdmitted = canCancelBillDischarge(admittedState, dischargedBill);
  assert(canCancelWhileAdmitted.allowed, "Should allow cancel while patient still admitted");

  const goneHomeState = {
    ...admittedState,
    admissions: [
      {
        id: "ADM1",
        patientId: "P1",
        admissionDate: "2026-07-01",
        dischargeDate: "2026-07-05",
        status: "Discharged",
      },
    ],
  } as unknown as AppState;
  const blocked = canCancelBillDischarge(goneHomeState, dischargedBill);
  assert(!blocked.allowed, "Should block cancel after patient discharged from admission");

  // setBillDischargeDate — auto Room & Board from admission stay
  const roomRateId = "room-600";
  const inpatientState = {
    ...baseState(),
    prices: [
      {
        id: roomRateId,
        code: "RB-WARD",
        description: "Ward",
        category: "Room Rate",
        caseRate: 600,
        effectiveDate: "2026-01-01",
      },
    ],
    admissions: [
      {
        id: "ADM-RB",
        patientId: "P1",
        admissionDate: "2026-06-28",
        status: "Admitted",
        roomTypeId: roomRateId,
        roomWard: "Surgical Nurse Station",
        roomStays: [
          {
            id: "stay-1",
            roomTypeId: roomRateId,
            roomWard: "Surgical Nurse Station",
            startDate: "2026-06-28",
          },
        ],
      },
    ],
    bills: [sampleBill({ id: "BIL-RB", date: "2026-06-28" })],
  } as unknown as AppState;

  const discharged = setBillDischargeDate(inpatientState, "BIL-RB", "2026-07-05");
  assert(!discharged.error, "setBillDischargeDate should succeed");
  const rbBill = discharged.state.bills.find((b) => b.id === "BIL-RB");
  const roomLine = rbBill?.items.find((i) => i.category === "Room");
  assert(roomLine, "Room & Board line should be auto-posted");
  assert.equal(roomLine?.qty, 7);
  assert.equal(roomLine?.unitPrice, 600);
  assert.equal(roomLine?.amount, 4200);

  // applyCaseRateToBill — auto PF line from selected case rate when no manual PF exists
  const caseRateState = {
    ...baseState(),
    caseRates: [
      {
        id: "cr-1",
        code: "44960",
        description: "Appendectomy",
        amount: 46800,
        category: "Surgical",
        professionalFeeAmount: 18720,
        healthFacilityFee: 28080,
      },
    ],
    bills: [sampleBill({ id: "BIL-CR", items: [{ description: "Room", amount: 1000, category: "Room" }] })],
  } as unknown as AppState;
  const withCaseRate = applyCaseRateToBill(caseRateState, "BIL-CR", "44960");
  const caseRateBill = withCaseRate.bills.find((b) => b.id === "BIL-CR");
  assert.equal(caseRateBill?.philhealthDeduction, 46800);
  const autoPf = caseRateBill?.items.find((i) => i.source === "case-rate-pf-auto");
  assert(autoPf, "Should add auto PF line from case rate");
  assert.equal(autoPf?.amount, 18720);

  // API case rate override — catalog lives in MariaDB, not local state.caseRates
  const apiRateState = {
    ...baseState(),
    caseRates: [],
    bills: [sampleBill({ id: "BIL-API", items: [{ description: "Lab", amount: 500, category: "Lab" }] })],
  } as unknown as AppState;
  const apiRate: CaseRate = {
    id: "api-9633",
    code: "9633",
    description: "Sample surgical case",
    amount: 10915,
    category: "Surgical",
    professionalFeeAmount: 3274.5,
    healthFacilityFee: 7640.5,
  };
  const withApiRate = applyCaseRateToBill(apiRateState, "BIL-API", "9633", 10915, apiRate);
  const apiBill = withApiRate.bills.find((b) => b.id === "BIL-API");
  assert.equal(apiBill?.philhealthDeduction, 10915);
  const apiPf = apiBill?.items.find((i) => i.source === "case-rate-pf-auto");
  assert(apiPf, "Should add auto PF line from API case rate override");
  assert.equal(apiPf?.amount, 3274.5);

  // truncateSoaField
  assert.equal(truncateSoaField("Short name", 20), "Short name");
  assert.equal(truncateSoaField("A very long patient name that exceeds the box", 10).length, 10);
  assert(truncateSoaField("A very long patient name", 12).endsWith("…"));

  console.log("billingService tests passed");
}

run();

export {};
