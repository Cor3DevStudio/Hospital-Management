import type { CaseRate } from "@/lib/store";
import type { SoaAmountRow } from "@/components/billing/buildHospitalSoaModel";

export type PhilhealthAllocation = {
  hciBenefit: number;
  pfBenefit: number;
  hciRows: SoaAmountRow[];
  pfRows: SoaAmountRow[];
  totalBenefit: number;
};

function distributeProportional(rows: SoaAmountRow[], benefit: number): SoaAmountRow[] {
  if (benefit <= 0) {
    return rows.map((row) => ({ ...row, phicFirst: 0, outOfPocket: row.actual }));
  }

  const eligible = rows.filter((r) => r.actual > 0);
  const totalActual = eligible.reduce((s, r) => s + r.actual, 0);
  if (totalActual <= 0) {
    return rows.map((row) => ({ ...row, phicFirst: 0, outOfPocket: row.actual }));
  }

  let assigned = 0;
  let eligibleIndex = 0;
  return rows.map((row) => {
    if (row.actual <= 0) {
      return { ...row, phicFirst: 0, outOfPocket: row.actual };
    }
    eligibleIndex++;
    const isLast = eligibleIndex === eligible.length;
    const share = isLast
      ? Math.min(row.actual, Math.max(0, benefit - assigned))
      : Math.min(row.actual, Math.round(((benefit * row.actual) / totalActual) * 100) / 100);
    assigned += share;
    return {
      ...row,
      phicFirst: share,
      outOfPocket: Math.max(0, row.actual - share),
    };
  });
}

/** Allocate PhilHealth case-rate benefit across HCI and professional-fee rows. */
export function allocatePhilhealthToSoaRows(input: {
  hciRows: SoaAmountRow[];
  professionalFeeRows: SoaAmountRow[];
  totalPhic: number;
  caseRate?: CaseRate | null;
}): PhilhealthAllocation {
  const { hciRows, professionalFeeRows, totalPhic, caseRate } = input;
  const hciActual = hciRows.reduce((s, r) => s + r.actual, 0);
  const pfActual = professionalFeeRows.reduce((s, r) => s + r.actual, 0);

  const hciCap =
    caseRate?.healthFacilityFee != null && caseRate.healthFacilityFee > 0
      ? caseRate.healthFacilityFee
      : caseRate?.amount
        ? Math.round(caseRate.amount * ((caseRate.hospitalSharePct ?? 70) / 100) * 100) / 100
        : totalPhic * 0.7;

  const pfCap =
    caseRate?.professionalFeeAmount != null && caseRate.professionalFeeAmount > 0
      ? caseRate.professionalFeeAmount
      : caseRate?.amount
        ? Math.round(caseRate.amount * ((caseRate.professionalFeePct ?? 30) / 100) * 100) / 100
        : totalPhic * 0.3;

  const hciBenefit = totalPhic > 0 ? Math.min(hciCap, hciActual, totalPhic) : 0;
  const pfBenefit =
    totalPhic > 0 ? Math.min(pfCap, pfActual, Math.max(0, totalPhic - hciBenefit)) : 0;

  const allocatedHci = allocateHciPhilhealthRows(hciRows, hciBenefit);
  const allocatedPf = allocatePfPhilhealthRows(professionalFeeRows, pfBenefit);

  return {
    hciBenefit,
    pfBenefit,
    hciRows: allocatedHci,
    pfRows: allocatedPf,
    totalBenefit: hciBenefit + pfBenefit,
  };
}

/**
 * HCI PhilHealth: room-and-board may show partial coverage on its line;
 * all other HCI lines show actual charges only — HF benefit and excess appear on the subtotal.
 */
function allocateHciPhilhealthRows(hciRows: SoaAmountRow[], hciBenefit: number): SoaAmountRow[] {
  const roomIndex = hciRows.findIndex((r) => /room/i.test(r.label));
  const roomPhic =
    roomIndex >= 0 && hciBenefit > 0 ? Math.min(hciRows[roomIndex].actual, hciBenefit) : 0;

  return hciRows.map((row, index) => {
    if (row.actual <= 0) {
      return { ...row, phicFirst: 0, outOfPocket: 0 };
    }
    if (index === roomIndex && roomPhic > 0) {
      return { ...row, phicFirst: roomPhic, outOfPocket: 0 };
    }
    return { ...row, phicFirst: 0, outOfPocket: 0 };
  });
}

/** Professional-fee PhilHealth: apply PF case-rate benefit (fully when charges ≤ cap). */
function allocatePfPhilhealthRows(pfRows: SoaAmountRow[], pfBenefit: number): SoaAmountRow[] {
  if (pfBenefit <= 0) {
    return pfRows.map((row) => ({ ...row, phicFirst: 0, outOfPocket: 0 }));
  }
  const pfActual = pfRows.reduce((s, r) => s + r.actual, 0);
  if (pfActual <= 0) {
    return pfRows.map((row) => ({ ...row, phicFirst: 0, outOfPocket: 0 }));
  }
  if (pfRows.length === 1) {
    const row = pfRows[0];
    const phic = Math.min(row.actual, pfBenefit);
    return [{ ...row, phicFirst: phic, outOfPocket: 0 }];
  }
  return distributeProportional(pfRows, Math.min(pfBenefit, pfActual)).map((row) => ({
    ...row,
    outOfPocket: 0,
  }));
}

export function sumSoaRows(rows: SoaAmountRow[], label: string): SoaAmountRow {
  return {
    label,
    actual: rows.reduce((s, r) => s + r.actual, 0),
    vatExempt: 0,
    discountScPwd: 0,
    discountAgency: 0,
    phicFirst: rows.reduce((s, r) => s + r.phicFirst, 0),
    phicSecond: 0,
    outOfPocket: rows.reduce((s, r) => s + r.outOfPocket, 0),
  };
}
