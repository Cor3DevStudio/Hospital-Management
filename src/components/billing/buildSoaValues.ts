import type { Bill, Patient } from "@/lib/store";
import {
  formatDateLong,
  formatDateTime12,
  formatPrintedAt,
  getAgeYears,
  getFullName,
  money2,
  patientTypeLabel,
} from "@/lib/forms/fillFormTemplate";
import {
  inferChargeCategoryFromDescription,
  type BillChargeCategory,
} from "@/lib/services/billChargeCategories";
import type { SOAPrintOptions } from "@/components/billing/soaPrintOptions";
import { DEFAULT_SOA_PRINT_OPTIONS } from "@/components/billing/soaPrintOptions";

export type SoaHospital = {
  name: string;
  address: string;
  philhealthAccreditation?: string;
  phone?: string;
};

function cityFromAddress(address?: string): string {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1] || parts[0] || "";
}

function normalizeItems(bill: Bill) {
  return bill.items.map((it) => {
    const qty = it.qty && it.qty > 0 ? it.qty : 1;
    const unitPrice =
      it.unitPrice != null && it.unitPrice > 0 ? it.unitPrice : (it.amount || 0) / qty;
    const category =
      (it.category as BillChargeCategory | undefined) ||
      inferChargeCategoryFromDescription(it.description);
    return {
      ...it,
      qty,
      unitPrice,
      amount: it.amount || unitPrice * qty,
      category,
    };
  });
}

/** Map bill/patient data onto exact SOA.html placeholders (layout unchanged). */
export function buildSoaValues(input: {
  bill: Bill;
  patient?: Patient;
  hospital: SoaHospital;
  billingOfficerName: string;
  printOptions?: SOAPrintOptions;
  caseRateDescription?: string;
  attendingPhysician?: string;
  roomWard?: string;
}): Record<string, string> {
  const options = { ...DEFAULT_SOA_PRINT_OPTIONS, ...input.printOptions };
  const { bill, patient, hospital } = input;
  const items = normalizeItems(bill);
  const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);
  const pfTotal = items
    .filter((i) => i.category === "PF")
    .reduce((s, i) => s + i.amount, 0);
  const hciTotal = Math.max(0, subtotal - pfTotal);
  const phic = bill.philhealthDeduction || 0;
  const hciPhic = phic > 0 ? phic * 0.7 : 0;
  const pfPhic = phic > 0 ? phic * 0.3 : 0;
  const paid = bill.amountPaid || 0;
  const balance = Math.max(0, subtotal - phic - paid);
  const age = getAgeYears(patient?.birthDate);
  const formNo =
    "SOA-" + bill.date.replace(/-/g, "") + "-" + (bill.id ? bill.id.split("-").pop() : "TEMP");
  const accountNo = bill.id || formNo;
  const isIndigent =
    (patient?.philhealth?.memberType || "").toLowerCase().includes("indigent") ||
    balance <= 0;

  const z = money2(0);
  const moneyOrZero = (n: number) => money2(n);

  return {
    HOSPITAL_NAME: hospital.name || "MEDICAL CENTER",
    HOSPITAL_ADDRESS: hospital.address || "",
    HOSPITAL_CITY: cityFromAddress(hospital.address) || "",
    PATIENT_TYPE: patientTypeLabel(bill.patientType),
    BILL_STATUS: options.status === "Tentative" ? "TENTATIVE BILL" : "FINAL BILL",
    PATIENT_NAME: getFullName(patient),
    DATE_TODAY: formatDateLong(new Date().toISOString().slice(0, 10)),
    SOA_NUMBER: formNo.replace(/\D/g, "").padStart(15, "0").slice(-15),
    ADMIT_DT: formatDateTime12(bill.date),
    DISCHARGE_DT: formatDateTime12(bill.dischargeDate || bill.date, "05:00:00 PM"),
    ACCOUNT_NO: accountNo,
    ROOM: input.roomWard || (bill.patientType === "In-Patient" ? "" : "Out-Patient Department"),
    AGE: age == null ? "" : `${age} y/o`,
    PHIC_MEMBERSHIP: patient?.philhealth?.memberType || patient?.philhealth?.memberNumber || "",
    FIRST_CASE_DESC: input.caseRateDescription || bill.caseRateCode || bill.notes || "",
    ST_ACTUAL: moneyOrZero(hciTotal),
    ST_VAT: z,
    ST_DISC: z,
    ST_CR1: moneyOrZero(hciPhic),
    ST_CR2: z,
    ST_ASSIST: z,
    ST_PAY: moneyOrZero(paid),
    ST_BAL: moneyOrZero(balance),
    TOT_FEE_ACTUAL: moneyOrZero(subtotal),
    TOT_FEE_VAT: z,
    TOT_FEE_DISC: z,
    TOT_FEE_CR1: moneyOrZero(phic),
    TOT_FEE_CR2: z,
    TOT_FEE_ASSIST: z,
    TOT_FEE_PAY: moneyOrZero(paid),
    TOT_FEE_BAL: moneyOrZero(balance),
    HF_ACTUAL: moneyOrZero(hciTotal),
    PF_ACTUAL: moneyOrZero(pfTotal),
    TOTAL_ACTUAL: moneyOrZero(subtotal),
    HF_CR1: moneyOrZero(hciPhic),
    HF_CR2: z,
    HF_AFTER: moneyOrZero(Math.max(0, hciTotal - hciPhic)),
    HF_BAL: moneyOrZero(Math.max(0, hciTotal - hciPhic)),
    PF_CR1: moneyOrZero(pfPhic),
    PF_CR2: z,
    PF_AFTER: moneyOrZero(Math.max(0, pfTotal - pfPhic)),
    PF_BAL: moneyOrZero(Math.max(0, pfTotal - pfPhic)),
    TOT_CR1: moneyOrZero(phic),
    TOT_CR2: z,
    TOT_AFTER: moneyOrZero(Math.max(0, subtotal - phic)),
    TOT_BAL: moneyOrZero(balance),
    NBB: isIndigent ? "NBB" : "",
    PREPARED_BY: input.billingOfficerName || "",
    PREPARED_POSITION: "Billing Clerk/Accountant",
    PRINTED_AT: formatPrintedAt(),
  };
}
