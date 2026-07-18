import type { Admission, Bill, Patient } from "@/lib/store";
import { buildCf1FormData } from "@/components/philhealth/buildCf1Values";
import { getFullName } from "@/lib/forms/fillFormTemplate";

export type CsfFormData = {
  memPin: string[];
  memLastName: string;
  memFirstName: string;
  memMiddleName: string;
  memDob: string[];
  patPin: string[];
  patLastName: string;
  patFirstName: string;
  patMiddleName: string;
  patDob: string[];
  patRelChild: boolean;
  patRelParent: boolean;
  patRelSpouse: boolean;
  patRelSibling: boolean;
  admitDob: string[];
  dischargeDob: string[];
  memSignatureName: string;
  patSignatureName: string;
  attendingPhysicians: string[];
  hciRepName: string;
};

function dobCells(birthDate?: string): string[] {
  if (!birthDate) return Array(8).fill("");
  const [y, m, d] = birthDate.split("-");
  if (!y || !m || !d) return Array(8).fill("");
  return `${m}${d}${y}`.split("");
}

function parseRelationship(
  patient?: Patient,
): Pick<CsfFormData, "patRelChild" | "patRelParent" | "patRelSpouse" | "patRelSibling"> {
  const rel = (patient?.philhealth?.memberType ?? "").toLowerCase();
  return {
    patRelChild: rel.includes("child"),
    patRelParent: rel.includes("parent"),
    patRelSpouse: rel.includes("spouse"),
    patRelSibling: rel.includes("sibling") || rel.includes("brother") || rel.includes("sister"),
  };
}

/** Map bill / patient / admission → CSF (Claim Signature Form) field values. */
export function buildCsfFormData(input: {
  bill: Bill;
  patient?: Patient;
  admission?: Admission;
}): CsfFormData {
  const { bill, patient, admission } = input;
  const cf1 = buildCf1FormData({ bill, patient });
  const admitDate = admission?.admissionDate ?? bill.date;
  const dischargeDate = admission?.dischargeDate ?? bill.dischargeDate ?? bill.date;
  const physician = admission?.attendingDoctor ?? "";

  return {
    memPin: cf1.memPin,
    memLastName: cf1.memLastName,
    memFirstName: cf1.memFirstName,
    memMiddleName: cf1.memMiddleName,
    memDob: cf1.memDob,
    patPin: cf1.patPin,
    patLastName: cf1.patLastName,
    patFirstName: cf1.patFirstName,
    patMiddleName: cf1.patMiddleName,
    patDob: cf1.patDob.length ? cf1.patDob : dobCells(patient?.birthDate),
    ...parseRelationship(patient),
    admitDob: dobCells(admitDate),
    dischargeDob: dobCells(dischargeDate),
    memSignatureName: cf1.memSignatureName,
    patSignatureName: getFullName(patient),
    attendingPhysicians: [physician, "", ""],
    hciRepName: "",
  };
}
