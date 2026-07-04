import {
  appendBillLineItem,
  createEmptyBill,
  type BillLineItem,
} from "@/lib/services/billingService";
import { isPatientDischarged } from "@/lib/services/admissionService";
import { todayISO, type AppState, type Bill } from "@/lib/store";

export function canPostCharges(
  state: AppState,
  patientId: string,
  billId?: string
): { allowed: boolean; reason?: string } {
  if (isPatientDischarged(state, patientId)) {
    return { allowed: false, reason: "Patient has been discharged. Charge entry is disabled until readmission." };
  }
  if (billId) {
    const bill = state.bills.find((b) => b.id === billId);
    if (bill?.dischargeDate) {
      return { allowed: false, reason: "Current bill is discharged. Charge entry is disabled." };
    }
  }
  return { allowed: true };
}

export function getOrCreateOpenBill(state: AppState, patientId: string): { state: AppState; bill: Bill } {
  const open = state.bills.find(
    (b) => b.patientId === patientId && b.status !== "Paid" && !b.dischargeDate
  );
  if (open) return { state, bill: open };
  return createEmptyBill(state, patientId);
}

export function postServiceCharge(
  state: AppState,
  patientId: string,
  lineItem: BillLineItem,
  existingBillId?: string
): { state: AppState; bill: Bill } | { error: string } {
  const check = canPostCharges(state, patientId, existingBillId);
  if (!check.allowed) return { error: check.reason ?? "Charges not allowed" };

  let working = state;
  let bill: Bill;
  if (existingBillId) {
    const found = working.bills.find((b) => b.id === existingBillId);
    if (!found) return { error: "Bill not found" };
    bill = found;
  } else {
    const created = getOrCreateOpenBill(working, patientId);
    working = created.state;
    bill = created.bill;
  }

  working = appendBillLineItem(working, bill.id, lineItem);
  const updated = working.bills.find((b) => b.id === bill.id);
  if (!updated) return { error: "Failed to post charge" };
  return { state: working, bill: updated };
}
