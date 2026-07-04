import type { Admission, Bill, HospitalInfo, Patient } from "@/lib/store";
import { getAgeYears, getFullName } from "@/lib/forms/fillFormTemplate";

export type Cf4FormData = {
  hciName: string;
  hciAccreditation: string;
  hciAddress: string;
  patLast: string;
  patFirst: string;
  patMiddle: string;
  patientPin: string;
  patientAge: string;
  sexMale: boolean;
  sexFemale: boolean;
  chiefComplaint: string;
  admitDiagnosis: string;
  dischDiagnosis: string;
  caseRate1: string;
  caseRate2: string;
  admitDate: string;
  dischargeDate: string;
  historyIllness: string;
  pastMedicalHistory: string;
  physicianName: string;
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

export function buildCf4FormData(input: {
  bill: Bill;
  patient?: Patient;
  hospital: HospitalInfo;
  admission?: Admission;
}): Cf4FormData {
  const { bill, patient, hospital, admission } = input;
  const diagnosis = upper(bill.notes || admission?.notes || "");
  const age = getAgeYears(patient?.birthDate);

  return {
    hciName: upper(hospital.name),
    hciAccreditation: upper(hospital.philhealthAccreditation),
    hciAddress: upper(hospital.address),
    patLast: upper(patient?.lastName),
    patFirst: upper(patient?.firstName),
    patMiddle: upper(patient?.middleName),
    patientPin: (patient?.philhealth?.memberNumber ?? "").replace(/\D/g, ""),
    patientAge: age == null ? "" : String(age),
    sexMale: patient?.gender === "Male",
    sexFemale: patient?.gender === "Female",
    chiefComplaint: diagnosis,
    admitDiagnosis: diagnosis,
    dischDiagnosis: diagnosis,
    caseRate1: upper(bill.caseRateCode),
    caseRate2: "",
    admitDate: formatDate(admission?.admissionDate ?? bill.date),
    dischargeDate: formatDate(admission?.dischargeDate ?? bill.dischargeDate ?? bill.date),
    historyIllness: diagnosis,
    pastMedicalHistory: "",
    physicianName: upper(admission?.attendingDoctor) || getFullName(patient),
  };
}
