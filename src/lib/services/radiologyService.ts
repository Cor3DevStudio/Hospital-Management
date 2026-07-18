import { resolveLineItemPrice } from "@/lib/services/billingService";
import { postServiceCharge } from "@/lib/services/chargePostingService";
import { createPriceItem } from "@/lib/services/priceListService";
import { uid, todayISO, type AppState, type PriceItem, type RadiologyRecord } from "@/lib/store";

/** Seed effective date so default catalog items price on any order date. */
const DEFAULT_PRICE_EFFECTIVE_DATE = "1900-01-01";

export const RADIOLOGY_EXAM_TYPES = [
  "X-ray",
  "CT Scan",
  "Ultrasound",
  "MRI",
  "Mammography",
  "Other",
];

/** Seed common imaging procedures when the Hospital Prices catalog has none yet. */
export const DEFAULT_RAD_PROCEDURES: { code: string; description: string; amount: number }[] = [
  { code: "RAD-XRAY-CHEST", description: "Chest X-ray (PA)", amount: 450 },
  { code: "RAD-UTZ-ABD", description: "Abdominal Ultrasound", amount: 1200 },
  { code: "RAD-ECG", description: "Electrocardiogram", amount: 600 },
];

const RADIOLOGY_PRICE_CATEGORIES = new Set([
  "procedure",
  "other",
  "radiology",
  "equipment",
  "imaging",
  "x-ray",
  "xray",
]);

export function getRadiologyPriceItems(state: AppState): PriceItem[] {
  return state.prices
    .filter((p) => RADIOLOGY_PRICE_CATEGORIES.has(String(p.category).toLowerCase()))
    .sort((a, b) => a.description.localeCompare(b.description));
}

export function ensureDefaultRadiologyPrices(state: AppState): AppState {
  if (getRadiologyPriceItems(state).length > 0) return state;
  let next = state;
  for (const proc of DEFAULT_RAD_PROCEDURES) {
    next = createPriceItem(next, {
      code: proc.code,
      description: proc.description,
      caseRate: proc.amount,
      category: "Procedure",
      effectiveDate: DEFAULT_PRICE_EFFECTIVE_DATE,
    });
  }
  return next;
}

export function createRadiologyOrder(
  state: AppState,
  form: Omit<RadiologyRecord, "id">,
  postCharge = true,
): { state: AppState; record: RadiologyRecord } | { error: string } {
  const working = ensureDefaultRadiologyPrices(state);
  const chargeDate = form.requestDate || todayISO();
  const qty = form.quantity && form.quantity > 0 ? form.quantity : 1;
  const imagingType = form.examType || form.imagingType;

  let unitPrice = form.unitPrice ?? 0;
  let totalAmount = form.totalAmount ?? 0;

  if (postCharge) {
    if (!form.priceItemId) {
      return { error: "Select a procedure from Hospital Prices to charge" };
    }
    unitPrice = resolveLineItemPrice(working, {
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

  let next: AppState = { ...working, radiologyRecords: [...working.radiologyRecords, record] };

  if (postCharge && form.priceItemId && unitPrice > 0) {
    const priceItem = working.prices.find((p) => p.id === form.priceItemId);
    const charge = postServiceCharge(next, form.patientId, {
      description: form.imagingType || priceItem?.description || imagingType || "Radiology",
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
        r.id === record.id ? { ...record, billId: charge.bill.id } : r,
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
