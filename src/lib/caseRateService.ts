import type { AppState, CaseRate } from "./store";
import { todayISO } from "./store";

// Helper: normalize an ISO date string (YYYY-MM-DD). If falsy, return very old date.
const normDate = (d?: string) => (d ? d : "1900-01-01");

// Returns the case rate entry for `code` that was effective as of `asOf` date.
// If `asOf` is omitted, uses today's date. When multiple entries exist for the same
// `code`, the function selects the one with the latest `effectiveDate` that is <= asOf.
export const getCaseRateByCode = (
  state: AppState,
  code: string,
  asOf?: string,
): CaseRate | undefined => {
  const asOfDate = asOf ?? todayISO();
  const candidates = state.caseRates
    .filter((c) => c.code === code)
    .filter((c) => normDate(c.effectiveDate) <= asOfDate)
    .sort((a, b) => normDate(b.effectiveDate).localeCompare(normDate(a.effectiveDate)));
  return candidates[0];
};

// Build a map of code -> amount using rates effective as of `asOf` date (defaults to today).
export const getCaseRatesMap = (state: AppState, asOf?: string): Record<string, number> => {
  const asOfDate = asOf ?? todayISO();
  const map: Record<string, number> = {};
  // For each distinct code, pick effective rate as of date
  const codes = Array.from(new Set(state.caseRates.map((c) => c.code)));
  codes.forEach((code) => {
    const r = getCaseRateByCode(state, code, asOfDate);
    if (r) map[code] = r.amount;
  });
  return map;
};

export const formatCaseRateLabel = (c: CaseRate) =>
  `${c.code} — ${c.description} (₱${c.amount})${c.effectiveDate ? ` — effective ${c.effectiveDate}` : ""}`;
