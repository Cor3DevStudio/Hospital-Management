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

  const hciBenefit = totalPhic > 0 ? Math.min(totalPhic, hciActual, hciCap) : 0;
  const pfBenefit =
    totalPhic > 0 ? Math.min(totalPhic - hciBenefit, pfActual, pfCap) : 0;

  const allocatedHci = distributeProportional(hciRows, hciBenefit);
  const allocatedPf = distributeProportional(professionalFeeRows, pfBenefit);

  return {
    hciBenefit,
    pfBenefit,
    hciRows: allocatedHci,
    pfRows: allocatedPf,
    totalBenefit: hciBenefit + pfBenefit,
  };
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
