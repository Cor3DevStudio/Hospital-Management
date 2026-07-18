import type { AppState } from "@/lib/store";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import {
  applyClinicalPayload,
  extractClinicalPayload,
  hasClinicalData,
  type ClinicalPayload,
  type ClinicalSyncResult,
} from "@/lib/types/clinicalPayload";

export type { ClinicalPayload, ClinicalSyncResult };

export async function saveAllToDatabase(state: AppState): Promise<ClinicalSyncResult> {
  const payload = extractClinicalPayload(state);

  const response = await fetchWithAuth("/api/sync/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as ClinicalSyncResult;
  if (!response.ok || !result.success) {
    throw new Error(result.message ?? "Failed to save data to database.");
  }

  return result;
}

export async function loadAllFromDatabase(): Promise<{
  payload: ClinicalPayload | null;
  updatedAt: string | null;
}> {
  const response = await fetchWithAuth("/api/sync/load");
  if (!response.ok) {
    throw new Error("Failed to load data from database.");
  }

  return (await response.json()) as {
    payload: ClinicalPayload | null;
    updatedAt: string | null;
  };
}

export function mergeDatabaseIntoState(
  state: AppState,
  payload: ClinicalPayload | null,
  options?: { preferDatabase?: boolean },
): AppState {
  if (!payload) return state;

  if (hasClinicalData(payload) || options?.preferDatabase) {
    return applyClinicalPayload(state, payload);
  }

  if (payload.hospital.name?.trim()) {
    return { ...state, hospital: payload.hospital };
  }

  return state;
}

export { extractClinicalPayload, hasClinicalData };
