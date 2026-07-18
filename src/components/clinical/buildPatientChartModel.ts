import {
  formatPatientName,
  getPatientClinicalHistory,
  type ClinicalHistorySection,
} from "@/lib/services/patientHistoryService";
import { computeAge } from "@/lib/services/patientService";
import type { AppState, Attachment, Consultation, HospitalInfo, Patient } from "@/lib/store";

export type PatientChartPrescription = {
  medicine: string;
  dosage: string;
  instructions: string;
  consultationDate: string;
  diagnosis: string;
};

export type PatientChartModel = {
  hospital: HospitalInfo;
  patient: Patient;
  patientName: string;
  printedAt: string;
  age: number | null;
  lastOpdVisit: string;
  nextAppointment: string;
  billsOnRecord: number;
  outstandingBills: number;
  latestBillStatus: string;
  opdVisits: Consultation[];
  prescriptions: PatientChartPrescription[];
  historySections: ClinicalHistorySection[];
  attachments: Attachment[];
};

export function formatChartDateLong(dateStr?: string): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function buildPatientChartModel(
  state: AppState,
  patientId: string,
): PatientChartModel | null {
  const patient = state.patients.find((p) => p.id === patientId);
  if (!patient) return null;

  const consultations = state.consultations
    .filter((c) => c.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const bills = state.bills
    .filter((b) => b.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const appointments = state.appointments
    .filter((a) => a.patientId === patientId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const latestConsultation = consultations[0];
  const upcoming =
    appointments.find((a) => a.date >= new Date().toISOString().slice(0, 10)) ?? appointments[0];

  const prescriptions = consultations.flatMap((c) =>
    c.prescriptions.map((p) => ({
      ...p,
      consultationDate: c.date,
      diagnosis: c.diagnosis,
    })),
  );

  const historySections = getPatientClinicalHistory(state, patientId).filter(
    (section) => section.items.length > 0,
  );

  const attachments = (state.attachments ?? []).filter(
    (a) => a.refType === "patient" && a.refId === patientId,
  );

  return {
    hospital: state.hospital,
    patient,
    patientName: formatPatientName(patient),
    printedAt: new Date().toLocaleString(),
    age: computeAge(patient.birthDate),
    lastOpdVisit: latestConsultation
      ? `${formatChartDateLong(latestConsultation.date)} — ${latestConsultation.diagnosis}`
      : "No OPD visits yet",
    nextAppointment: upcoming
      ? `${formatChartDateLong(upcoming.date)} @ ${upcoming.time}`
      : "No upcoming appointment",
    billsOnRecord: bills.length,
    outstandingBills: bills.filter((b) => b.status !== "Paid").length,
    latestBillStatus: bills[0]?.status ?? "None",
    opdVisits: consultations.slice(0, 5),
    prescriptions: prescriptions.slice(0, 8),
    historySections,
    attachments,
  };
}
