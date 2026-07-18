import { getLatestAdmission } from "@/lib/services/admissionService";
import { resolveLineItemPrice } from "@/lib/services/billingService";
import { postServiceCharge } from "@/lib/services/chargePostingService";
import { deductMedicineStock, restoreMedicineStock } from "@/lib/services/inventoryService";
import { uid, todayISO, type AppState, type SuppliesRecord } from "@/lib/store";

export function issueSupply(
  state: AppState,
  input: {
    patientId: string;
    medicineId: string;
    quantity: number;
    issuedBy?: string;
    issueDate?: string;
    notes?: string;
  },
): { state: AppState; record: SuppliesRecord } | { error: string } {
  const item = state.medicines.find((m) => m.id === input.medicineId);
  if (!item) return { error: "Supply item not found" };
  if (item.category !== "Supplies") {
    return { error: "Item is not a supply — use Pharmacy for medicines" };
  }
  if (item.stock < input.quantity) {
    return { error: `Insufficient stock for ${item.name} (have ${item.stock})` };
  }

  const chargeDate = input.issueDate || todayISO();
  const unitPrice = resolveLineItemPrice(state, {
    medicineId: input.medicineId,
    asOfDate: chargeDate,
  });
  if (unitPrice <= 0) {
    return { error: `No price effective on ${chargeDate} for ${item.name}` };
  }
  const totalAmount = unitPrice * input.quantity;
  const admission = getLatestAdmission(state, input.patientId);

  const record: SuppliesRecord = {
    id: uid(),
    patientId: input.patientId,
    itemName: item.name,
    medicineId: item.id,
    quantity: input.quantity,
    unitPrice,
    totalAmount,
    issueDate: chargeDate,
    issuedBy: input.issuedBy,
    admissionId: admission?.status === "Admitted" ? admission.id : undefined,
    status: "Issued",
    notes: input.notes,
  };

  let next = deductMedicineStock(state, input.medicineId, input.quantity);
  if (!next) return { error: "Unable to deduct inventory" };

  const charge = postServiceCharge(next, input.patientId, {
    description: item.name,
    category: "Supplies",
    qty: input.quantity,
    unitPrice,
    amount: totalAmount,
    medicineId: item.id,
    effectiveDate: chargeDate,
  });

  if ("error" in charge) return { error: charge.error };

  record.billId = charge.bill.id;
  const suppliesRecords = [...(charge.state.suppliesRecords ?? []), record];
  next = {
    ...charge.state,
    suppliesRecords,
  };

  return { state: next, record };
}

export function updateSuppliesRecord(state: AppState, form: SuppliesRecord): AppState {
  return {
    ...state,
    suppliesRecords: (state.suppliesRecords ?? []).map((r) => (r.id === form.id ? form : r)),
  };
}

export function returnSupplyIssue(state: AppState, recordId: string): AppState | { error: string } {
  const record = (state.suppliesRecords ?? []).find((r) => r.id === recordId);
  if (!record || record.status !== "Issued") return { error: "Record not found or not issued" };
  if (!record.medicineId) return { error: "No supply item linked" };

  let next = restoreMedicineStock(state, record.medicineId, record.quantity);
  next = updateSuppliesRecord(next, { ...record, status: "Returned" });
  return next;
}

export function deleteSuppliesRecord(state: AppState, recordId: string): AppState {
  return {
    ...state,
    suppliesRecords: (state.suppliesRecords ?? []).filter((r) => r.id !== recordId),
  };
}

export function emptySuppliesRecord(patientId = ""): SuppliesRecord {
  return {
    id: "",
    patientId,
    itemName: "",
    quantity: 1,
    issueDate: todayISO(),
    status: "Pending",
    notes: "",
  };
}
