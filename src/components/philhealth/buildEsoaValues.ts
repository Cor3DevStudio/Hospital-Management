import type { Bill, Patient } from "@/lib/store";
import {
  formatAddress,
  formatDateTime12,
  getAgeYears,
  getFullName,
  money2,
} from "@/lib/forms/fillFormTemplate";
import {
  inferChargeCategoryFromDescription,
  type BillChargeCategory,
} from "@/lib/services/billChargeCategories";

export type EsoaHospital = {
  name: string;
  address: string;
  philhealthAccreditation?: string;
  phone?: string;
};

function normalizeItems(bill: Bill) {
  return bill.items.map((it) => {
    const qty = it.qty && it.qty > 0 ? it.qty : 1;
    const unitPrice =
      it.unitPrice != null && it.unitPrice > 0 ? it.unitPrice : (it.amount || 0) / qty;
    const category =
      (it.category as BillChargeCategory | undefined) ||
      inferChargeCategoryFromDescription(it.description);
    return { ...it, qty, unitPrice, amount: it.amount || unitPrice * qty, category };
  });
}

/** Map bill/patient data onto exact ESOA.html placeholders (layout unchanged). */
export function buildEsoaValues(input: {
  bill: Bill;
  patient?: Patient;
  hospital: EsoaHospital;
}): Record<string, string> {
  const { bill, patient, hospital } = input;
  const items = normalizeItems(bill);
  const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);
  const phic = bill.philhealthDeduction || 0;
  const paid = bill.amountPaid || 0;
  const balance = Math.max(0, subtotal - phic - paid);
  const age = getAgeYears(patient?.birthDate);
  const refBase =
    bill.date.replace(/-/g, "").slice(0, 4) +
    "-" +
    (bill.id ? bill.id.replace(/\D/g, "").slice(-5).padStart(5, "0") : "00000");
  const refSuffix = bill.id ? bill.id.replace(/\D/g, "").slice(-4).padStart(4, "0") : "0000";
  const diagnosis = bill.caseRateCode
    ? `${bill.caseRateCode}${bill.notes ? ` (${bill.notes})` : ""}`
    : bill.notes || "()";

  return {
    SOA_REF: refBase,
    SOA_REF_SUFFIX: refSuffix,
    HOSPITAL_NAME: hospital.name || "MEDICAL CENTER",
    HOSPITAL_ADDRESS: hospital.address || "",
    PATIENT_NAME: getFullName(patient) || "_________________________________________",
    PATIENT_ADDRESS: formatAddress(patient?.address) || "_______________________________________",
    AGE_YRS: age == null ? "" : String(age),
    DIAGNOSIS: diagnosis,
    ADMIT_DT: formatDateTime12(bill.date),
    DISCHARGE_DT: formatDateTime12(bill.dischargeDate || bill.date, "05:00:00 PM"),
    FEE_AMOUNT: money2(subtotal),
    FEE_MANDATORY: money2(0),
    FEE_PHIC: money2(phic),
    FEE_OTHER: money2(paid),
    FEE_BALANCE: money2(balance),
    ITEMIZED_TOTAL: money2(subtotal),
  };
}

export function buildEsoaXmlPayload(input: {
  bill: Bill;
  patient?: Patient;
  hospital: EsoaHospital;
  claimId?: string;
}): string {
  const values = buildEsoaValues(input);
  const items = normalizeItems(input.bill);
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const itemXml = items
    .map(
      (it) => `    <Item>
      <Description>${esc(it.description)}</Description>
      <Category>${esc(String(it.category || ""))}</Category>
      <UnitPrice>${money2(it.unitPrice)}</UnitPrice>
      <Quantity>${it.qty}</Quantity>
      <Amount>${money2(it.amount)}</Amount>
      <ServiceDate>${esc(it.effectiveDate || input.bill.date)}</ServiceDate>
    </Item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<ElectronicStatementOfAccount>
  <DocumentType>ESOA</DocumentType>
  <ClaimId>${esc(input.claimId || "")}</ClaimId>
  <BillId>${esc(input.bill.id)}</BillId>
  <SOAReferenceNo>${esc(values.SOA_REF)}${esc(values.SOA_REF_SUFFIX)}</SOAReferenceNo>
  <Hospital>
    <Name>${esc(values.HOSPITAL_NAME)}</Name>
    <Address>${esc(values.HOSPITAL_ADDRESS)}</Address>
    <AccreditationNo>${esc(input.hospital.philhealthAccreditation || "")}</AccreditationNo>
  </Hospital>
  <Patient>
    <Name>${esc(values.PATIENT_NAME)}</Name>
    <Address>${esc(values.PATIENT_ADDRESS)}</Address>
    <AgeYears>${esc(values.AGE_YRS)}</AgeYears>
    <PhilHealthNumber>${esc(input.patient?.philhealth?.memberNumber || "")}</PhilHealthNumber>
  </Patient>
  <Encounter>
    <AdmissionDateTime>${esc(values.ADMIT_DT)}</AdmissionDateTime>
    <DischargeDateTime>${esc(values.DISCHARGE_DT)}</DischargeDateTime>
    <FinalDiagnosis>${esc(values.DIAGNOSIS)}</FinalDiagnosis>
    <PatientType>${esc(input.bill.patientType)}</PatientType>
    <CaseRateCode>${esc(input.bill.caseRateCode || "")}</CaseRateCode>
  </Encounter>
  <SummaryOfFees>
    <Amount>${values.FEE_AMOUNT}</Amount>
    <MandatoryDiscount>${values.FEE_MANDATORY}</MandatoryDiscount>
    <PhilHealth>${values.FEE_PHIC}</PhilHealth>
    <OtherFunding>${values.FEE_OTHER}</OtherFunding>
    <Balance>${values.FEE_BALANCE}</Balance>
  </SummaryOfFees>
  <ItemizedCharges>
${itemXml || "    <!-- none -->"}
    <Total>${values.ITEMIZED_TOTAL}</Total>
  </ItemizedCharges>
</ElectronicStatementOfAccount>
`;
}
