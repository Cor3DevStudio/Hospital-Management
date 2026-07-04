import type { Admission, Bill, HospitalInfo, Patient } from "@/lib/store";
import { getAgeYears, getFullName, money2 } from "@/lib/forms/fillFormTemplate";

export type Cf2FormData = {
  hciAccreditation: string;
  hciName: string;
  hciAddress: string;
  hciPhone: string;
  patientName: string;
  patientPin: string;
  patientAge: string;
  patientSexMale: boolean;
  patientSexFemale: boolean;
  referredByOtherHci: boolean;
  dateAdmitted: string;
  timeAdmitted: string;
  dateDischarged: string;
  timeDischarged: string;
  dispositionImproved: boolean;
  dispositionRecovered: boolean;
  dispositionHama: boolean;
  dispositionAbsconded: boolean;
  dispositionExpired: boolean;
  dispositionTransferred: boolean;
  accommodationPrivate: boolean;
  accommodationNonPrivate: boolean;
  admissionDiagnosis: string;
  dischargeDiagnosis: string;
  icd10: string;
  rvsCode: string;
  caseRateCode: string;
  totalCharges: string;
  philhealthBenefit: string;
  amountPaid: string;
  attendingDoctor: string;
  roomWard: string;
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

/** Map bill / patient / hospital / admission → CF-2 field values. */
export function buildCf2FormData(input: {
  bill: Bill;
  patient?: Patient;
  hospital: HospitalInfo;
  admission?: Admission;
}): Cf2FormData {
  const { bill, patient, hospital, admission } = input;
  const age = getAgeYears(patient?.birthDate);
  const total = bill.items.reduce((s, i) => s + (i.amount || 0), 0);
  const admitDate = admission?.admissionDate ?? bill.date;
  const dischargeDate = admission?.dischargeDate ?? bill.dischargeDate ?? bill.date;
  const isInpatient = bill.patientType === "In-Patient";
  const diagnosis = bill.notes || admission?.notes || "";

  return {
    hciAccreditation: upper(hospital.philhealthAccreditation),
    hciName: upper(hospital.name),
    hciAddress: upper(hospital.address),
    hciPhone: hospital.phone ?? "",
    patientName: getFullName(patient),
    patientPin: (patient?.philhealth?.memberNumber ?? "").replace(/\D/g, ""),
    patientAge: age == null ? "" : String(age),
    patientSexMale: patient?.gender === "Male",
    patientSexFemale: patient?.gender === "Female",
    referredByOtherHci: false,
    dateAdmitted: formatDate(admitDate),
    timeAdmitted: "",
    dateDischarged: formatDate(dischargeDate),
    timeDischarged: "",
    dispositionImproved: admission?.status === "Discharged",
    dispositionRecovered: false,
    dispositionHama: false,
    dispositionAbsconded: false,
    dispositionExpired: false,
    dispositionTransferred: admission?.status === "Transferred",
    accommodationPrivate: isInpatient,
    accommodationNonPrivate: !isInpatient,
    admissionDiagnosis: upper(diagnosis),
    dischargeDiagnosis: upper(diagnosis),
    icd10: "",
    rvsCode: "",
    caseRateCode: upper(bill.caseRateCode),
    totalCharges: money2(total),
    philhealthBenefit: money2(bill.philhealthDeduction || 0),
    amountPaid: money2(bill.amountPaid || 0),
    attendingDoctor: upper(admission?.attendingDoctor),
    roomWard: upper(admission?.roomWard),
  };
}
