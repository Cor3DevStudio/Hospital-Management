import type { Admission, Bill, EClaim, HospitalInfo, Patient } from "@/lib/store";
import { buildEsoaXmlPayload, type EsoaHospital } from "@/components/philhealth/buildEsoaValues";
import {
  buildCf4FormData,
  buildCf4XmlPayload,
  type Cf4FormData,
} from "@/components/philhealth/buildCf4Values";
import { buildCf5XmlPayload } from "@/components/philhealth/buildCf5Values";
import { getClaimAttachments } from "@/lib/services/eclaimService";
import type { AppState } from "@/lib/store";

export type PhilHealthXmlForm = "ESOA" | "CF4" | "CF5";

export const PHILHEALTH_XML_FILENAMES: Record<PhilHealthXmlForm, string> = {
  ESOA: "ESOA.xml",
  CF4: "CF4.xml",
  CF5: "CF5.xml",
};

export type PhilHealthXmlValidationResult = {
  valid: boolean;
  errors: string[];
};

function baseValidation(input: {
  bill?: Bill | null;
  patient?: Patient | null;
  claim?: EClaim | null;
  hospital?: { name?: string };
  attach?: boolean;
}): string[] {
  const errors: string[] = [];
  if (input.attach && !input.claim) {
    errors.push("Select or create an eClaim to attach supporting XML.");
  }
  if (!input.bill) errors.push("Bill is required.");
  if (!input.patient) errors.push("Patient is required.");
  if (!input.hospital?.name?.trim()) errors.push("Hospital name is required.");
  if (
    input.attach &&
    input.claim &&
    input.bill &&
    input.claim.billId &&
    input.claim.billId !== input.bill.id
  ) {
    errors.push("Selected bill does not match the eClaim bill.");
  }
  return errors;
}

export function validatePhilHealthXml(input: {
  form: PhilHealthXmlForm;
  bill?: Bill | null;
  patient?: Patient | null;
  claim?: EClaim | null;
  hospital: EsoaHospital;
  attach?: boolean;
}): PhilHealthXmlValidationResult {
  const errors = baseValidation(input);

  if (input.form === "ESOA") {
    if (input.bill && (!input.bill.items || input.bill.items.length === 0)) {
      errors.push("Bill has no itemized charges for ESOA.");
    }
    if (input.bill && !input.bill.date) errors.push("Admission/bill date is required for ESOA.");
  }

  if (input.form === "CF4" || input.form === "CF5") {
    if (input.patient) {
      const name = [input.patient.firstName, input.patient.lastName].filter(Boolean).join(" ");
      if (!name.trim()) errors.push("Patient name is incomplete.");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function buildPhilHealthXmlPayload(input: {
  form: PhilHealthXmlForm;
  bill: Bill;
  patient?: Patient;
  hospital: EsoaHospital;
  admission?: Admission;
  claimId?: string;
  cf4Overrides?: Partial<Cf4FormData>;
}): string {
  switch (input.form) {
    case "ESOA":
      return buildEsoaXmlPayload({
        bill: input.bill,
        patient: input.patient,
        hospital: input.hospital,
        claimId: input.claimId,
      });
    case "CF4":
      return buildCf4XmlPayload({
        bill: input.bill,
        patient: input.patient,
        hospital: input.hospital as HospitalInfo,
        admission: input.admission,
        claimId: input.claimId,
        overrides: input.cf4Overrides,
      });
    case "CF5":
      return buildCf5XmlPayload({
        bill: input.bill,
        patient: input.patient,
        hospital: input.hospital as HospitalInfo,
        admission: input.admission,
        claimId: input.claimId,
      });
  }
}

export function buildPhilHealthXmlFile(input: {
  form: PhilHealthXmlForm;
  bill: Bill;
  patient?: Patient;
  hospital: EsoaHospital;
  admission?: Admission;
  claimId?: string;
  cf4Overrides?: Partial<Cf4FormData>;
}): File {
  const xml = buildPhilHealthXmlPayload(input);
  return new File([xml], PHILHEALTH_XML_FILENAMES[input.form], { type: "application/xml" });
}

export function findPhilHealthXmlAttachments(
  state: AppState,
  claimId: string,
  form: PhilHealthXmlForm,
) {
  const filename = PHILHEALTH_XML_FILENAMES[form].toLowerCase();
  const tag = form.toUpperCase();
  return getClaimAttachments(state, claimId).filter(
    (a) =>
      a.filename.toLowerCase() === filename ||
      (a.mime.includes("xml") && a.filename.toUpperCase().includes(tag)),
  );
}

export function downloadPhilHealthXmlFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Re-export for callers that only need CF4 merged data. */
export { buildCf4FormData };
