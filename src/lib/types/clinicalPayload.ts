import type { AppState } from "@/lib/store";
import { mergeAttachmentLists } from "@/lib/attachmentValidation";

/** Clinical/registry data persisted to MariaDB (excludes auth session fields). */
export type ClinicalPayload = Pick<
  AppState,
  | "patients"
  | "appointments"
  | "consultations"
  | "medicines"
  | "bills"
  | "admissions"
  | "erRecords"
  | "opdRecords"
  | "pharmacyRecords"
  | "suppliesRecords"
  | "miscellaneousRecords"
  | "laboratoryRecords"
  | "radiologyRecords"
  | "cashierTransactions"
  | "medicalRecords"
  | "prices"
  | "priceHistories"
  | "caseRates"
  | "eClaims"
  | "hospital"
  | "attachments"
  | "inactivityTimeoutMinutes"
  | "inactivityWarningSeconds"
>;

export type ClinicalSyncResult = {
  success: boolean;
  message?: string;
  updatedAt?: string;
  counts?: Record<string, number>;
};

export function extractClinicalPayload(state: AppState): ClinicalPayload {
  return {
    patients: state.patients,
    appointments: state.appointments,
    consultations: state.consultations,
    medicines: state.medicines,
    bills: state.bills,
    admissions: state.admissions,
    erRecords: state.erRecords,
    opdRecords: state.opdRecords,
    pharmacyRecords: state.pharmacyRecords,
    suppliesRecords: state.suppliesRecords ?? [],
    miscellaneousRecords: state.miscellaneousRecords ?? [],
    laboratoryRecords: state.laboratoryRecords,
    radiologyRecords: state.radiologyRecords,
    cashierTransactions: state.cashierTransactions,
    medicalRecords: state.medicalRecords,
    prices: state.prices,
    priceHistories: state.priceHistories,
    caseRates: [],
    eClaims: state.eClaims ?? [],
    hospital: state.hospital,
    attachments: state.attachments ?? [],
    inactivityTimeoutMinutes:
      typeof state.inactivityTimeoutMinutes === "number"
        ? Math.max(0, Math.round(state.inactivityTimeoutMinutes))
        : 15,
    inactivityWarningSeconds:
      typeof state.inactivityWarningSeconds === "number"
        ? Math.max(0, Math.round(state.inactivityWarningSeconds))
        : 60,
  };
}

export function countClinicalRecords(payload: ClinicalPayload): Record<string, number> {
  return {
    patients: payload.patients.length,
    appointments: payload.appointments.length,
    consultations: payload.consultations.length,
    medicines: payload.medicines.length,
    bills: payload.bills.length,
    admissions: payload.admissions.length,
    erRecords: payload.erRecords.length,
    opdRecords: payload.opdRecords.length,
    pharmacyRecords: payload.pharmacyRecords.length,
    suppliesRecords: payload.suppliesRecords?.length ?? 0,
    miscellaneousRecords: payload.miscellaneousRecords?.length ?? 0,
    laboratoryRecords: payload.laboratoryRecords.length,
    radiologyRecords: payload.radiologyRecords.length,
    cashierTransactions: payload.cashierTransactions.length,
    medicalRecords: payload.medicalRecords.length,
    prices: payload.prices.length,
    caseRates: payload.caseRates.length,
    eClaims: payload.eClaims?.length ?? 0,
  };
}

export function applyClinicalPayload(state: AppState, payload: ClinicalPayload): AppState {
  return {
    ...state,
    ...payload,
    suppliesRecords: payload.suppliesRecords ?? [],
    miscellaneousRecords: payload.miscellaneousRecords ?? [],
    eClaims: payload.eClaims ?? [],
    attachments: mergeAttachmentLists(state.attachments ?? [], payload.attachments ?? []),
    inactivityTimeoutMinutes: payload.inactivityTimeoutMinutes ?? state.inactivityTimeoutMinutes,
    inactivityWarningSeconds: payload.inactivityWarningSeconds ?? state.inactivityWarningSeconds,
    authedUser: state.authedUser,
    users: state.users,
  };
}

export function emptyClinicalPayload(): ClinicalPayload {
  return {
    patients: [],
    appointments: [],
    consultations: [],
    medicines: [],
    bills: [],
    admissions: [],
    erRecords: [],
    opdRecords: [],
    pharmacyRecords: [],
    suppliesRecords: [],
    miscellaneousRecords: [],
    laboratoryRecords: [],
    radiologyRecords: [],
    cashierTransactions: [],
    medicalRecords: [],
    prices: [],
    priceHistories: [],
    caseRates: [],
    eClaims: [],
    hospital: {
      name: "",
      address: "",
      phone: "",
      email: "",
      philhealthAccreditation: "",
      tin: "",
    },
    attachments: [],
    inactivityTimeoutMinutes: 15,
    inactivityWarningSeconds: 60,
  };
}

export function hasClinicalData(payload: ClinicalPayload): boolean {
  return (
    payload.patients.length > 0 ||
    payload.appointments.length > 0 ||
    payload.consultations.length > 0 ||
    payload.bills.length > 0 ||
    payload.medicines.length > 0 ||
    Boolean(payload.hospital.name?.trim())
  );
}
