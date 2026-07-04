import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import { uid, todayISO, type AppState, type CaseRate } from "@/lib/store";

export function createCaseRate(state: AppState, form: Omit<CaseRate, "id">): AppState {
  const item: CaseRate = { ...form, id: uid() };
  return { ...state, caseRates: [...state.caseRates, item] };
}

export function updateCaseRate(state: AppState, form: CaseRate): AppState {
  return {
    ...state,
    caseRates: state.caseRates.map((c) => (c.id === form.id ? form : c)),
  };
}

export function deleteCaseRate(state: AppState, caseRateId: string): AppState {
  return {
    ...state,
    caseRates: state.caseRates.filter((c) => c.id !== caseRateId),
  };
}

/** Persist a case rate to philhealth_records and return the DB row. */
export async function persistCaseRate(rate: CaseRate): Promise<CaseRate> {
  const response = await fetchWithAuth("/api/case-rates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rate),
  });
  const result = (await response.json()) as { success?: boolean; caseRate?: CaseRate; message?: string };
  if (!response.ok || !result.caseRate) {
    throw new Error(result.message ?? "Failed to save case rate to database.");
  }
  return result.caseRate;
}

/** Delete a case rate from philhealth_records. */
export async function persistDeleteCaseRate(id: string): Promise<void> {
  const response = await fetchWithAuth(`/api/case-rates?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const result = (await response.json()) as { message?: string };
    throw new Error(result.message ?? "Failed to delete case rate from database.");
  }
}

export function filterCaseRates(caseRates: CaseRate[], query: string): CaseRate[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...caseRates].sort((a, b) => a.code.localeCompare(b.code));
  return caseRates
    .filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    )
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function emptyCaseRate(): CaseRate {
  return { id: "", code: "", description: "", amount: 0, category: "Medical", effectiveDate: todayISO() };
}
