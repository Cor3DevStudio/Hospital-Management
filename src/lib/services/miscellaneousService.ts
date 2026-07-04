import { getLatestAdmission } from "@/lib/services/admissionService";
import { resolveLineItemPrice } from "@/lib/services/billingService";
import { postServiceCharge } from "@/lib/services/chargePostingService";
import { createPriceItem } from "@/lib/services/priceListService";
import { uid, todayISO, type AppState, type MiscellaneousRecord, type PriceItem } from "@/lib/store";

/** Seed fee types — add more entries here or via Admin Settings. */
export const DEFAULT_MISC_FEES: { code: string; description: string; amount: number }[] = [
  { code: "MISC-DR", description: "Delivery Room Fee", amount: 3500 },
  { code: "MISC-OR", description: "Operating Room Fee", amount: 8000 },
];

export function getMiscFeeItems(state: AppState): PriceItem[] {
  return state.prices
    .filter((p) => p.category === "Miscellaneous")
    .sort((a, b) => a.description.localeCompare(b.description));
}

export function ensureDefaultMiscFees(state: AppState): AppState {
  const existing = getMiscFeeItems(state);
  if (existing.length > 0) return state;
  let next = state;
  for (const fee of DEFAULT_MISC_FEES) {
    next = createPriceItem(next, {
      code: fee.code,
      description: fee.description,
      caseRate: fee.amount,
      category: "Miscellaneous",
      effectiveDate: todayISO(),
    });
  }
  return next;
}

export function postMiscellaneousCharge(
  state: AppState,
  input: {
    patientId: string;
    feeTypeId: string;
    quantity?: number;
    chargeDate?: string;
    orderedBy?: string;
    notes?: string;
  }
): { state: AppState; record: MiscellaneousRecord } | { error: string } {
  if (!input.patientId) return { error: "Patient is required" };
  const fee = state.prices.find((p) => p.id === input.feeTypeId && p.category === "Miscellaneous");
  if (!fee) return { error: "Fee type not found — configure it in Settings → Miscellaneous" };

  const chargeDate = input.chargeDate || todayISO();
  const quantity = input.quantity && input.quantity > 0 ? input.quantity : 1;
  const unitPrice = resolveLineItemPrice(state, {
    priceItemId: fee.id,
    asOfDate: chargeDate,
  });
  if (unitPrice <= 0) {
    return { error: `No rate effective on ${chargeDate} for ${fee.description}` };
  }

  const totalAmount = unitPrice * quantity;
  const admission = getLatestAdmission(state, input.patientId);

  const record: MiscellaneousRecord = {
    id: uid(),
    patientId: input.patientId,
    feeTypeId: fee.id,
    feeName: fee.description,
    quantity,
    unitPrice,
    totalAmount,
    chargeDate,
    orderedBy: input.orderedBy,
    admissionId: admission?.status === "Admitted" ? admission.id : undefined,
    status: "Posted",
    notes: input.notes,
  };

  const charge = postServiceCharge(state, input.patientId, {
    description: fee.description,
    category: "Other",
    qty: quantity,
    unitPrice,
    amount: totalAmount,
    priceItemId: fee.id,
    effectiveDate: chargeDate,
  });

  if ("error" in charge) return { error: charge.error };

  record.billId = charge.bill.id;
  const next: AppState = {
    ...charge.state,
    miscellaneousRecords: [...(charge.state.miscellaneousRecords ?? []), record],
  };

  return { state: next, record };
}

export function deleteMiscellaneousRecord(state: AppState, recordId: string): AppState {
  return {
    ...state,
    miscellaneousRecords: (state.miscellaneousRecords ?? []).filter((r) => r.id !== recordId),
  };
}

export function cancelMiscellaneousRecord(
  state: AppState,
  recordId: string
): AppState | { error: string } {
  const record = (state.miscellaneousRecords ?? []).find((r) => r.id === recordId);
  if (!record) return { error: "Record not found" };
  if (record.status === "Cancelled") return { error: "Already cancelled" };
  return {
    ...state,
    miscellaneousRecords: (state.miscellaneousRecords ?? []).map((r) =>
      r.id === recordId ? { ...r, status: "Cancelled" as const } : r
    ),
  };
}
