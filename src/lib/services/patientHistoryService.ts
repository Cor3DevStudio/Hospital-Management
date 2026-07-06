import {
  computeBillBalance,
} from "@/lib/services/billingService";
import { getConsultationsForPatient } from "@/lib/services/consultationService";
import { getPatientAdmissions } from "@/lib/services/admissionService";
import type { AppState } from "@/lib/store";
import { buildPatientRecordIndex, type PatientRecordIndex } from "@/lib/stateIndexes";

export type ClinicalHistorySection = {
  key: string;
  label: string;
  items: { id: string; date: string; title: string; detail: string; status?: string }[];
};

type HistoryItem = ClinicalHistorySection["items"][number];

function sortByDateDesc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

function mapSection<T>(
  records: T[] | undefined,
  mapper: (r: T) => HistoryItem
): HistoryItem[] {
  if (!records?.length) return [];
  return sortByDateDesc(records.map(mapper));
}

export function getPatientClinicalHistory(
  state: AppState,
  patientId: string,
  index?: PatientRecordIndex
): ClinicalHistorySection[] {
  if (!patientId) return [];

  const idx = index ?? buildPatientRecordIndex(state);

  const admissions = getPatientAdmissions(state, patientId).map((a) => ({
    id: a.id,
    date: a.admissionDate,
    title: a.roomWard,
    detail: a.notes || a.attendingDoctor || "",
    status: a.status,
  }));

  const er = mapSection(idx.er.get(patientId), (r) => ({
    id: r.id,
    date: r.arrivalDate,
    title: `${r.triageLevel} triage — ${r.chiefComplaint}`,
    detail: r.attendingDoctor,
    status: r.disposition || r.status,
  }));

  // OPD module uses consultations as the canonical visit store (legacy opdRecords remain in state).
  const opd = mapSection(
    getConsultationsForPatient(state.consultations, patientId, state.opdRecords),
    (c) => ({
      id: c.id,
      date: c.date,
      title: c.chiefComplaint,
      detail: c.diagnosis,
      status: c.status,
    })
  );

  const lab = mapSection(idx.laboratory.get(patientId), (r) => ({
    id: r.id,
    date: r.requestDate,
    title: r.testName,
    detail: r.resultValue || r.resultSummary || "",
    status: r.status,
  }));

  const radiology = mapSection(idx.radiology.get(patientId), (r) => ({
    id: r.id,
    date: r.requestDate,
    title: r.examType || r.imagingType,
    detail: r.findings || "",
    status: r.status,
  }));

  const pharmacy = mapSection(idx.pharmacy.get(patientId), (r) => ({
    id: r.id,
    date: r.dispenseDate,
    title: r.medicine,
    detail: `Qty ${r.quantity}${r.totalAmount ? ` — ₱${r.totalAmount}` : ""}`,
    status: r.status,
  }));

  const supplies = mapSection(idx.supplies.get(patientId), (r) => ({
    id: r.id,
    date: r.issueDate,
    title: r.itemName,
    detail: `Qty ${r.quantity}${r.totalAmount ? ` — ₱${r.totalAmount}` : ""}`,
    status: r.status,
  }));

  const miscellaneous = mapSection(idx.miscellaneous.get(patientId), (r) => ({
    id: r.id,
    date: r.chargeDate,
    title: r.feeName,
    detail: `Qty ${r.quantity} — ₱${r.totalAmount}`,
    status: r.status,
  }));

  const bills = mapSection(idx.bills.get(patientId), (b) => ({
    id: b.id,
    date: b.date,
    title: b.id,
    detail: `Paid ₱${b.amountPaid} / Balance ₱${computeBillBalance(b)}`,
    status: b.status,
  }));

  const payments = mapSection(idx.payments.get(patientId), (t) => ({
    id: t.id,
    date: t.transactionDate,
    title: t.receiptNumber || t.id,
    detail: `₱${t.amount} — ${t.paymentMethod}`,
    status: t.status,
  }));

  return [
    { key: "admissions", label: "Admissions", items: admissions },
    { key: "er", label: "ER Visits", items: er },
    { key: "opd", label: "OPD Visits", items: opd },
    { key: "laboratory", label: "Laboratory", items: lab },
    { key: "radiology", label: "Radiology", items: radiology },
    { key: "pharmacy", label: "Pharmacy", items: pharmacy },
    { key: "supplies", label: "Supplies", items: supplies },
    { key: "miscellaneous", label: "Miscellaneous", items: miscellaneous },
    { key: "billing", label: "Billing", items: bills },
    { key: "cashier", label: "Payments", items: payments },
  ];
}

export function formatPatientName(patient: { firstName: string; middleName?: string; lastName: string } | undefined): string {
  if (!patient) return "—";
  return `${patient.lastName}, ${patient.firstName}${patient.middleName ? ` ${patient.middleName}` : ""}`;
}
