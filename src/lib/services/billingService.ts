import { getCaseRateByCode } from "@/lib/caseRateService";
import { getPriceAsOf } from "@/lib/priceService";
import {
  resolveChargeCategory,
  type BillChargeCategory,
} from "@/lib/services/billChargeCategories";
import { deductMedicineStock, restoreMedicineStock } from "@/lib/services/inventoryService";
import { todayISO, type AppState, type Bill, type BillItem } from "@/lib/store";

export type BillLineItem = {
  description: string;
  category?: BillChargeCategory | string;
  amount: number;
  qty: number;
  unitPrice: number;
  priceItemId?: string;
  medicineId?: string;
  /** Date charged (YYYY-MM-DD). */
  effectiveDate?: string;
  source?: "manual" | "room-board-auto";
  admissionId?: string;
};

/** Normalize a charge into a full itemized BillItem (qty, unit price, category, date). */
export function normalizeBillLineItem(state: AppState, item: BillLineItem): BillItem {
  const qty = item.qty > 0 ? item.qty : 1;
  const unitPrice =
    item.unitPrice > 0
      ? item.unitPrice
      : item.amount > 0
        ? item.amount / qty
        : 0;
  const amount = item.amount > 0 ? item.amount : unitPrice * qty;
  return {
    description: item.description,
    category: resolveChargeCategory(state, item),
    qty,
    unitPrice,
    amount,
    effectiveDate: item.effectiveDate || todayISO(),
    priceItemId: item.priceItemId,
    medicineId: item.medicineId,
    source: item.source,
    admissionId: item.admissionId,
  };
}

export function computeBillSubtotal(bill: Bill): number {
  return bill.items.reduce((sum, i) => sum + (i.amount || 0), 0);
}

export function computeBillNetTotal(bill: Bill): number {
  return Math.max(0, computeBillSubtotal(bill) - (bill.philhealthDeduction || 0));
}

export function computeBillBalance(bill: Bill): number {
  return Math.max(0, computeBillNetTotal(bill) - (bill.amountPaid || 0));
}

export function deriveBillStatus(bill: Bill): Bill["status"] {
  const net = computeBillNetTotal(bill);
  if (bill.amountPaid >= net && net > 0) return "Paid";
  if (bill.amountPaid > 0) return "Partial";
  return "Unpaid";
}

export function validateInventoryForItems(state: AppState, items: BillLineItem[]): string | null {
  for (const item of items) {
    if (!item.medicineId) continue;
    const med = state.medicines.find((m) => m.id === item.medicineId);
    if (!med) return `Medicine not found for charge: ${item.description}`;
    if (med.stock < item.qty) return `Insufficient stock for ${med.name} (have ${med.stock}, need ${item.qty})`;
  }
  return null;
}

function applyInventoryDeductions(state: AppState, items: BillLineItem[]): AppState | null {
  let next = state;
  for (const item of items) {
    if (!item.medicineId) continue;
    const deducted = deductMedicineStock(next, item.medicineId, item.qty);
    if (!deducted) return null;
    next = deducted;
  }
  return next;
}

function restoreInventoryForItems(state: AppState, items: BillLineItem[]): AppState {
  let next = state;
  for (const item of items) {
    if (!item.medicineId) continue;
    next = restoreMedicineStock(next, item.medicineId, item.qty);
  }
  return next;
}

export function createBill(
  state: AppState,
  input: {
    patientId: string;
    items: BillLineItem[];
    patientType?: Bill["patientType"];
    date?: string;
  }
): { state: AppState; bill: Bill } | { error: string } {
  if (!input.patientId) return { error: "Patient is required" };
  if (input.items.length === 0) return { error: "No charges to bill" };

  const stockError = validateInventoryForItems(state, input.items);
  if (stockError) return { error: stockError };

  const deducted = applyInventoryDeductions(state, input.items);
  if (!deducted) return { error: "Unable to deduct inventory stock" };

  const bill: Bill = {
    id: `BIL-${(input.date ?? todayISO()).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    patientId: input.patientId,
    date: input.date ?? todayISO(),
    items: input.items.map((it) => normalizeBillLineItem(state, it)),
    philhealthDeduction: 0,
    amountPaid: 0,
    status: "Unpaid",
    patientType: input.patientType ?? "Out-Patient",
    eclaimStatus: "Pending",
  };

  return { state: { ...deducted, bills: [...deducted.bills, bill] }, bill };
}

export function deleteBill(state: AppState, billId: string): AppState {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill) return state;
  const restored = restoreInventoryForItems(state, bill.items as BillLineItem[]);
  return {
    ...restored,
    bills: restored.bills.filter((b) => b.id !== billId),
    eClaims: (restored.eClaims ?? []).filter((c) => c.billId !== billId),
  };
}

export function updateBill(state: AppState, bill: Bill): AppState {
  const withStatus = { ...bill, status: deriveBillStatus(bill) };
  return {
    ...state,
    bills: state.bills.map((b) => (b.id === bill.id ? withStatus : b)),
  };
}

export function applyCaseRateToBill(
  state: AppState,
  billId: string,
  caseRateCode: string,
  amount?: number
): AppState {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill) return state;
  const deduction =
    caseRateCode === "none" || !caseRateCode
      ? 0
      : amount ?? getCaseRateByCode(state, caseRateCode, bill.date)?.amount ?? 0;
  const updated: Bill = {
    ...bill,
    caseRateCode: caseRateCode === "none" ? undefined : caseRateCode,
    philhealthDeduction: deduction,
    status: deriveBillStatus({ ...bill, philhealthDeduction: deduction }),
  };
  return updateBill(state, updated);
}

export function recordPayment(
  state: AppState,
  billId: string,
  paymentAmount: number,
  extras?: Partial<Pick<Bill, "paymentMethod" | "notes" | "dischargeDate">>
): AppState {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill) return state;
  const nextPaid = bill.amountPaid + paymentAmount;
  const updated: Bill = {
    ...bill,
    amountPaid: nextPaid,
    status: deriveBillStatus({ ...bill, amountPaid: nextPaid }),
    ...extras,
  };
  return updateBill(state, updated);
}

export function resolveLineItemPrice(
  state: AppState,
  input: {
    priceItemId?: string;
    medicineId?: string;
    manualPrice?: number;
    asOfDate?: string;
  }
): number {
  const asOf = input.asOfDate ?? todayISO();
  if (input.priceItemId) {
    const fromHistory = getPriceAsOf(state, "priceItem", input.priceItemId, asOf);
    if (fromHistory !== undefined) return fromHistory;
    const item = state.prices.find((p) => p.id === input.priceItemId);
    if (item && (item.effectiveDate || "1900-01-01") <= asOf) return item.caseRate;
    return 0;
  }
  if (input.medicineId) {
    const fromHistory = getPriceAsOf(state, "medicine", input.medicineId, asOf);
    if (fromHistory !== undefined) return fromHistory;
    const med = state.medicines.find((m) => m.id === input.medicineId);
    if (med?.priceItemId) {
      const linked = getPriceAsOf(state, "priceItem", med.priceItemId, asOf);
      if (linked !== undefined) return linked;
      const priceItem = state.prices.find((p) => p.id === med.priceItemId);
      if (priceItem && (priceItem.effectiveDate || "1900-01-01") <= asOf) {
        return priceItem.caseRate;
      }
    }
    if (med && (med.priceEffectiveDate || "1900-01-01") <= asOf) return med.unitPrice;
    return 0;
  }
  return input.manualPrice ?? 0;
}

export function getPatientBills(state: AppState, patientId: string): Bill[] {
  return state.bills.filter((b) => b.patientId === patientId).sort((a, b) => b.date.localeCompare(a.date));
}

export function createEmptyBill(
  state: AppState,
  patientId: string,
  patientType: Bill["patientType"] = "In-Patient"
): { state: AppState; bill: Bill } {
  const bill: Bill = {
    id: `BIL-${todayISO().replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    patientId,
    date: todayISO(),
    items: [],
    philhealthDeduction: 0,
    amountPaid: 0,
    status: "Unpaid",
    patientType,
    eclaimStatus: "Pending",
  };
  return { state: { ...state, bills: [...state.bills, bill] }, bill };
}

export function appendBillLineItem(state: AppState, billId: string, item: BillLineItem): AppState {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill) return state;
  const updated: Bill = {
    ...bill,
    items: [...bill.items, normalizeBillLineItem(state, item)],
    status: deriveBillStatus(bill),
  };
  return updateBill(state, updated);
}
