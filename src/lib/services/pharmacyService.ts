import { getLatestAdmission } from "@/lib/services/admissionService";
import { resolveLineItemPrice } from "@/lib/services/billingService";
import { postServiceCharge } from "@/lib/services/chargePostingService";
import { deductMedicineStock, restoreMedicineStock } from "@/lib/services/inventoryService";
import { uid, todayISO, type AppState, type PharmacyRecord } from "@/lib/store";

export function dispenseMedicine(
  state: AppState,
  input: {
    patientId: string;
    medicineId: string;
    quantity: number;
    prescribedBy: string;
    dispenseDate?: string;
    notes?: string;
  }
): { state: AppState; record: PharmacyRecord } | { error: string } {
  const med = state.medicines.find((m) => m.id === input.medicineId);
  if (!med) return { error: "Medicine not found" };
  if (med.category && med.category !== "Medicine") {
    return { error: "Item is not a medicine — use Supplies for supply items" };
  }
  if (med.stock < input.quantity) {
    return { error: `Insufficient stock for ${med.name} (have ${med.stock})` };
  }

  const chargeDate = input.dispenseDate || todayISO();
  const unitPrice = resolveLineItemPrice(state, {
    medicineId: input.medicineId,
    asOfDate: chargeDate,
  });
  if (unitPrice <= 0) {
    return { error: `No price effective on ${chargeDate} for ${med.name}` };
  }
  const totalAmount = unitPrice * input.quantity;
  const admission = getLatestAdmission(state, input.patientId);

  const record: PharmacyRecord = {
    id: uid(),
    patientId: input.patientId,
    medicine: med.name,
    medicineId: med.id,
    quantity: input.quantity,
    unitPrice,
    totalAmount,
    dispenseDate: chargeDate,
    prescribedBy: input.prescribedBy,
    admissionId: admission?.status === "Admitted" ? admission.id : undefined,
    status: "Dispensed",
    notes: input.notes,
  };

  let next = deductMedicineStock(state, input.medicineId, input.quantity);
  if (!next) return { error: "Unable to deduct inventory" };

  const charge = postServiceCharge(next, input.patientId, {
    description: med.name,
    category: "Medicine",
    qty: input.quantity,
    unitPrice,
    amount: totalAmount,
    medicineId: med.id,
    effectiveDate: chargeDate,
  });

  if ("error" in charge) return { error: charge.error };

  record.billId = charge.bill.id;
  next = {
    ...charge.state,
    pharmacyRecords: [...charge.state.pharmacyRecords, record],
  };

  return { state: next, record };
}

export function createPharmacyRecord(state: AppState, form: Omit<PharmacyRecord, "id">): AppState {
  return { ...state, pharmacyRecords: [...state.pharmacyRecords, { ...form, id: uid() }] };
}

export function updatePharmacyRecord(state: AppState, form: PharmacyRecord): AppState {
  return {
    ...state,
    pharmacyRecords: state.pharmacyRecords.map((r) => (r.id === form.id ? form : r)),
  };
}

export function returnPharmacyDispense(state: AppState, recordId: string): AppState | { error: string } {
  const record = state.pharmacyRecords.find((r) => r.id === recordId);
  if (!record || record.status !== "Dispensed") return { error: "Record not found or not dispensed" };
  if (!record.medicineId) return { error: "No medicine linked" };

  let next = restoreMedicineStock(state, record.medicineId, record.quantity);
  next = updatePharmacyRecord(next, { ...record, status: "Returned" });
  return next;
}

export function deletePharmacyRecord(state: AppState, recordId: string): AppState {
  return { ...state, pharmacyRecords: state.pharmacyRecords.filter((r) => r.id !== recordId) };
}

export function emptyPharmacyRecord(patientId = ""): PharmacyRecord {
  return {
    id: "",
    patientId,
    medicine: "",
    quantity: 1,
    dispenseDate: todayISO(),
    prescribedBy: "",
    status: "Pending",
    notes: "",
  };
}
