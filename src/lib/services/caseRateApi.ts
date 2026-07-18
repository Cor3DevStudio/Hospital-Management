import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import type { CaseRate } from "@/lib/store";

export type CaseRateSearchResult = {
  items: CaseRate[];
  total: number;
  page: number;
  pageSize: number;
};

export async function searchCaseRatesApi(params: {
  query?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}): Promise<CaseRateSearchResult> {
  const qs = new URLSearchParams();
  if (params.query) qs.set("q", params.query);
  if (params.type && params.type !== "All") qs.set("type", params.type);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));

  const response = await fetchWithAuth(`/api/case-rates?${qs.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to search case rates.");
  }
  return (await response.json()) as CaseRateSearchResult;
}

export async function fetchCaseRateByCode(code: string): Promise<CaseRate | null> {
  if (!code || code === "none") return null;
  const response = await fetchWithAuth(`/api/case-rates?code=${encodeURIComponent(code)}`);
  if (!response.ok) return null;
  const result = (await response.json()) as { caseRate?: CaseRate | null };
  return result.caseRate ?? null;
}

export async function fetchCaseRateCount(): Promise<number> {
  const response = await fetchWithAuth("/api/case-rates?countOnly=1");
  if (!response.ok) return 0;
  const result = (await response.json()) as { total?: number };
  return result.total ?? 0;
}
