import type { Admission, Bill, HospitalInfo, Patient } from "@/lib/store";
import { getAgeYears, getFullName } from "@/lib/forms/fillFormTemplate";
import { escapeXml, xmlBool } from "@/lib/philhealth/xmlEscape";

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
  courseInWard: string;
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
    courseInWard: diagnosis,
    physicianName: upper(admission?.attendingDoctor) || getFullName(patient),
  };
}

export function buildCf4XmlPayload(input: {
  bill: Bill;
  patient?: Patient;
  hospital: HospitalInfo;
  admission?: Admission;
  claimId?: string;
  overrides?: Partial<Cf4FormData>;
}): string {
  const d = { ...buildCf4FormData(input), ...input.overrides };

  return `<?xml version="1.0" encoding="UTF-8"?>
<ClaimForm4>
  <DocumentType>CF4</DocumentType>
  <ClaimId>${escapeXml(input.claimId || "")}</ClaimId>
  <BillId>${escapeXml(input.bill.id)}</BillId>
  <Hospital>
    <Name>${escapeXml(d.hciName)}</Name>
    <AccreditationNo>${escapeXml(d.hciAccreditation)}</AccreditationNo>
    <Address>${escapeXml(d.hciAddress)}</Address>
  </Hospital>
  <Patient>
    <LastName>${escapeXml(d.patLast)}</LastName>
    <FirstName>${escapeXml(d.patFirst)}</FirstName>
    <MiddleName>${escapeXml(d.patMiddle)}</MiddleName>
    <PIN>${escapeXml(d.patientPin)}</PIN>
    <Age>${escapeXml(d.patientAge)}</Age>
    <SexMale>${xmlBool(d.sexMale)}</SexMale>
    <SexFemale>${xmlBool(d.sexFemale)}</SexFemale>
  </Patient>
  <ClinicalSummary>
    <ChiefComplaint>${escapeXml(d.chiefComplaint)}</ChiefComplaint>
    <AdmittingDiagnosis>${escapeXml(d.admitDiagnosis)}</AdmittingDiagnosis>
    <DischargeDiagnosis>${escapeXml(d.dischDiagnosis)}</DischargeDiagnosis>
    <CaseRateCode1>${escapeXml(d.caseRate1)}</CaseRateCode1>
    <CaseRateCode2>${escapeXml(d.caseRate2)}</CaseRateCode2>
    <DateAdmitted>${escapeXml(d.admitDate)}</DateAdmitted>
    <DateDischarged>${escapeXml(d.dischargeDate)}</DateDischarged>
    <HistoryOfPresentIllness>${escapeXml(d.historyIllness)}</HistoryOfPresentIllness>
    <PastMedicalHistory>${escapeXml(d.pastMedicalHistory)}</PastMedicalHistory>
    <CourseInWard>${escapeXml(d.courseInWard)}</CourseInWard>
    <AttendingPhysician>${escapeXml(d.physicianName)}</AttendingPhysician>
  </ClinicalSummary>
</ClaimForm4>
`;
}
