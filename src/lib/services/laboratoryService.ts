import { resolveLineItemPrice } from "@/lib/services/billingService";
import { postServiceCharge } from "@/lib/services/chargePostingService";
import { createPriceItem } from "@/lib/services/priceListService";
import { uid, todayISO, type AppState, type LaboratoryRecord, type PriceItem } from "@/lib/store";

/** Seed common lab tests when the Hospital Prices catalog has none yet. */
export const DEFAULT_LAB_TESTS: { code: string; description: string; amount: number }[] = [
  { code: "LAB-CBC", description: "Complete Blood Count", amount: 350 },
  { code: "LAB-UA", description: "Urinalysis", amount: 200 },
  { code: "LAB-FBS", description: "Fasting Blood Sugar", amount: 180 },
];

/** Seed effective date so default catalog items price on any order date. */
const DEFAULT_PRICE_EFFECTIVE_DATE = "1900-01-01";

const LAB_PRICE_CATEGORIES = new Set(["laboratory", "lab", "diagnostic", "diagnostics"]);

export function getLabPriceItems(state: AppState): PriceItem[] {
  return state.prices
    .filter((p) => LAB_PRICE_CATEGORIES.has(String(p.category).toLowerCase()))
    .sort((a, b) => a.description.localeCompare(b.description));
}

export function ensureDefaultLabPrices(state: AppState): AppState {
  if (getLabPriceItems(state).length > 0) return state;
  let next = state;
  for (const test of DEFAULT_LAB_TESTS) {
    next = createPriceItem(next, {
      code: test.code,
      description: test.description,
      caseRate: test.amount,
      category: "Laboratory",
      effectiveDate: DEFAULT_PRICE_EFFECTIVE_DATE,
    });
  }
  return next;
}

export function createLabOrder(
  state: AppState,
  form: Omit<LaboratoryRecord, "id">,
  postCharge = true
): { state: AppState; record: LaboratoryRecord } | { error: string } {
  const working = ensureDefaultLabPrices(state);
  const chargeDate = form.requestDate || todayISO();
  const qty = form.quantity && form.quantity > 0 ? form.quantity : 1;

  let unitPrice = form.unitPrice ?? 0;
  let totalAmount = form.totalAmount ?? 0;

  if (postCharge) {
    if (!form.priceItemId) {
      return { error: "Select a lab test from Hospital Prices to charge" };
    }
    unitPrice = resolveLineItemPrice(working, {
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

  let next: AppState = { ...working, laboratoryRecords: [...working.laboratoryRecords, record] };

  if (postCharge && form.priceItemId && unitPrice > 0) {
    const priceItem = working.prices.find((p) => p.id === form.priceItemId);
    const charge = postServiceCharge(next, form.patientId, {
      description: form.testName || priceItem?.description || "Laboratory",
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
