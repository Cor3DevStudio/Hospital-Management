import type { Admission, Bill, HospitalInfo, Patient } from "@/lib/store";
import { getFullName } from "@/lib/forms/fillFormTemplate";

export type Cf5FormData = {
  patientName: string;
  patientPin: string;
  hciName: string;
  hciAccreditation: string;
  pdx: string;
  sdx: string[];
  rvs: string[];
  caseRate: string;
  newbornWeight: string;
  memberName: string;
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

export function buildCf5FormData(input: {
  bill: Bill;
  patient?: Patient;
  hospital: HospitalInfo;
  admission?: Admission;
}): Cf5FormData {
  const { bill, patient, hospital, admission } = input;
  const diagnosis = upper(bill.notes || admission?.notes || "");
  const caseRate = upper(bill.caseRateCode);
  const name = getFullName(patient);

  return {
    patientName: name,
    patientPin: (patient?.philhealth?.memberNumber ?? "").replace(/\D/g, ""),
    hciName: upper(hospital.name),
    hciAccreditation: upper(hospital.philhealthAccreditation),
    pdx: caseRate || diagnosis.slice(0, 16),
    sdx: Array(12).fill(""),
    rvs: Array(20).fill(""),
    caseRate,
    newbornWeight: "",
    memberName: name,
    physicianName: upper(admission?.attendingDoctor),
    signDate: formatDate(admission?.dischargeDate ?? bill.dischargeDate ?? bill.date),
  };
}
