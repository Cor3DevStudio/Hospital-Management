import { uid, todayISO, type AppState, type PriceCategory, type PriceItem } from "@/lib/store";

export const PRICE_CATEGORIES: PriceCategory[] = [
  "Medicine",
  "Supplies",
  "Equipment",
  "Laboratory",
  "Procedure",
  "Room Rate",
  "Miscellaneous",
  "Other",
];

export type PriceListFilter = {
  query?: string;
  category?: string;
};

export function filterPriceItems(prices: PriceItem[], filter: PriceListFilter): PriceItem[] {
  const q = (filter.query ?? "").trim().toLowerCase();
  return prices
    .filter((p) => {
      if (filter.category && filter.category !== "All" && p.category !== filter.category)
        return false;
      if (!q) return true;
      return (
        p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

function appendPriceHistory(
  state: AppState,
  itemId: string,
  amount: number,
  effectiveDate: string,
  note: string,
): AppState["priceHistories"] {
  return [
    ...state.priceHistories,
    {
      id: `ph-${itemId}-${Date.now()}`,
      itemType: "priceItem" as const,
      itemId,
      amount,
      effectiveDate,
      createdAt: new Date().toISOString(),
      note,
    },
  ];
}

export function createPriceItem(state: AppState, form: Omit<PriceItem, "id">): AppState {
  const itemId = uid();
  const effectiveDate = form.effectiveDate || todayISO();
  const item: PriceItem = { ...form, id: itemId, effectiveDate };
  return {
    ...state,
    prices: [...state.prices, item],
    priceHistories: appendPriceHistory(
      state,
      itemId,
      form.caseRate,
      effectiveDate,
      "Initial price item",
    ),
  };
}

export function updatePriceItem(state: AppState, form: PriceItem): AppState {
  const exists = state.prices.find((p) => p.id === form.id);
  if (!exists) return state;
  const effectiveDate = form.effectiveDate || todayISO();
  const item: PriceItem = { ...form, effectiveDate };
  const shouldCreateHistory =
    exists.caseRate !== form.caseRate || exists.effectiveDate !== effectiveDate;
  let next = {
    ...state,
    prices: state.prices.map((p) => (p.id === form.id ? item : p)),
    priceHistories: shouldCreateHistory
      ? appendPriceHistory(state, form.id, form.caseRate, effectiveDate, "Updated price item")
      : state.priceHistories,
  };
  next = syncLinkedMedicinePrices(next, form.id, form.caseRate, effectiveDate);
  return next;
}

export function deletePriceItem(state: AppState, priceItemId: string): AppState {
  return {
    ...state,
    prices: state.prices.filter((p) => p.id !== priceItemId),
    priceHistories: state.priceHistories.filter(
      (h) => !(h.itemType === "priceItem" && h.itemId === priceItemId),
    ),
    medicines: state.medicines.map((m) =>
      m.priceItemId === priceItemId ? { ...m, priceItemId: undefined } : m,
    ),
  };
}

export function syncLinkedMedicinePrices(
  state: AppState,
  priceItemId: string,
  amount: number,
  effectiveDate: string,
): AppState {
  const linked = state.medicines.filter((m) => m.priceItemId === priceItemId);
  if (linked.length === 0) return state;
  let next = { ...state };
  for (const med of linked) {
    next = {
      ...next,
      medicines: next.medicines.map((m) =>
        m.id === med.id ? { ...m, unitPrice: amount, priceEffectiveDate: effectiveDate } : m,
      ),
      priceHistories: [
        ...next.priceHistories,
        {
          id: `ph-md-${med.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          itemType: "medicine" as const,
          itemId: med.id,
          amount,
          effectiveDate,
          createdAt: new Date().toISOString(),
          note: "Synced from price list",
        },
      ],
    };
  }
  return next;
}
