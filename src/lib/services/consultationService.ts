import { uid, todayISO, type AppState, type Consultation } from "@/lib/store";

export function normalizeConsultation(c: Consultation): Consultation {
  return {
    ...c,
    status: c.status ?? (c.discharged ? "Seen" : "Pending"),
  };
}

export function normalizeConsultations(consultations: Consultation[]): Consultation[] {
  return consultations.map(normalizeConsultation);
}

export function getAllConsultations(consultations: Consultation[]): Consultation[] {
  return normalizeConsultations(consultations).sort((a, b) => b.date.localeCompare(a.date));
}

export function getConsultationsForPatient(consultations: Consultation[], patientId: string): Consultation[] {
  return getAllConsultations(consultations.filter((c) => c.patientId === patientId));
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
