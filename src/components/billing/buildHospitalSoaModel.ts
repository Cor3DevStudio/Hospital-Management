import type { AppState, Bill, CaseRate, Patient } from "@/lib/store";

import {
  formatAddress,
  formatDateTime12,
  formatPrintedAt,
  getAgeYears,
  getFullName,
  money2,
} from "@/lib/forms/fillFormTemplate";

import {
  resolveChargeCategory,
  type BillChargeCategory,
} from "@/lib/services/billChargeCategories";

import { resolveClaimAdmission } from "@/lib/services/eclaimService";

import { computeRoomBoardCharges } from "@/lib/services/roomBoardService";

import { allocatePhilhealthToSoaRows } from "@/lib/services/soaPhilhealthAllocation";

import type { SOAPrintOptions } from "@/components/billing/soaPrintOptions";

import type { SoaHospital } from "@/components/billing/buildSoaValues";

export type SoaAmountRow = {
  label: string;

  detail?: string;

  actual: number;

  vatExempt: number;

  discountScPwd: number;

  discountAgency: number;

  phicFirst: number;

  phicSecond: number;

  outOfPocket: number;

  highlight?: boolean;
};

export type SoaItemizedLine = {
  serviceDate: string;
  itemName: string;
  unit: string;
  price: number;
  quantity: number;
  amount: number;
};

export type SoaPhilhealthCoverage = {
  caseRateCode: string;
  caseRateAmount: number;
  hciBenefit: number;
  pfBenefit: number;
  totalBenefit: number;
  totalActual: number;
  /** Charges not covered by PhilHealth (before payments). */
  patientExcess: number;
  amountPaid: number;
  balanceDue: number;
};

export type HospitalSoaModel = {
  hospitalName: string;

  hospitalAddress: string;

  hospitalPhone: string;

  soaReference: string;

  patientName: string;

  age: string;

  address: string;

  admitDateTime: string;

  dischargeDateTime: string;

  admittingDiagnosis: string;

  firstCaseRate: string;

  secondCaseRate: string;

  finalDiagnoses: string[];

  surgicalProcedures: string;

  hciRows: SoaAmountRow[];

  hciSubtotal: SoaAmountRow;

  professionalFees: { name: string; accreditation?: string; row: SoaAmountRow }[];

  pfSubtotal: SoaAmountRow;

  total: SoaAmountRow;

  discountChecks: { pcsO: boolean; dswd: boolean; doh: boolean; hmo: boolean; others: boolean };

  preparedBy: string;

  isTentative: boolean;

  phicCoverage: SoaPhilhealthCoverage | null;

  itemizedLines: SoaItemizedLine[];

  ageYears: string;
  ageMonths: string;
  ageDays: string;

  attendingPhysician: string;
  wardRoom: string;
  accountNumber: string;
  phicMembership: string;
  patientType: string;
  hospitalCity: string;
  printedAt: string;
  secondCaseDescription: string;
};

type NormalizedItem = {
  description: string;

  category: BillChargeCategory;

  qty: number;

  unitPrice: number;

  amount: number;

  priceItemId?: string;

  medicineId?: string;

  doctorRole?: string;
};

type HciBucket = "room" | "medicine" | "lab" | "radiology" | "or" | "supplies" | "misc" | "other";

function normalizeItems(bill: Bill, state: AppState): NormalizedItem[] {
  return bill.items.map((it) => {
    const qty = it.qty && it.qty > 0 ? it.qty : 1;

    const unitPrice =
      it.unitPrice != null && it.unitPrice > 0 ? it.unitPrice : (it.amount || 0) / qty;

    const category = resolveChargeCategory(state, {
      category: it.category,

      priceItemId: it.priceItemId,

      medicineId: it.medicineId,

      description: it.description,
    });

    return {
      description: it.description,

      category,

      qty,

      unitPrice,

      amount: it.amount || unitPrice * qty,

      priceItemId: it.priceItemId,

      medicineId: it.medicineId,

      doctorRole: it.doctorRole,
    };
  });
}

function augmentItemsWithAdmissionRoom(
  bill: Bill,
  state: AppState,
  items: NormalizedItem[],
  admission?: ReturnType<typeof resolveClaimAdmission>,
): NormalizedItem[] {
  if (!admission) return items;
  if (items.some((item) => item.category === "Room" && item.amount > 0)) return items;
  if (!admission.roomTypeId && !admission.roomWard && !(admission.roomStays?.length ?? 0)) {
    return items;
  }

  const dischargeDate =
    admission.dischargeDate || bill.dischargeDate || bill.date || admission.admissionDate;
  const roomAdmission =
    admission.dischargeDate != null ? admission : { ...admission, dischargeDate };

  const roomLines = computeRoomBoardCharges(state, roomAdmission);
  if (roomLines.length === 0) return items;

  return [
    ...items,
    ...roomLines.map((line) => ({
      description: line.description,
      category: "Room" as BillChargeCategory,
      qty: line.qty && line.qty > 0 ? line.qty : 1,
      unitPrice:
        line.unitPrice != null && line.unitPrice > 0
          ? line.unitPrice
          : (line.amount || 0) / (line.qty && line.qty > 0 ? line.qty : 1),
      amount: line.amount,
      priceItemId: line.priceItemId,
    })),
  ];
}

function resolvePhysicianAccreditation(state: AppState, physicianName: string): string {
  const normalized = physicianName.trim().toLowerCase();
  if (!normalized) return "";
  const doctor = (state.users ?? []).find(
    (user) => user.role === "Doctor" && user.fullName.trim().toLowerCase() === normalized,
  );
  return doctor?.philhealthAccreditation?.trim() ?? "";
}

function isOrFee(item: NormalizedItem, state: AppState): boolean {
  if (/operating\s*room|\bor\s*fee\b/i.test(item.description)) return true;

  if (item.priceItemId) {
    const price = state.prices.find((p) => p.id === item.priceItemId);

    if (price?.code === "MISC-OR" || /operating room/i.test(price.description)) return true;
  }

  return false;
}

function isMiscCharge(item: NormalizedItem, state: AppState): boolean {
  if (item.priceItemId) {
    const price = state.prices.find((p) => p.id === item.priceItemId);

    if (price?.category === "Miscellaneous" && !isOrFee(item, state)) return true;
  }

  return (
    item.category === "Other" &&
    !isOrFee(item, state) &&
    (/miscellaneous|delivery\s*room|misc-/i.test(item.description) ||
      /\bfee\b/i.test(item.description))
  );
}

function hciBucketFor(item: NormalizedItem, state: AppState): HciBucket {
  if (item.category === "PF") return "other";

  if (isOrFee(item, state)) return "or";

  if (isMiscCharge(item, state)) return "misc";

  switch (item.category) {
    case "Room":
      return "room";

    case "Medicine":
      return "medicine";

    case "Lab":
      return "lab";

    case "Radiology":
      return "radiology";

    case "Supplies":
      return "supplies";

    case "Other":
      return "other";

    default:
      return "other";
  }
}

function sumBucket(items: NormalizedItem[], bucket: HciBucket, state: AppState): number {
  return items

    .filter((i) => i.category !== "PF" && hciBucketFor(i, state) === bucket)

    .reduce((s, i) => s + i.amount, 0);
}

function roomDetail(items: NormalizedItem[]): string | undefined {
  const rooms = items.filter((i) => i.category === "Room");
  if (rooms.length === 0) return undefined;

  return (
    rooms
      .map((room) => {
        const roomFormat = room.description.match(
          /ROOM\s*-\s*.+\((\d+)\s*day\/s\)\s*\(([\d,]+(?:\.\d+)?)\)/i,
        );
        if (roomFormat) {
          return `${roomFormat[1]}.00 Day(s) @ ${roomFormat[2].replace(/,/g, "")}`;
        }

        const daysMatch = room.description.match(/(\d+)\s*day/i);
        const rateMatch =
          room.description.match(/@\s*₱?([\d,]+(?:\.\d+)?)/i) ??
          room.description.match(/\(([\d,]+(?:\.\d+)?)\)\s*$/);

        if (daysMatch && rateMatch) {
          return `${daysMatch[1]}.00 Day(s) @ ${rateMatch[1].replace(/,/g, "")}`;
        }

        if (room.qty > 0 && room.unitPrice > 0) {
          return `${room.qty.toFixed(2)} Day(s) @ ${room.unitPrice.toFixed(2)}`;
        }

        return "";
      })
      .filter(Boolean)
      .join(" + ") || undefined
  );
}

function resolveItemUnit(state: AppState, item: NormalizedItem): string {
  if (item.medicineId) {
    const med = state.medicines.find((m) => m.id === item.medicineId);
    if (med?.unit) return med.unit;
  }
  if (item.category === "Room") return "day(s)";
  if (item.category === "Lab" || item.category === "Radiology") return "test";
  return "pc/s";
}

function getAgeParts(birthDate?: string): { years: string; months: string; days: string } {
  if (!birthDate) return { years: "", months: "", days: "" };
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return { years: "", months: "", days: "" };
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return {
    years: years >= 0 ? String(years) : "",
    months: years >= 0 ? String(months) : "",
    days: years >= 0 ? String(days) : "",
  };
}

function cityFromAddress(address?: string): string {
  if (!address) return "";
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || parts[0] || "";
}

function amountRow(
  label: string,

  actual: number,

  extras?: Partial<SoaAmountRow>,
): SoaAmountRow {
  return {
    label,

    detail: extras?.detail,

    actual,

    vatExempt: extras?.vatExempt ?? 0,

    discountScPwd: extras?.discountScPwd ?? 0,

    discountAgency: extras?.discountAgency ?? 0,

    phicFirst: extras?.phicFirst ?? 0,

    phicSecond: extras?.phicSecond ?? 0,

    outOfPocket: extras?.outOfPocket ?? actual,

    highlight: extras?.highlight,
  };
}

export function buildHospitalSoaModel(input: {
  bill: Bill;

  patient?: Patient;

  hospital: SoaHospital;

  state: AppState;

  billingOfficerName?: string;

  printOptions?: SOAPrintOptions;

  caseRateDescription?: string;

  caseRate?: CaseRate | null;
}): HospitalSoaModel {
  const { bill, patient, hospital, state } = input;

  const admission = resolveClaimAdmission(
    state,
    { patientId: bill.patientId, admissionDate: bill.date },
    bill,
  );

  const items = augmentItemsWithAdmissionRoom(bill, state, normalizeItems(bill, state), admission);

  const subtotal = items.reduce((s, i) => s + i.amount, 0);

  const phic = bill.philhealthDeduction || 0;

  const paid = bill.amountPaid || 0;

  const mandatoryDiscount =
    bill.mandatoryDiscountAmount && bill.mandatoryDiscountAmount > 0
      ? bill.mandatoryDiscountAmount
      : bill.mandatoryDiscountType === "senior" ||
          bill.mandatoryDiscountType === "pwd" ||
          bill.mandatoryDiscountType === "pregnant"
        ? Math.round(subtotal * 0.2 * 100) / 100
        : 0;

  const balance = Math.max(0, subtotal - mandatoryDiscount - phic - paid);

  const age = getAgeYears(patient?.birthDate);
  const ageParts = getAgeParts(patient?.birthDate);

  // "Room and Board" must always be the first Particulars entry in the itemized
  // details table — sort Room charges to the front, keep everything else in entry order.
  const itemizedLines: SoaItemizedLine[] = [...items]
    .sort((a, b) => (a.category === "Room" ? 0 : 1) - (b.category === "Room" ? 0 : 1))
    .map((item) => ({
      serviceDate:
        bill.items.find((bi) => bi.description === item.description)?.effectiveDate ?? bill.date,
      itemName: item.description,
      unit: resolveItemUnit(state, item),
      price: item.unitPrice,
      quantity: item.qty,
      amount: item.amount,
    }));

  const roomAmount = sumBucket(items, "room", state);

  const medicineAmount = sumBucket(items, "medicine", state);

  const labAmount = sumBucket(items, "lab", state);

  const radiologyAmount = sumBucket(items, "radiology", state);

  const orAmount = sumBucket(items, "or", state);

  const suppliesAmount = sumBucket(items, "supplies", state);

  const miscAmount = sumBucket(items, "misc", state);

  const otherAmount = sumBucket(items, "other", state);

  const hciRowsBase: SoaAmountRow[] = [
    amountRow("Room and Board", roomAmount, { detail: roomDetail(items) }),

    amountRow("Pharmacy", medicineAmount),

    amountRow("Supplies", suppliesAmount),

    amountRow("Laboratory", labAmount),

    amountRow("Radiology", radiologyAmount),

    amountRow("Operating Room fee", orAmount, { highlight: true }),

    amountRow("Miscellaneous", miscAmount),

    amountRow("Others", otherAmount, { detail: otherAmount > 0 ? undefined : "pls. specify" }),
  ];

  const pfItems = items.filter((i) => i.category === "PF");

  const pfGrouped = new Map<string, { name: string; role?: string; amount: number }>();

  for (const item of pfItems) {
    const name = item.description.trim() || "Professional Fee";
    const role = item.doctorRole || "";
    const key = `${name}|${role}`;

    const existing = pfGrouped.get(key);
    if (existing) {
      existing.amount += item.amount;
    } else {
      pfGrouped.set(key, { name, role: role || undefined, amount: item.amount });
    }
  }

  const pfRowsBase = [...pfGrouped.values()].map((entry) => {
    const rowLabel = entry.role ? `${entry.name} — ${entry.role}` : entry.name;
    return amountRow(rowLabel, entry.amount);
  });
  if (pfRowsBase.length === 0 && input.caseRate) {
    const fallbackPf =
      input.caseRate.professionalFeeAmount && input.caseRate.professionalFeeAmount > 0
        ? input.caseRate.professionalFeeAmount
        : input.caseRate.amount > 0
          ? Math.round(
              input.caseRate.amount * ((input.caseRate.professionalFeePct ?? 30) / 100) * 100,
            ) / 100
          : 0;
    if (fallbackPf > 0) {
      const physicianName =
        admission?.attendingDoctor?.trim() || `Professional Fee — ${input.caseRate.code}`;
      pfRowsBase.push(amountRow(physicianName, fallbackPf));
    }
  }

  const allocation = allocatePhilhealthToSoaRows({
    hciRows: hciRowsBase,

    professionalFeeRows: pfRowsBase,

    totalPhic: phic,

    caseRate: input.caseRate,
  });

  const hciRows = allocation.hciRows;

  const hciActualTotal = hciRows.reduce((s, r) => s + r.actual, 0);

  const hciSubtotal = amountRow("Subtotal (HCI fees)", hciActualTotal, {
    phicFirst: allocation.hciBenefit,

    outOfPocket: Math.max(0, hciActualTotal - allocation.hciBenefit),
  });

  const professionalFees = allocation.pfRows
    .filter((row) => row.actual > 0)
    .map((row) => {
      const nameParts = row.label.split(" — ");
      const docName = nameParts[0] || row.label;
      return {
        name: row.label,
        accreditation: resolvePhysicianAccreditation(state, docName),
        row,
      };
    });

  const pfActualTotal = allocation.pfRows.reduce((s, r) => s + r.actual, 0);

  const pfSubtotal = amountRow("Subtotal (Professional fee/s)", pfActualTotal, {
    phicFirst: allocation.pfBenefit,

    outOfPocket: Math.max(0, pfActualTotal - allocation.pfBenefit),
  });

  const refYear = bill.date.slice(0, 4);

  const refSeq = (bill.id ? bill.id.replace(/\D/g, "").slice(-6) : "000000").padStart(6, "0");

  const diagnosisParts: string[] = [];
  if (admission?.notes?.trim()) diagnosisParts.push(admission.notes.trim());
  if (bill.notes?.trim()) diagnosisParts.push(bill.notes.trim());
  if (input.caseRate?.description?.trim()) {
    const withCode = `${input.caseRate.code} - ${input.caseRate.description.trim()}`;
    diagnosisParts.push(withCode);
  } else if (input.caseRateDescription?.trim()) {
    diagnosisParts.push(
      bill.caseRateCode
        ? `${bill.caseRateCode} - ${input.caseRateDescription.trim()}`
        : input.caseRateDescription.trim(),
    );
  } else if (bill.caseRateCode) {
    diagnosisParts.push(bill.caseRateCode);
  }
  const diagnosisText = [...new Set(diagnosisParts)].join("; ");

  const caseRateLabel =
    bill.caseRateCode && bill.caseRateCode !== "none"
      ? `${bill.caseRateCode}${input.caseRate?.description ? ` — ${input.caseRate.description}` : ""}`
      : "";

  return {
    hospitalName: (hospital.name || "HOSPITAL").toUpperCase(),

    hospitalAddress: hospital.address || "",

    hospitalPhone: hospital.phone || "",

    soaReference: `${refYear}-${refSeq}`,

    patientName: getFullName(patient).toUpperCase() || "—",

    age: age == null ? "" : String(age),

    address: formatAddress(patient?.address) || "",

    admitDateTime: formatDateTime12(admission?.admissionDate ?? bill.date),

    dischargeDateTime: admission?.dischargeDate
      ? formatDateTime12(admission.dischargeDate)
      : bill.dischargeDate
        ? formatDateTime12(bill.dischargeDate)
        : "",

    admittingDiagnosis: diagnosisText,

    firstCaseRate: caseRateLabel,

    secondCaseRate: "",

    finalDiagnoses: diagnosisText
      ? diagnosisText
          .split(/[,;]/)
          .map((d) => d.trim())
          .filter(Boolean)
      : [],

    surgicalProcedures: input.caseRate?.category === "Surgical" ? input.caseRate.description : "",

    hciRows,

    hciSubtotal,

    professionalFees,

    pfSubtotal,

    total: amountRow("TOTAL", subtotal, {
      discountScPwd: mandatoryDiscount,

      phicFirst: allocation.totalBenefit,

      outOfPocket: balance,
    }),

    discountChecks: {
      pcsO: false,

      dswd: false,

      doh: false,

      hmo: false,

      others: false,
    },

    preparedBy: input.billingOfficerName || "",

    isTentative: input.printOptions?.status === "Tentative",

    phicCoverage:
      phic > 0 || input.caseRate
        ? {
            caseRateCode: bill.caseRateCode || input.caseRate?.code || "",
            caseRateAmount: input.caseRate?.amount ?? phic,
            hciBenefit: allocation.hciBenefit,
            pfBenefit: allocation.pfBenefit,
            totalBenefit: allocation.totalBenefit,
            totalActual: subtotal,
            patientExcess: Math.max(0, subtotal - mandatoryDiscount - allocation.totalBenefit),
            amountPaid: paid,
            balanceDue: balance,
          }
        : null,

    itemizedLines,

    ageYears: ageParts.years,
    ageMonths: ageParts.months,
    ageDays: ageParts.days,

    attendingPhysician: admission?.attendingDoctor?.trim() ?? "",
    wardRoom: admission?.roomWard?.trim() ?? "",
    accountNumber: bill.id || `${refYear}-${refSeq}`,
    phicMembership:
      patient?.philhealth?.memberNumber?.trim() || patient?.philhealth?.memberType?.trim() || "",
    patientType: bill.patientType || "",
    hospitalCity: cityFromAddress(hospital.address),
    printedAt: formatPrintedAt(),
    secondCaseDescription: "",
  };
}

export function formatSoaMoney(n: number): string {
  return money2(n);
}
