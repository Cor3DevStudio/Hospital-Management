import { resolveLineItemPrice } from "@/lib/services/billingService";
import { postServiceCharge } from "@/lib/services/chargePostingService";
import { uid, todayISO, type AppState, type RadiologyRecord } from "@/lib/store";

export const RADIOLOGY_EXAM_TYPES = ["X-ray", "CT Scan", "Ultrasound", "MRI", "Mammography", "Other"];

export function createRadiologyOrder(
  state: AppState,
  form: Omit<RadiologyRecord, "id">,
  postCharge = true
): { state: AppState; record: RadiologyRecord } | { error: string } {
  const chargeDate = form.requestDate || todayISO();
  const qty = form.quantity && form.quantity > 0 ? form.quantity : 1;
  const imagingType = form.examType || form.imagingType;

  let unitPrice = form.unitPrice ?? 0;
  let totalAmount = form.totalAmount ?? 0;

  if (postCharge) {
    if (!form.priceItemId) {
      return { error: "Select a procedure from the Price List to charge" };
    }
    unitPrice = resolveLineItemPrice(state, {
      priceItemId: form.priceItemId,
      asOfDate: chargeDate,
    });
    if (unitPrice <= 0) {
      return { error: `No price effective on ${chargeDate} for this procedure` };
    }
    totalAmount = unitPrice * qty;
  }

  const record: RadiologyRecord = {
    ...form,
    id: uid(),
    imagingType,
    quantity: qty,
    unitPrice: unitPrice || undefined,
    totalAmount: totalAmount || undefined,
    requestDate: chargeDate,
  };

  let next: AppState = { ...state, radiologyRecords: [...state.radiologyRecords, record] };

  if (postCharge && form.priceItemId && unitPrice > 0) {
    const charge = postServiceCharge(next, form.patientId, {
      description: imagingType || form.imagingType,
      category: "Radiology",
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
      radiologyRecords: next.radiologyRecords.map((r) =>
        r.id === record.id ? { ...record, billId: charge.bill.id } : r
      ),
    };
  }

  const saved = next.radiologyRecords.find((r) => r.id === record.id)!;
  return { state: next, record: saved };
}

export function updateRadiologyRecord(state: AppState, form: RadiologyRecord): AppState {
  return {
    ...state,
    radiologyRecords: state.radiologyRecords.map((r) => (r.id === form.id ? form : r)),
  };
}

export function deleteRadiologyRecord(state: AppState, recordId: string): AppState {
  return {
    ...state,
    radiologyRecords: state.radiologyRecords.filter((r) => r.id !== recordId),
  };
}

export function emptyRadiologyRecord(patientId = ""): RadiologyRecord {
  return {
    id: "",
    patientId,
    imagingType: "",
    examType: "X-ray",
    quantity: 1,
    requestedBy: "",
    requestDate: todayISO(),
    status: "Pending",
    notes: "",
  };
}
