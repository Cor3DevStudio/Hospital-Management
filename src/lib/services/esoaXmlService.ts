import type { AppState, Bill, EClaim, Patient } from "@/lib/store";
import {
  buildEsoaXmlPayload,
  type EsoaHospital,
} from "@/components/philhealth/buildEsoaValues";
import { getClaimAttachments } from "@/lib/services/eclaimService";

export const ESOA_XML_FILENAME = "ESOA.xml";

export type EsoaValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateEsoaForEclaim(input: {
  bill?: Bill | null;
  patient?: Patient | null;
  claim?: EClaim | null;
  hospital: EsoaHospital;
}): EsoaValidationResult {
  const errors: string[] = [];

  if (!input.claim) errors.push("Select or create an eClaim to attach ESOA.");
  if (!input.bill) errors.push("Bill is required for ESOA.");
  if (!input.patient) errors.push("Patient is required for ESOA.");
  if (!input.hospital.name?.trim()) errors.push("Hospital name is required.");
  if (input.bill && (!input.bill.items || input.bill.items.length === 0)) {
    errors.push("Bill has no itemized charges.");
  }
  if (input.patient) {
    const name = [input.patient.firstName, input.patient.lastName].filter(Boolean).join(" ");
    if (!name.trim()) errors.push("Patient name is incomplete.");
  }
  if (input.bill && !input.bill.date) errors.push("Admission/bill date is required.");
  if (input.claim && input.bill && input.claim.billId && input.claim.billId !== input.bill.id) {
    errors.push("Selected bill does not match the eClaim bill.");
  }

  return { valid: errors.length === 0, errors };
}

export function buildEsoaXmlFile(input: {
  bill: Bill;
  patient?: Patient;
  hospital: EsoaHospital;
  claimId?: string;
}): File {
  const xml = buildEsoaXmlPayload(input);
  return new File([xml], ESOA_XML_FILENAME, { type: "application/xml" });
}

/** Existing ESOA.xml attachments on an eClaim (for replace-on-attach). */
export function findEsoaAttachments(state: AppState, claimId: string) {
  return getClaimAttachments(state, claimId).filter(
    (a) =>
      a.filename.toLowerCase() === ESOA_XML_FILENAME.toLowerCase() ||
      (a.mime.includes("xml") && a.filename.toUpperCase().includes("ESOA"))
  );
}
