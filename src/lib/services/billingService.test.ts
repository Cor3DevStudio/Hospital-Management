import { strict as assert } from "assert";
import {
  canCancelBillDischarge,
  createBill,
  normalizeBillPaymentMethod,
  recordPayment,
  type BillLineItem,
} from "./billingService";
import { processBillPayment } from "./cashierService";
import { truncateSoaField } from "../../components/billing/buildSoaValues";
import type { AppState, Bill } from "../store";

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

  // truncateSoaField
  assert.equal(truncateSoaField("Short name", 20), "Short name");
  assert.equal(truncateSoaField("A very long patient name that exceeds the box", 10).length, 10);
  assert(truncateSoaField("A very long patient name", 12).endsWith("…"));

  console.log("billingService tests passed");
}

run();

export {};
