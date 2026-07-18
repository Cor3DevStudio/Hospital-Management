import type { AppState, PriceHistory, PriceItem, Medicine } from "./store";
import { todayISO } from "./store";

const normalizeDate = (date?: string) => date || "1900-01-01";

export const getPriceHistoryForItem = (
  state: AppState,
  itemType: "priceItem" | "medicine",
  itemId: string,
): PriceHistory[] => {
  return state.priceHistories
    .filter((h) => h.itemType === itemType && h.itemId === itemId)
    .sort((a, b) => normalizeDate(b.effectiveDate).localeCompare(normalizeDate(a.effectiveDate)));
};

export const getPriceAsOf = (
  state: AppState,
  itemType: "priceItem" | "medicine",
  itemId: string,
  asOf?: string,
): number | undefined => {
  const date = asOf || todayISO();
  const history = getPriceHistoryForItem(state, itemType, itemId).filter(
    (h) => normalizeDate(h.effectiveDate) <= date,
  );
  return history[0]?.amount;
};

export const getLatestPrice = (
  state: AppState,
  itemType: "priceItem" | "medicine",
  itemId: string,
): number | undefined => {
  return getPriceAsOf(state, itemType, itemId, todayISO());
};

export const getPriceLabel = (history: PriceHistory) =>
  `${history.amount.toFixed(2)} (effective ${history.effectiveDate})`;

export const getPriceItemEffectiveAmount = (item: PriceItem) => item.caseRate;
export const getMedicineEffectiveAmount = (item: Medicine) => item.unitPrice;
