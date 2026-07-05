import type { Admission, Bill, HospitalInfo, Patient } from "@/lib/store";
import { getFullName } from "@/lib/forms/fillFormTemplate";
import { escapeXml } from "@/lib/philhealth/xmlEscape";

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

export function buildCf5XmlPayload(input: {
  bill: Bill;
  patient?: Patient;
  hospital: HospitalInfo;
  admission?: Admission;
  claimId?: string;
}): string {
  const d = buildCf5FormData(input);
  const sdxXml = d.sdx
    .map((code, i) => `    <SecondaryDiagnosis index="${i + 1}">${escapeXml(code)}</SecondaryDiagnosis>`)
    .join("\n");
  const rvsXml = d.rvs
    .map((code, i) => `    <Procedure index="${i + 1}">${escapeXml(code)}</Procedure>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<ClaimForm5>
  <DocumentType>CF5</DocumentType>
  <ClaimId>${escapeXml(input.claimId || "")}</ClaimId>
  <BillId>${escapeXml(input.bill.id)}</BillId>
  <Patient>
    <Name>${escapeXml(d.patientName)}</Name>
    <PIN>${escapeXml(d.patientPin)}</PIN>
  </Patient>
  <Hospital>
    <Name>${escapeXml(d.hciName)}</Name>
    <AccreditationNo>${escapeXml(d.hciAccreditation)}</AccreditationNo>
  </Hospital>
  <DrgInformation>
    <PrimaryDiagnosis>${escapeXml(d.pdx)}</PrimaryDiagnosis>
    <SecondaryDiagnoses>
${sdxXml || "    <!-- none -->"}
    </SecondaryDiagnoses>
    <Procedures>
${rvsXml || "    <!-- none -->"}
    </Procedures>
    <NewbornWeightKg>${escapeXml(d.newbornWeight)}</NewbornWeightKg>
    <CaseRateCode>${escapeXml(d.caseRate)}</CaseRateCode>
  </DrgInformation>
  <Certification>
    <MemberName>${escapeXml(d.memberName)}</MemberName>
    <PhysicianName>${escapeXml(d.physicianName)}</PhysicianName>
    <DateSigned>${escapeXml(d.signDate)}</DateSigned>
  </Certification>
</ClaimForm5>
`;
}
