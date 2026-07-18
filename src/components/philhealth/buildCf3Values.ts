import type { Admission, Bill, HospitalInfo, Patient } from "@/lib/store";
import { getFullName } from "@/lib/forms/fillFormTemplate";

export type Cf3FormData = {
  hciPan: string;
  patientName: string;
  chiefComplaint: string;
  admitDate: string;
  dischargeDate: string;
  historyIllness: string;
  generalSurvey: string;
  vitalBp: string;
  vitalCr: string;
  vitalRr: string;
  vitalTemp: string;
  heent: string;
  chestLungs: string;
  cvs: string;
  abdomen: string;
  guIe: string;
  neuro: string;
  courseInWards: string;
  labFindings: string;
  dispImproved: boolean;
  dispTransferred: boolean;
  dispHama: boolean;
  dispAbsconded: boolean;
  dispExpired: boolean;
  physicianName: string;
  signDate: string;
};

function upper(value?: string): string {
  return (value ?? "").trim().toUpperCase();
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
}

export function buildCf3FormData(input: {
  bill: Bill;
  patient?: Patient;
  hospital: HospitalInfo;
  admission?: Admission;
}): Cf3FormData {
  const { bill, patient, hospital, admission } = input;
  const diagnosis = upper(bill.notes || admission?.notes || "");
  const admitDate = formatDate(admission?.admissionDate ?? bill.date);
  const dischargeDate = formatDate(admission?.dischargeDate ?? bill.dischargeDate ?? bill.date);
  const status = admission?.status;

  return {
    hciPan: upper(hospital.philhealthAccreditation),
    patientName: getFullName(patient),
    chiefComplaint: diagnosis,
    admitDate,
    dischargeDate,
    historyIllness: diagnosis,
    generalSurvey: "",
    vitalBp: "",
    vitalCr: "",
    vitalRr: "",
    vitalTemp: "",
    heent: "",
    chestLungs: "",
    cvs: "",
    abdomen: "",
    guIe: "",
    neuro: "",
    courseInWards: diagnosis,
    labFindings: "",
    dispImproved: status === "Discharged",
    dispTransferred: status === "Transferred",
    dispHama: false,
    dispAbsconded: false,
    dispExpired: false,
    physicianName: upper(admission?.attendingDoctor),
    signDate: dischargeDate,
  };
}
