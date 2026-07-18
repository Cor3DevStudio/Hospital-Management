import { getPriceAsOf } from "@/lib/priceService";
import { uid, todayISO, type AppState, type InventoryCategory, type Medicine } from "@/lib/store";

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
  "Medicine",
  "Supplies",
  "Equipment",
  "Laboratory",
  "Radiology",
  "Miscellaneous",
];

const EXPIRING_SOON_DAYS = 180;

export function isLowStock(item: Medicine): boolean {
  return item.stock <= item.reorderLevel;
}

export function isExpiringSoon(item: Medicine, asOf = new Date()): boolean {
  if (!item.expiry) return false;
  const expiry = new Date(item.expiry);
  if (Number.isNaN(expiry.getTime())) return false;
  const diffDays = (expiry.getTime() - asOf.getTime()) / 86400000;
  return diffDays >= 0 && diffDays < EXPIRING_SOON_DAYS;
}

export function getLowStockItems(medicines: Medicine[]): Medicine[] {
  return medicines.filter((m) => !m.archived && isLowStock(m));
}

export function getExpiringSoonItems(medicines: Medicine[]): Medicine[] {
  return medicines.filter((m) => !m.archived && isExpiringSoon(m));
}

export type InventoryFilter = {
  query?: string;
  category?: string;
  showArchived?: boolean;
};

export function filterInventory(medicines: Medicine[], filter: InventoryFilter): Medicine[] {
  const q = (filter.query ?? "").trim().toLowerCase();
  return medicines
    .filter((m) => {
      if (!filter.showArchived && m.archived) return false;
      if (filter.showArchived && !m.archived) return false;
      if (filter.category && filter.category !== "All" && m.category !== filter.category)
        return false;
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function appendMedicinePriceHistory(
  state: AppState,
  itemId: string,
  amount: number,
  effectiveDate: string,
  note: string,
): AppState["priceHistories"] {
  return [
    ...state.priceHistories,
    {
      id: `ph-md-${itemId}-${Date.now()}`,
      itemType: "medicine" as const,
      itemId,
      amount,
      effectiveDate,
      createdAt: new Date().toISOString(),
      note,
    },
  ];
}

export function resolveMedicineUnitPrice(state: AppState, form: Medicine, asOf?: string): number {
  if (form.priceItemId) {
    const fromPriceList = getPriceAsOf(
      state,
      "priceItem",
      form.priceItemId,
      asOf ?? form.priceEffectiveDate ?? todayISO(),
    );
    if (fromPriceList !== undefined) return fromPriceList;
  }
  return form.unitPrice;
}

export function createMedicine(state: AppState, form: Omit<Medicine, "id">): AppState {
  const itemId = uid();
  const effectiveDate = form.priceEffectiveDate || todayISO();
  const unitPrice = resolveMedicineUnitPrice(state, { ...form, id: itemId });
  const medicine: Medicine = {
    ...form,
    id: itemId,
    unit: form.unit || "pcs",
    category: form.category || "Medicine",
    unitPrice,
    priceEffectiveDate: effectiveDate,
    archived: false,
  };
  return {
    ...state,
    medicines: [...state.medicines, medicine],
    priceHistories: appendMedicinePriceHistory(
      state,
      itemId,
      unitPrice,
      effectiveDate,
      "Initial medicine price",
    ),
  };
}

export function updateMedicine(state: AppState, form: Medicine): AppState {
  const exists = state.medicines.find((m) => m.id === form.id);
  if (!exists) return state;
  const effectiveDate = form.priceEffectiveDate || todayISO();
  const unitPrice = resolveMedicineUnitPrice(state, form);
  const medicine: Medicine = {
    ...form,
    unit: form.unit || "pcs",
    unitPrice,
    priceEffectiveDate: effectiveDate,
  };
  const shouldCreateHistory =
    exists.unitPrice !== unitPrice || exists.priceEffectiveDate !== effectiveDate;
  return {
    ...state,
    medicines: state.medicines.map((m) => (m.id === form.id ? medicine : m)),
    priceHistories: shouldCreateHistory
      ? appendMedicinePriceHistory(
          state,
          form.id,
          unitPrice,
          effectiveDate,
          "Updated medicine price",
        )
      : state.priceHistories,
  };
}

export function archiveMedicine(state: AppState, medicineId: string): AppState {
  return {
    ...state,
    medicines: state.medicines.map((m) => (m.id === medicineId ? { ...m, archived: true } : m)),
  };
}

export function restoreMedicine(state: AppState, medicineId: string): AppState {
  return {
    ...state,
    medicines: state.medicines.map((m) => (m.id === medicineId ? { ...m, archived: false } : m)),
  };
}

export function deleteMedicine(state: AppState, medicineId: string): AppState {
  return {
    ...state,
    medicines: state.medicines.filter((m) => m.id !== medicineId),
    priceHistories: state.priceHistories.filter(
      (h) => !(h.itemType === "medicine" && h.itemId === medicineId),
    ),
  };
}

export function adjustMedicineStock(state: AppState, medicineId: string, delta: number): AppState {
  return {
    ...state,
    medicines: state.medicines.map((m) =>
      m.id === medicineId ? { ...m, stock: Math.max(0, m.stock + delta) } : m,
    ),
  };
}

export function deductMedicineStock(
  state: AppState,
  medicineId: string,
  qty: number,
): AppState | null {
  const medicine = state.medicines.find((m) => m.id === medicineId);
  if (!medicine || medicine.stock < qty) return null;
  return adjustMedicineStock(state, medicineId, -qty);
}

export function restoreMedicineStock(state: AppState, medicineId: string, qty: number): AppState {
  return adjustMedicineStock(state, medicineId, qty);
}
