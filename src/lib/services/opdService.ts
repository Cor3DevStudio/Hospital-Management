import { createConsultation, updateConsultation } from "@/lib/services/consultationService";
import { uid, todayISO, type AppState, type OPDRecord } from "@/lib/store";

export function createOPDRecord(state: AppState, form: Omit<OPDRecord, "id">): AppState {
  let next = { ...state, opdRecords: [...state.opdRecords, { ...form, id: uid() }] };
  const record = next.opdRecords[next.opdRecords.length - 1];
  return syncOpdToConsultation(next, record);
}

export function updateOPDRecord(state: AppState, form: OPDRecord): AppState {
  const next = {
    ...state,
    opdRecords: state.opdRecords.map((r) => (r.id === form.id ? form : r)),
  };
  return syncOpdToConsultation(next, form);
}

export function deleteOPDRecord(state: AppState, recordId: string): AppState {
  const record = state.opdRecords.find((r) => r.id === recordId);
  let next = { ...state, opdRecords: state.opdRecords.filter((r) => r.id !== recordId) };
  if (record?.consultationId) {
    next = {
      ...next,
      consultations: next.consultations.filter((c) => c.id !== record.consultationId),
    };
  }
  return next;
}

export function syncOpdToConsultation(state: AppState, opd: OPDRecord): AppState {
  if (!opd.patientId || !opd.doctor || !opd.visitDate) return state;

  const payload = {
    patientId: opd.patientId,
    doctor: opd.doctor,
    date: opd.visitDate,
    chiefComplaint: opd.reasonForVisit || opd.serviceType || "",
    diagnosis: opd.diagnosis || "",
    notes: opd.notes || "",
    prescriptions: [],
    status: opd.status === "Closed" ? ("Seen" as const) : ("Pending" as const),
    discharged: opd.status === "Closed",
    dischargeDate: opd.status === "Closed" ? opd.visitDate : undefined,
  };

  if (opd.consultationId) {
    const existing = state.consultations.find((c) => c.id === opd.consultationId);
    if (existing) {
      let next = updateConsultation(state, { ...existing, ...payload });
      return {
        ...next,
        opdRecords: next.opdRecords.map((r) =>
          r.id === opd.id ? { ...r, consultationId: existing.id } : r,
        ),
      };
    }
  }

  let next = createConsultation(state, payload);
  const consultation = next.consultations[next.consultations.length - 1];
  return {
    ...next,
    opdRecords: next.opdRecords.map((r) =>
      r.id === opd.id ? { ...r, consultationId: consultation.id } : r,
    ),
  };
}

export function emptyOPDRecord(patientId = ""): OPDRecord {
  return {
    id: "",
    patientId,
    doctor: "",
    visitDate: todayISO(),
    serviceType: "",
    reasonForVisit: "",
    diagnosis: "",
    followUpDate: "",
    status: "Open",
    notes: "",
  };
}
