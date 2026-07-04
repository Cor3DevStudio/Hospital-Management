import { resolveLineItemPrice } from "@/lib/services/billingService";
import { postServiceCharge } from "@/lib/services/chargePostingService";
import { uid, todayISO, type AppState, type LaboratoryRecord } from "@/lib/store";

export function createLabOrder(
  state: AppState,
  form: Omit<LaboratoryRecord, "id">,
  postCharge = true
): { state: AppState; record: LaboratoryRecord } | { error: string } {
  const chargeDate = form.requestDate || todayISO();
  const qty = form.quantity && form.quantity > 0 ? form.quantity : 1;

  let unitPrice = form.unitPrice ?? 0;
  let totalAmount = form.totalAmount ?? 0;

  if (postCharge) {
    if (!form.priceItemId) {
      return { error: "Select a lab test from the Price List to charge" };
    }
    unitPrice = resolveLineItemPrice(state, {
      priceItemId: form.priceItemId,
      asOfDate: chargeDate,
    });
    if (unitPrice <= 0) {
      return { error: `No price effective on ${chargeDate} for this lab test` };
    }
    totalAmount = unitPrice * qty;
  }

  const record: LaboratoryRecord = {
    ...form,
    id: uid(),
    quantity: qty,
    unitPrice: unitPrice || undefined,
    totalAmount: totalAmount || undefined,
    requestDate: chargeDate,
  };

  let next: AppState = { ...state, laboratoryRecords: [...state.laboratoryRecords, record] };

  if (postCharge && form.priceItemId && unitPrice > 0) {
    const charge = postServiceCharge(next, form.patientId, {
      description: form.testName,
      category: "Lab",
      qty,
      unitPrice,
      amount: totalAmount,
      priceItemId: form.priceItemId,
      effectiveDate: chargeDate,
    });
    if ("error" in charge) return { error: charge.error };
    next = charge.state;
    record.billId = charge.bill.id;
    next = {
      ...next,
      laboratoryRecords: next.laboratoryRecords.map((r) =>
        r.id === record.id ? { ...record, billId: charge.bill.id } : r
      ),
    };
  }

  const saved = next.laboratoryRecords.find((r) => r.id === record.id)!;
  return { state: next, record: saved };
}

export function updateLabRecord(state: AppState, form: LaboratoryRecord): AppState {
  return {
    ...state,
    laboratoryRecords: state.laboratoryRecords.map((r) => (r.id === form.id ? form : r)),
  };
}

export function deleteLabRecord(state: AppState, recordId: string): AppState {
  return {
    ...state,
    laboratoryRecords: state.laboratoryRecords.filter((r) => r.id !== recordId),
  };
}

export function emptyLabRecord(patientId = ""): LaboratoryRecord {
  return {
    id: "",
    patientId,
    testName: "",
    quantity: 1,
    requestedBy: "",
    requestDate: todayISO(),
    status: "Pending",
    notes: "",
  };
}
