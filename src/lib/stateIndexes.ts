import type { Admission, AppState, Bill, Patient } from "@/lib/store";

/** Map of patientId → latest admission status label. Built in a single pass. */
export function buildAdmissionStatusMap(admissions: Admission[]): Map<string, string> {
  const latestByPatient = new Map<string, Admission>();

  for (const admission of admissions) {
    const existing = latestByPatient.get(admission.patientId);
    if (!existing || admission.admissionDate.localeCompare(existing.admissionDate) > 0) {
      latestByPatient.set(admission.patientId, admission);
    }
  }

  const result = new Map<string, string>();
  for (const [patientId, admission] of latestByPatient) {
    if (!admission.dischargeDate && admission.status === "Admitted") {
      result.set(patientId, "Admitted");
    } else if (admission.status === "Discharged" || admission.dischargeDate) {
      result.set(patientId, "Discharged");
    } else if (admission.status === "Transferred") {
      result.set(patientId, "Transferred");
    } else if (admission.status === "Pending") {
      result.set(patientId, "Pending Admission");
    } else {
      result.set(patientId, admission.status);
    }
  }

  return result;
}

export function getAdmissionStatusFromMap(map: Map<string, string>, patientId: string): string {
  return map.get(patientId) ?? "Outpatient";
}

export function buildPatientMap(patients: Patient[]): Map<string, Patient> {
  return new Map(patients.map((p) => [p.id, p]));
}

export function buildBillMap(bills: Bill[]): Map<string, Bill> {
  return new Map(bills.map((b) => [b.id, b]));
}

/** Groups records by patientId in a single pass. */
export function groupByPatientId<T extends { patientId: string }>(records: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const record of records) {
    const list = map.get(record.patientId);
    if (list) {
      list.push(record);
    } else {
      map.set(record.patientId, [record]);
    }
  }
  return map;
}

/** Pre-indexed patient clinical records for efficient history lookups. */
export type PatientRecordIndex = {
  admissions: Map<string, Admission[]>;
  er: Map<string, AppState["erRecords"]>;
  opd: Map<string, AppState["opdRecords"]>;
  consultations: Map<string, AppState["consultations"]>;
  laboratory: Map<string, AppState["laboratoryRecords"]>;
  radiology: Map<string, AppState["radiologyRecords"]>;
  pharmacy: Map<string, AppState["pharmacyRecords"]>;
  supplies: Map<string, NonNullable<AppState["suppliesRecords"]>>;
  miscellaneous: Map<string, NonNullable<AppState["miscellaneousRecords"]>>;
  bills: Map<string, AppState["bills"]>;
  payments: Map<string, AppState["cashierTransactions"]>;
};

export function buildPatientRecordIndex(state: AppState): PatientRecordIndex {
  return {
    admissions: groupByPatientId(state.admissions),
    er: groupByPatientId(state.erRecords),
    opd: groupByPatientId(state.opdRecords),
    consultations: groupByPatientId(state.consultations),
    laboratory: groupByPatientId(state.laboratoryRecords),
    radiology: groupByPatientId(state.radiologyRecords),
    pharmacy: groupByPatientId(state.pharmacyRecords),
    supplies: groupByPatientId(state.suppliesRecords ?? []),
    miscellaneous: groupByPatientId(state.miscellaneousRecords ?? []),
    bills: groupByPatientId(state.bills),
    payments: groupByPatientId(state.cashierTransactions),
  };
}
