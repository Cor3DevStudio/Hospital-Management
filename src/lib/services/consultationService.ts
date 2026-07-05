import { uid, todayISO, type AppState, type Consultation, type OPDRecord } from "@/lib/store";

export function normalizeConsultation(c: Consultation): Consultation {
  return {
    ...c,
    date: c.date || todayISO(),
    status: c.status ?? (c.discharged ? "Seen" : "Pending"),
  };
}

export function normalizeConsultations(consultations: Consultation[]): Consultation[] {
  return consultations.map(normalizeConsultation);
}

function sortConsultationsByDate(consultations: Consultation[]): Consultation[] {
  return [...consultations].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

/** Map legacy OPD records into consultation rows for list/history views. */
export function opdRecordToConsultation(record: OPDRecord, id = record.consultationId ?? `opd:${record.id}`): Consultation {
  return normalizeConsultation({
    id,
    patientId: record.patientId,
    doctor: record.doctor,
    date: record.visitDate,
    chiefComplaint: record.reasonForVisit || record.serviceType || "",
    diagnosis: record.diagnosis || "",
    notes: record.notes || "",
    prescriptions: [],
    status: record.status === "Closed" ? "Seen" : "Pending",
    discharged: record.status === "Closed",
    dischargeDate: record.status === "Closed" ? record.visitDate : undefined,
  });
}

/** Merge canonical consultations with unlinked legacy `opdRecords`. */
export function mergeConsultationSources(
  consultations: Consultation[] | undefined,
  opdRecords?: OPDRecord[]
): Consultation[] {
  const normalized = normalizeConsultations(consultations ?? []);
  const linkedIds = new Set(normalized.map((c) => c.id));
  const merged = [...normalized];

  for (const record of opdRecords ?? []) {
    if (!record.patientId) continue;
    if (record.consultationId && linkedIds.has(record.consultationId)) continue;
    const id = record.consultationId ?? `opd:${record.id}`;
    if (linkedIds.has(id)) continue;
    linkedIds.add(id);
    merged.push(opdRecordToConsultation(record, id));
  }

  return sortConsultationsByDate(merged);
}

export function getAllConsultations(consultations: Consultation[], opdRecords?: OPDRecord[]): Consultation[] {
  return mergeConsultationSources(consultations, opdRecords);
}

/** Read all OPD visits from app state (consultations + legacy opdRecords). */
export function getAllConsultationsFromState(state: AppState): Consultation[] {
  return getAllConsultations(state.consultations, state.opdRecords);
}

export function getConsultationsForPatient(
  consultations: Consultation[],
  patientId: string,
  opdRecords?: OPDRecord[]
): Consultation[] {
  if (!patientId) return [];
  return getAllConsultations(consultations, opdRecords).filter((c) => c.patientId === patientId);
}

export function getTodayConsultations(consultations: Consultation[], today = todayISO()): Consultation[] {
  return normalizeConsultations(consultations).filter((c) => c.date === today);
}

export function getMonthlyConsultations(consultations: Consultation[], monthPrefix: string): Consultation[] {
  return normalizeConsultations(consultations).filter((c) => c.date.startsWith(monthPrefix));
}

export function createConsultation(state: AppState, form: Omit<Consultation, "id">): AppState {
  const consultation = normalizeConsultation({ ...form, id: uid() });
  return { ...state, consultations: [...state.consultations, consultation] };
}

export function updateConsultation(state: AppState, form: Consultation): AppState {
  const consultation = normalizeConsultation({
    ...form,
    discharged: form.status === "Seen" ? true : form.discharged,
    dischargeDate: form.status === "Seen" && !form.dischargeDate ? todayISO() : form.dischargeDate,
  });
  return {
    ...state,
    consultations: state.consultations.map((c) => (c.id === consultation.id ? consultation : c)),
  };
}

export function markConsultationSeen(state: AppState, consultation: Consultation): AppState {
  return updateConsultation(state, {
    ...consultation,
    status: "Seen",
    discharged: true,
    dischargeDate: consultation.dischargeDate ?? todayISO(),
  });
}

export function deleteConsultation(state: AppState, consultationId: string): AppState {
  return {
    ...state,
    consultations: state.consultations.filter((c) => c.id !== consultationId),
  };
}

export function emptyConsultation(patientId = ""): Consultation {
  return {
    id: "",
    patientId,
    appointmentId: undefined,
    doctor: "",
    date: todayISO(),
    chiefComplaint: "",
    diagnosis: "",
    notes: "",
    prescriptions: [],
    status: "Pending",
    discharged: false,
  };
}
