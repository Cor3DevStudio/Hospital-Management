import { eq } from "drizzle-orm";

import { normalizeConsultations } from "@/lib/services/consultationService";
import {
  countClinicalRecords,
  emptyClinicalPayload,
  type ClinicalPayload,
  type ClinicalSyncResult,
} from "@/lib/types/clinicalPayload";

import { getDb } from "../client";
import { appClinicalState } from "../schema";
import { countCaseRatesInDatabase } from "./caseRates";
import { getHospitalSettings, upsertHospitalSettings } from "./hospital";
import { syncPatientsToDatabase } from "./patients";

const REGISTRY_ID = "default";

function normalizePayload(payload: ClinicalPayload): ClinicalPayload {
  return {
    ...payload,
    consultations: normalizeConsultations(payload.consultations ?? []),
    miscellaneousRecords: payload.miscellaneousRecords ?? [],
    suppliesRecords: payload.suppliesRecords ?? [],
    attachments: payload.attachments ?? [],
  };
}

export async function saveClinicalStateToDatabase(
  payload: ClinicalPayload
): Promise<ClinicalSyncResult> {
  const normalized = normalizePayload(payload);

  // Case rates live only in philhealth_records (imported catalog, ~9k rows).
  // They are loaded on sync/load and saved via /api/case-rates — not the JSON blob.
  const forBlob: ClinicalPayload = { ...normalized, caseRates: [] };
  const json = JSON.stringify(forBlob);

  const db = getDb();
  await db
    .insert(appClinicalState)
    .values({ id: REGISTRY_ID, payload: json })
    .onDuplicateKeyUpdate({
      set: { payload: json },
    });

  await upsertHospitalSettings(normalized.hospital);
  await syncPatientsToDatabase(normalized.patients);

  const rows = await db
    .select({ updatedAt: appClinicalState.updatedAt })
    .from(appClinicalState)
    .where(eq(appClinicalState.id, REGISTRY_ID))
    .limit(1);

  const counts = countClinicalRecords(normalized);
  counts.caseRates = await countCaseRatesInDatabase();

  return {
    success: true,
    message: "All clinical data saved to MariaDB.",
    updatedAt: rows[0]?.updatedAt?.toISOString(),
    counts,
  };
}

export async function loadClinicalStateFromDatabase(): Promise<{
  payload: ClinicalPayload | null;
  updatedAt: string | null;
}> {
  const hospitalFromTable = await getHospitalSettings();
  const db = getDb();
  const rows = await db
    .select()
    .from(appClinicalState)
    .where(eq(appClinicalState.id, REGISTRY_ID))
    .limit(1);

  const row = rows[0];
  if (!row?.payload) {
    if (!hospitalFromTable) {
      return { payload: null, updatedAt: null };
    }
    return {
      payload: {
        ...emptyClinicalPayload(),
        hospital: hospitalFromTable,
        // Case rates stay in philhealth_records — never hydrate into app state.
        caseRates: [],
      },
      updatedAt: null,
    };
  }

  try {
    const parsed = normalizePayload(JSON.parse(row.payload) as ClinicalPayload);
    if (hospitalFromTable) {
      parsed.hospital = hospitalFromTable;
    }
    // Keep catalog out of React state / localStorage (search via /api/case-rates).
    parsed.caseRates = [];
    return {
      payload: parsed,
      updatedAt: row.updatedAt?.toISOString() ?? null,
    };
  } catch {
    if (!hospitalFromTable) {
      return { payload: null, updatedAt: null };
    }
    return {
      payload: {
        ...emptyClinicalPayload(),
        hospital: hospitalFromTable,
        caseRates: [],
      },
      updatedAt: null,
    };
  }
}
